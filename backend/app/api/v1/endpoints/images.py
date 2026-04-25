from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import hashlib
import traceback
import sys
from typing import Optional

from app.db.session import get_db
from app.models.image import Image
from app.models.case import Case
from app.schemas.image import ImageUploadResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction, ImageFormat, CaseStatus, UrgencyLevel
from app.core.audit import log_action
from app.services.storage import upload_file, get_presigned_url, get_file_data
from app.config import settings

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/png": ImageFormat.PNG,
    "image/jpeg": ImageFormat.JPEG,
    "application/dicom": ImageFormat.DICOM,
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    case_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    allow_duplicate: bool = Form(False),  # FR-07: override confirmation
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Doctor, Role.Radiologist)),
):
    try:
        print(f"[UPLOAD] Starting upload for case_id={case_id}, file={file.filename}", flush=True)

        # Verify case exists
        stmt = select(Case).where(Case.case_id == case_id)
        result = await db.execute(stmt)
        case = result.scalar_one_or_none()

        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        # Validate MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPEG, and DICOM allowed.")

        format_enum = ALLOWED_MIME_TYPES[file.content_type]
        file_bytes = await file.read()

        # Validate Size
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")

        # FR-07: SHA-256 duplicate detection
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        stmt_dup = select(Image).where(Image.file_hash == file_hash)
        result_dup = await db.execute(stmt_dup)
        existing = result_dup.scalar_one_or_none()

        if existing and not allow_duplicate:
            await log_action(
                db, AuditAction.IMAGE_DUPLICATE_DETECTED,
                user_id=current_user.user_id,
                case_id=case_id,
            )
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Duplicate image detected. Set allow_duplicate=true to override.",
                    "existing_image_id": str(existing.image_id),
                    "existing_case_id": str(existing.case_id),
                },
            )

        # If duplicate override, generate unique hash to allow storage
        if existing and allow_duplicate:
            file_hash = hashlib.sha256(file_bytes + str(uuid.uuid4()).encode()).hexdigest()

        # MinIO Upload
        extension = "dcm" if format_enum == ImageFormat.DICOM else format_enum.value.lower()
        object_name = f"{case_id}/{uuid.uuid4()}.{extension}"

        try:
            upload_file(settings.MINIO_BUCKET_IMAGES, object_name, file_bytes, file.content_type)
        except Exception as e:
            traceback.print_exc()
            sys.stdout.flush()
            raise HTTPException(status_code=500, detail=f"Storage service error: {str(e)}")

        # Save Image Record
        db_img = Image(
            case_id=case_id,
            file_url=object_name,
            file_hash=file_hash,
            file_format=format_enum,
            file_size_bytes=len(file_bytes),
        )
        db.add(db_img)

        # Bump case status if pending
        if case.status == CaseStatus.Pending_Review:
            case.status = CaseStatus.In_Review

        await db.commit()
        await db.refresh(db_img)

        # Capture values BEFORE any further commits can expire the session
        saved_image_id = db_img.image_id

        await log_action(
            db, AuditAction.IMAGE_UPLOADED,
            user_id=current_user.user_id,
            case_id=case_id,
            details={"image_id": str(saved_image_id), "format": format_enum.value, "size_bytes": len(file_bytes)},
        )

        # Trigger AI inference (non-blocking)
        inference_id = uuid.uuid4()
        try:
            import httpx

            host = settings.MINIO_EXTERNAL_HOST.replace("http://", "").replace("https://", "")
            protocol = "https" if "ngrok" in host or "cloudflare" in host else "http"
            image_public_url = f"{protocol}://{host}/{settings.MINIO_BUCKET_IMAGES}/{db_img.file_url}"

            ai_url = f"{settings.AI_SERVICE_URL}/predict"
            print(f"[UPLOAD] Calling AI at: {ai_url}", flush=True)
            print(f"[UPLOAD] Image URL sent to AI: {image_public_url}", flush=True)

            async with httpx.AsyncClient(timeout=settings.AI_INFERENCE_TIMEOUT_SECONDS) as client:
                ai_response = await client.post(
                    ai_url,
                    json={
                        "inference_id": str(inference_id),
                        "image_url": image_public_url,
                        "image_format": format_enum.value,
                    },
                    headers={"X-Internal-API-Key": settings.AI_INTERNAL_API_KEY},
                )

            print(f"[UPLOAD] AI response status: {ai_response.status_code}", flush=True)
            ai_data = ai_response.json()
            print(f"[UPLOAD] AI response data: {ai_data}", flush=True)

            if ai_response.status_code == 200 and not ai_data.get("error"):
                from app.models.inference_result import InferenceResult

                inference_record = InferenceResult(
                    inference_id=inference_id,
                    image_id=saved_image_id,
                    model_version=ai_data.get("model_version", "unknown"),
                    processing_time_sec=ai_data.get("processing_time_sec"),
                    predictions=ai_data.get("predictions", []),
                )
                db.add(inference_record)

                # Auto-assign case priority based on findings
                predictions = ai_data.get("predictions", [])
                is_critical = any(
                    p.get("disease_class") in ("Lung Tumor", "Tuberculosis")
                    and float(p.get("confidence_score", 0)) > 0.5
                    for p in predictions
                )
                if is_critical:
                    case.priority = UrgencyLevel.Critical

                await db.commit()

        except Exception as e:
            print(f"[UPLOAD] AI inference failed (non-critical): {type(e).__name__}: {e}", flush=True)

        return ImageUploadResponse(image_id=saved_image_id, case_id=case_id)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPLOAD] UNEXPECTED ERROR: {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        raise


@router.get("/{image_id}/url")
async def get_image_presigned_url(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Doctor, Role.Radiologist, Role.Admin)),
):
    """Return a URL for viewing the image."""
    stmt = select(Image).where(Image.image_id == image_id)
    result = await db.execute(stmt)
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        url = get_presigned_url(settings.MINIO_BUCKET_IMAGES, image.file_url)
    except Exception:
        # Fallback to direct URL if presigned generation fails (e.g. dev environment)
        url = f"http://localhost:9000/{settings.MINIO_BUCKET_IMAGES}/{image.file_url}"

    return {"url": url}


@router.get("/{image_id}/proxy")
async def proxy_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Doctor, Role.Radiologist, Role.Admin)),
):
    """Stream image bytes directly from MinIO through the API (bypasses CORS)."""
    stmt = select(Image).where(Image.image_id == image_id)
    result = await db.execute(stmt)
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        data, content_type = get_file_data(settings.MINIO_BUCKET_IMAGES, image.file_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not retrieve image: {str(e)}")

    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Cache-Control": "private, max-age=900",
            "Access-Control-Allow-Origin": "*",
        },
    )
