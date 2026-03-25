import uuid
import asyncio
from celery import shared_task
from app.workers.celery_app import celery_app
from app.services.report_pdf import generate_pdf_report
from app.services.report_images import render_annotated_image
from app.services.storage import upload_file, get_presigned_url
from app.config import settings


async def _fetch_case_data(case_id: str):
    """Fetch all data needed for report generation using the async session."""
    from app.db.session import async_session_maker
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.case import Case
    from app.models.image import Image

    async with async_session_maker() as session:
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
        result = await session.execute(stmt)
        case = result.scalar_one_or_none()
        if not case:
            return None

        # Extract doctor info separately if needed
        doctor = None
        if case.diagnosis:
            from app.models.user import User
            doc_stmt = select(User).where(User.user_id == case.diagnosis.doctor_id)
            doc_result = await session.execute(doc_stmt)
            doctor = doc_result.scalar_one_or_none()

        # Extract radiologist info
        radiologist = None
        if case.radiologist_review:
            from app.models.user import User
            rad_stmt = select(User).where(User.user_id == case.radiologist_review.radiologist_id)
            rad_result = await session.execute(rad_stmt)
            radiologist = rad_result.scalar_one_or_none()

        return case, doctor, radiologist


async def _save_report_db(case_id: str, doctor_id: str, object_name: str, file_size: int):
    from app.db.session import async_session_maker
    from sqlalchemy import select
    from app.models.report import Report

    async with async_session_maker() as session:
        stmt = select(Report).where(Report.case_id == uuid.UUID(case_id))
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.pdf_url = object_name
            existing.file_size_bytes = file_size
            existing.cached = True
        else:
            report = Report(
                case_id=uuid.UUID(case_id),
                generated_by=uuid.UUID(doctor_id),
                pdf_url=object_name,
                file_size_bytes=file_size,
                cached=True,
            )
            session.add(report)
        await session.commit()


@shared_task(name="app.workers.report_tasks.generate_report_task")
def generate_report_task(case_id: str, doctor_id: str):
    """
    Fetches real case data, generates a PDF report, uploads to MinIO,
    and records the Report in the database.
    """
    try:
        print(f"Starting PDF generation for case {case_id}", flush=True)

        # Fetch all real data
        fetch_result = asyncio.run(_fetch_case_data(case_id))
        if fetch_result is None:
            print(f"Case {case_id} not found — aborting report generation", flush=True)
            return {"status": "failed", "error": "Case not found"}

        case, doctor, radiologist = fetch_result

        # Build data dicts for the PDF template
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

        # Get AI predictions from the first image's inference results
        first_image = case.images[0] if case.images else None
        inference_result = None
        if first_image and first_image.inference_results:
            inference_result = first_image.inference_results[0]

        ai_results = {
            "model_version": inference_result.model_version if inference_result else "N/A",
            "predictions": inference_result.predictions if inference_result else [],
        }

        review_data = {
            "radiologist_name": radiologist.name if radiologist else "Radiology Department",
            "notes": case.radiologist_review.notes if case.radiologist_review else "",
        }

        diagnosis = case.diagnosis
        diagnosis_data = {
            "doctor_name": doctor.name if doctor else "Attending Physician",
            "primary": diagnosis.primary_diagnosis.value if diagnosis else "Pending",
            "notes": diagnosis.diagnosis_notes if diagnosis else "",
            "urgency": diagnosis.urgency_level.value if diagnosis else "Non_Critical",
            "treatment": diagnosis.treatment_recommendations if diagnosis else "",
        }

        hospital_data = {"name": "Clinical Decision Support System"}

        # Fetch original image bytes from MinIO
        original_img_bytes = b""
        annotated_img_bytes = b""
        if first_image:
            try:
                from app.services.storage import minio_client
                response = minio_client.get_object(settings.MINIO_BUCKET_IMAGES, first_image.file_url)
                original_img_bytes = response.read()
                response.close()
                response.release_conn()
            except Exception as e:
                print(f"Could not fetch image bytes: {e}", flush=True)
                # Use a minimal placeholder PNG if image fetch fails
                original_img_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'

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

        # Upload PDF to MinIO
        object_name = f"reports/{case_id}/{uuid.uuid4()}.pdf"
        upload_file(
            bucket_name=settings.MINIO_BUCKET_REPORTS,
            object_name=object_name,
            data=pdf_bytes,
            content_type="application/pdf",
        )

        # Save Report record to DB
        asyncio.run(_save_report_db(case_id, doctor_id, object_name, len(pdf_bytes)))

        print(f"Successfully generated and uploaded PDF for {case_id}", flush=True)
        return {"status": "success", "report_url": object_name}

    except Exception as exc:
        print(f"Report generation failed: {exc}", flush=True)
        return {"status": "failed", "error": str(exc)}
