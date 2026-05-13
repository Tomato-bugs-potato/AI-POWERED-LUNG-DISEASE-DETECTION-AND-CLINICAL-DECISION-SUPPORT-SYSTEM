from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
import csv
import io
import sqlalchemy
from datetime import datetime

from app.db.session import get_db
from app.models.patient import Patient
from app.models.case import Case
from app.models.image import Image
from app.models.report import Report
from app.schemas.patient import PatientResponse, PatientCreate
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction
from app.core.audit import log_action

router = APIRouter()

# Allow Tech, Radiologist, and Doctor
require_clinical_staff = require_roles(Role.Lab_Technician, Role.Radiologist, Role.Doctor)


@router.post("/", response_model=PatientResponse, dependencies=[Depends(require_clinical_staff)])
async def register_patient(
    patient_in: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not patient_in.consent_recorded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register patient without explicit consent recorded",
        )

    db_patient = Patient(
        age=patient_in.age,
        sex=patient_in.sex,
        consent_recorded=patient_in.consent_recorded,
        consent_date=datetime.utcnow(),
        symptoms=patient_in.symptoms,
    )

    if hasattr(patient_in, "patient_id") and patient_in.patient_id:
        db_patient.patient_id = patient_in.patient_id

    db.add(db_patient)
    await db.commit()

    await log_action(
        db, AuditAction.PATIENT_REGISTERED,
        user_id=current_user.user_id,
        details={"patient_id": str(db_patient.patient_id), "consent_recorded": True},
    )

    # Use select with selectinload instead of db.refresh to ensure 'cases' is loaded for Pydantic serialization
    await db.flush() # Ensure ID is generated if not provided
    stmt = select(Patient).options(selectinload(Patient.cases)).where(Patient.patient_id == db_patient.patient_id)
    res = await db.execute(stmt)
    return res.scalar_one()


@router.get("/search", response_model=List[PatientResponse], dependencies=[Depends(require_clinical_staff)])
async def search_patients(
    patient_id: Optional[str] = None,
    name: Optional[str] = None,  # For UI compatibility, matches against patient_id prefix
    sex: Optional[str] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
    symptoms: Optional[List[str]] = Query(None),  # FR-25: Multi-symptom search
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).options(selectinload(Patient.cases))
    
    if patient_id:
        stmt = stmt.where(Patient.patient_id.cast(sqlalchemy.String).ilike(f"%{patient_id}%"))
    if name:
        # Since we don't store names (NFR-25), we search by ID prefix as a fallback for 'name' search
        stmt = stmt.where(Patient.patient_id.cast(sqlalchemy.String).ilike(f"%{name}%"))
    if sex:
        stmt = stmt.where(Patient.sex == sex)
    if min_age is not None:
        stmt = stmt.where(Patient.age >= min_age)
    if max_age is not None:
        stmt = stmt.where(Patient.age <= max_age)
    if symptoms:
        for s in symptoms:
            stmt = stmt.where(Patient.symptoms.ilike(f"%{s}%"))
            
    stmt = stmt.offset(skip).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/search/export/csv", dependencies=[Depends(require_clinical_staff)])
async def export_patients_csv(
    patient_id: Optional[str] = None,
    sex: Optional[str] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
    symptoms: Optional[List[str]] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """FR-25: Export patient search results as CSV for external analysis."""
    stmt = select(Patient).options(selectinload(Patient.cases))
    if patient_id:
        stmt = stmt.where(Patient.patient_id.cast(sqlalchemy.String).ilike(f"%{patient_id}%"))
    if sex:
        stmt = stmt.where(Patient.sex == sex)
    if min_age is not None:
        stmt = stmt.where(Patient.age >= min_age)
    if max_age is not None:
        stmt = stmt.where(Patient.age <= max_age)
    if symptoms:
        for s in symptoms:
            stmt = stmt.where(Patient.symptoms.ilike(f"%{s}%"))

    res = await db.execute(stmt)
    patients = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Patient ID", "Age", "Sex", "Symptoms", "Consent Recorded", "Consent Date", "Registered At"])
    for p in patients:
        writer.writerow([
            str(p.patient_id),
            p.age,
            p.sex.value if p.sex else "",
            p.symptoms or "",
            p.consent_recorded,
            str(p.consent_date) if p.consent_date else "",
            str(p.registered_at) if p.registered_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=patients_export.csv"},
    )


@router.get("/", response_model=List[PatientResponse], dependencies=[Depends(require_clinical_staff)])
async def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).options(selectinload(Patient.cases)).offset(skip).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{patient_id}", response_model=PatientResponse, dependencies=[Depends(require_clinical_staff)])
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Patient).options(selectinload(Patient.cases)).where(Patient.patient_id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(Role.Admin))])
async def delete_patient_data(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """NFR-27: Right to Erasure. Delete patient data including files from MinIO."""
    stmt = select(Patient).where(Patient.patient_id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Collect MinIO file URLs before deleting DB records
    file_urls_to_delete = []

    # Get all cases for this patient
    cases_stmt = select(Case).where(Case.patient_id == patient_id)
    cases_result = await db.execute(cases_stmt)
    cases = cases_result.scalars().all()

    for case in cases:
        # Collect image file URLs
        images_stmt = select(Image).where(Image.case_id == case.case_id)
        images_result = await db.execute(images_stmt)
        for img in images_result.scalars().all():
            if img.file_url:
                file_urls_to_delete.append(("images", img.file_url))

        # Collect report file URLs
        reports_stmt = select(Report).where(Report.case_id == case.case_id)
        reports_result = await db.execute(reports_stmt)
        for rpt in reports_result.scalars().all():
            if rpt.pdf_url:
                file_urls_to_delete.append(("reports", rpt.pdf_url))

    # Delete from database (cascades to cases, images, etc.)
    await db.delete(patient)
    await db.commit()

    # Queue MinIO file cleanup via Celery
    if file_urls_to_delete:
        try:
            from app.workers.backup_tasks import delete_minio_files
            delete_minio_files.delay(file_urls_to_delete)
        except Exception:
            pass  # Non-blocking

    await log_action(
        db, AuditAction.DATA_DELETION_REQUESTED,
        user_id=current_user.user_id,
        details={"patient_id": str(patient_id), "files_queued": len(file_urls_to_delete)},
    )
    return None
