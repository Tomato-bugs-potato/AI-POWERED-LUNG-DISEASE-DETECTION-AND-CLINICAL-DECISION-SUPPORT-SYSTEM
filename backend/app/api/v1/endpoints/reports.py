from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
import csv
import io

from app.db.session import get_db
from app.models.report import Report
from app.models.case import Case
from app.models.diagnosis import Diagnosis
from app.models.user import User
from app.models.image import Image
from app.schemas.report import ReportResponse, ReportStatusResponse
from app.dependencies import get_current_user
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction
from app.core.audit import log_action
from app.services.storage import get_presigned_url
from app.config import settings


def _enrich_report(report: Report, doctor_user=None, radiologist_user=None) -> dict:
    """Convert a Report ORM object to an enriched dict with joined Case/Diagnosis fields."""
    d = {
        "report_id": report.report_id,
        "case_id": report.case_id,
        "pdf_url": report.pdf_url,
        "generated_at": report.generated_at,
        "generated_by": report.generated_by,
        "file_size_bytes": report.file_size_bytes,
        "cached": report.cached,
        "patient_id": None,
        "final_diagnosis": None,
        "status": "Final",
        "patient": None,
        "doctor": None,
        "radiologist": None,
        "ai_inference": None,
    }

    case = report.case
    if not case:
        return d

    d["patient_id"] = case.patient_id

    # Patient info
    if case.patient:
        d["patient"] = {
            "patient_id": str(case.patient.patient_id),
            "name": getattr(case.patient, 'name', None) or f"Patient {str(case.patient.patient_id)[:8]}",
            "age": getattr(case.patient, 'age', None) or 0,
            "sex": getattr(case.patient, 'sex', None),
        }
        if d["patient"]["sex"] and hasattr(d["patient"]["sex"], "value"):
            d["patient"]["sex"] = d["patient"]["sex"].value

    # Diagnosis + Doctor info
    if case.diagnosis:
        d["final_diagnosis"] = case.diagnosis.primary_diagnosis.value
        doctor_name = "Attending Physician"
        if doctor_user:
            doctor_name = doctor_user.name or doctor_name
        d["doctor"] = {
            "name": doctor_name,
            "final_diagnosis": case.diagnosis.primary_diagnosis.value,
            "recommendations": case.diagnosis.diagnosis_notes or case.diagnosis.treatment_recommendations or "",
        }

    # Radiologist info
    if case.radiologist_review:
        rad_name = "Radiologist"
        if radiologist_user:
            rad_name = radiologist_user.name or rad_name
        d["radiologist"] = {
            "name": rad_name,
            "findings": case.radiologist_review.notes or "No findings recorded.",
        }

    # AI inference info
    first_image = case.images[0] if case.images else None
    if first_image and first_image.inference_results:
        inf = first_image.inference_results[0]
        preds = inf.predictions or []
        primary = preds[0] if preds else None
        d["ai_inference"] = {
            "model_version": inf.model_version or "unknown",
            "primary_finding": primary.get("disease_class", "N/A") if primary else "N/A",
            "confidence": primary.get("confidence_score", 0) if primary else 0,
        }

    return d


router = APIRouter()

# Doctor only
require_doctor = require_roles(Role.Doctor)


@router.get("/export/csv", dependencies=[Depends(require_doctor)])
async def export_reports_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """FR-22: Export past reports as CSV for external records."""
    stmt = (
        select(Report)
        .options(selectinload(Report.case).selectinload(Case.diagnosis))
        .where(Report.generated_by == current_user.user_id)
        .order_by(Report.generated_at.desc())
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Report ID", "Case ID", "Patient ID", "Final Diagnosis", "Generated At", "File Size (bytes)", "Cached"])
    for r in reports:
        enriched = _enrich_report(r)
        writer.writerow([
            str(r.report_id),
            str(r.case_id),
            str(enriched["patient_id"]) if enriched["patient_id"] else "",
            enriched["final_diagnosis"] or "",
            str(r.generated_at) if r.generated_at else "",
            r.file_size_bytes or "",
            r.cached if r.cached is not None else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reports_export.csv"},
    )


@router.get("/{case_id}", response_model=ReportResponse, dependencies=[Depends(require_doctor)])
async def get_report(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Report)
        .options(
            selectinload(Report.case)
            .selectinload(Case.patient),
            selectinload(Report.case)
            .selectinload(Case.diagnosis),
            selectinload(Report.case)
            .selectinload(Case.radiologist_review),
            selectinload(Report.case)
            .selectinload(Case.images)
            .selectinload(Image.inference_results),
        )
        .where(Report.case_id == case_id)
    )
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()

    if not report:
        raise HTTPException(status_code=404, detail="Report not generated yet for this case.")

    # Fetch doctor and radiologist users for name resolution
    doctor_user = None
    radiologist_user = None
    if report.case and report.case.diagnosis:
        doc_stmt = select(User).where(User.user_id == report.case.diagnosis.doctor_id)
        doc_result = await db.execute(doc_stmt)
        doctor_user = doc_result.scalar_one_or_none()
    if report.case and report.case.radiologist_review:
        rad_stmt = select(User).where(User.user_id == report.case.radiologist_review.radiologist_id)
        rad_result = await db.execute(rad_stmt)
        radiologist_user = rad_result.scalar_one_or_none()

    enriched = _enrich_report(report, doctor_user=doctor_user, radiologist_user=radiologist_user)
    if report.pdf_url:
        try:
            enriched["pdf_url"] = get_presigned_url(settings.MINIO_BUCKET_REPORTS, report.pdf_url)
        except Exception:
            pass  # Keep original URL if presigning fails

    await log_action(db, AuditAction.REPORT_DOWNLOADED, user_id=current_user.user_id, case_id=case_id)

    return enriched


@router.get("/{case_id}/status", response_model=ReportStatusResponse, dependencies=[Depends(require_doctor)])
async def get_report_status(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Report).where(Report.case_id == case_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()

    if report:
        return {"status": "ready", "report_id": report.report_id}

    return {"status": "none", "report_id": None}


@router.get("/", response_model=List[ReportResponse], dependencies=[Depends(require_doctor)])
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),  # FR-22: default 25 per page
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Report)
        .options(selectinload(Report.case).selectinload(Case.diagnosis))
        .where(Report.generated_by == current_user.user_id)
        .order_by(Report.generated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [_enrich_report(r) for r in result.scalars().all()]


@router.post("/{case_id}/regenerate", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_doctor)])
async def regenerate_report(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Report).where(Report.case_id == case_id)
    result = await db.execute(stmt)
    report = result.scalar_one_or_none()

    if report:
        await db.delete(report)
        await db.commit()

    # Trigger Celery report generation
    try:
        from app.workers.report_tasks import generate_report_task
        print(f"Triggering report task for case {case_id}", flush=True)
        generate_report_task.delay(str(case_id), str(current_user.user_id))
    except Exception as e:
        import traceback
        import sys
        print(f"Error triggering celery report task: {e}", flush=True)
        traceback.print_exc(file=sys.stdout)

    return {"message": "Report generation enqueued."}
