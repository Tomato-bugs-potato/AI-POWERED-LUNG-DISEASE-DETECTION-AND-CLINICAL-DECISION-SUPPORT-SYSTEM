import uuid
import asyncio
from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import selectinload

from app.workers.celery_app import celery_app
from app.services.report_pdf import generate_pdf_report
from app.services.report_images import render_annotated_image
from app.services.storage import upload_file, minio_client
from app.config import settings


# Celery workers run sync tasks; each task spins up its own short-lived async
# engine so the asyncpg connection pool is bound to ONE event loop and torn
# down with it. Sharing the FastAPI app's engine (app.db.session.engine)
# caused "Future attached to a different loop" once the worker handled a
# second task — the pool kept Futures from the first task's loop.
async def _run_report(case_id: str, doctor_id: str) -> dict:
    from app.models.case import Case
    from app.models.image import Image
    from app.models.user import User
    from app.models.report import Report

    engine = create_async_engine(settings.DATABASE_URL, future=True)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with session_maker() as session:
            stmt = (
                select(Case)
                .options(
                    selectinload(Case.patient),
                    selectinload(Case.upload_tech),
                    selectinload(Case.images).selectinload(Image.inference_results),
                    selectinload(Case.radiologist_review),
                    selectinload(Case.diagnosis),
                )
                .where(Case.case_id == uuid.UUID(case_id))
            )
            case = (await session.execute(stmt)).scalar_one_or_none()
            if not case:
                return {"status": "failed", "error": "Case not found"}

            doctor = None
            if case.diagnosis:
                doctor = (
                    await session.execute(select(User).where(User.user_id == case.diagnosis.doctor_id))
                ).scalar_one_or_none()

            radiologist = None
            if case.radiologist_review:
                radiologist = (
                    await session.execute(
                        select(User).where(User.user_id == case.radiologist_review.radiologist_id)
                    )
                ).scalar_one_or_none()

            case_data = {
                "id": str(case.case_id),
                "visit_date": str(case.visit_date) if case.visit_date else "N/A",
            }
            patient_data = {
                "id": str(case.patient.patient_id),
                "age": case.patient.age,
                "sex": case.patient.sex.value if case.patient.sex else "Unknown",
                "consent": case.patient.consent_recorded,
            }

            first_image = case.images[0] if case.images else None
            inference_result = first_image.inference_results[0] if (first_image and first_image.inference_results) else None
            ai_results = {
                "model_version": inference_result.model_version if inference_result else "N/A",
                "predictions": inference_result.predictions if inference_result else [],
                "classification": getattr(inference_result, "classification", None) if inference_result else None,
            }
            review_data = {
                "radiologist_name": radiologist.name if radiologist else "Radiology Department",
                "notes": case.radiologist_review.notes if case.radiologist_review else "",
            }
            diagnosis = case.diagnosis
            diagnosis_data = {
                "doctor_name": doctor.name if doctor else "Attending Physician",
                "primary": diagnosis.primary_diagnosis.value if (diagnosis and diagnosis.primary_diagnosis) else "Pending",
                "notes": diagnosis.diagnosis_notes if diagnosis else "",
                "urgency": diagnosis.urgency_level.value if (diagnosis and diagnosis.urgency_level) else "Non_Critical",
                "treatment": diagnosis.treatment_recommendations if diagnosis else "",
            }
            hospital_data = {"name": "Clinical Diagnostic Report"}

            file_url_for_image = first_image.file_url if first_image else None

        # PDF rendering and MinIO upload are sync — do them OUTSIDE the session
        # so we don't hold a DB connection during the slow CPU/network work.
        original_img_bytes = b""
        annotated_img_bytes = b""
        if file_url_for_image:
            try:
                resp = minio_client.get_object(settings.MINIO_BUCKET_IMAGES, file_url_for_image)
                original_img_bytes = resp.read()
                resp.close()
                resp.release_conn()
            except Exception as e:
                print(f"Could not fetch image bytes: {e}", flush=True)
                original_img_bytes = (
                    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
                    b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00"
                    b"\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
                )
            annotated_img_bytes = render_annotated_image(original_img_bytes, ai_results.get("predictions", []))

        pdf_bytes = generate_pdf_report(
            case_data=case_data,
            patient_data=patient_data,
            original_img_bytes=original_img_bytes,
            annotated_img_bytes=annotated_img_bytes,
            ai_results=ai_results,
            review_data=review_data,
            diagnosis_data=diagnosis_data,
            hospital_data=hospital_data,
        )

        object_name = f"reports/{case_id}/{uuid.uuid4()}.pdf"
        upload_file(
            bucket_name=settings.MINIO_BUCKET_REPORTS,
            object_name=object_name,
            data=pdf_bytes,
            content_type="application/pdf",
        )

        # Reuse the same engine/loop to write the Report row.
        async with session_maker() as session:
            existing = (
                await session.execute(
                    select(Report).where(Report.case_id == uuid.UUID(case_id))
                )
            ).scalar_one_or_none()
            if existing:
                existing.pdf_url = object_name
                existing.file_size_bytes = len(pdf_bytes)
                existing.cached = True
            else:
                session.add(
                    Report(
                        case_id=uuid.UUID(case_id),
                        generated_by=uuid.UUID(doctor_id),
                        pdf_url=object_name,
                        file_size_bytes=len(pdf_bytes),
                        cached=True,
                    )
                )
            await session.commit()

        return {"status": "success", "report_url": object_name}

    finally:
        await engine.dispose()


@shared_task(name="app.workers.report_tasks.generate_report_task")
def generate_report_task(case_id: str, doctor_id: str):
    """Generate the case PDF report, upload it to MinIO, and record it in the DB."""
    try:
        print(f"Starting PDF generation for case {case_id}", flush=True)
        result = asyncio.run(_run_report(case_id, doctor_id))
        if result.get("status") == "success":
            print(f"Successfully generated and uploaded PDF for {case_id}", flush=True)
        return result
    except Exception as exc:
        print(f"Report generation failed: {exc}", flush=True)
        return {"status": "failed", "error": str(exc)}
