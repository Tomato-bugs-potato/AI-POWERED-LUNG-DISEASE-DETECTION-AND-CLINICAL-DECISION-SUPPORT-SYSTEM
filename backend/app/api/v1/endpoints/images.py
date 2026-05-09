from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import hashlib
import traceback
import sys
from typing import Optional

from app.db.session import get_db, async_session_maker
from app.models.image import Image
from app.models.case import Case
from app.schemas.image import ImageUploadResponse, ImageBase64Upload
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
    background_tasks: BackgroundTasks,
    case_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    allow_duplicate: bool = Form(False),  # FR-07: override confirmation
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Doctor, Role.Radiologist)),
):
    format_enum = ALLOWED_MIME_TYPES.get(file.content_type)
    if not format_enum:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPEG, and DICOM allowed.")

    file_bytes = await file.read()
    return await _process_image_upload(
        db=db,
        case_id=case_id,
        file_bytes=file_bytes,
        filename=file.filename,
        format_enum=format_enum,
        current_user=current_user,
        allow_duplicate=allow_duplicate,
        background_tasks=background_tasks,
    )

@router.post("/upload-base64", response_model=ImageUploadResponse)
async def upload_image_base64(
    upload: ImageBase64Upload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Doctor, Role.Radiologist)),
):
    import base64
    try:
        file_bytes = base64.b64decode(upload.image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    # Default to PNG for base64 uploads if not specified
    format_enum = ImageFormat.PNG

    return await _process_image_upload(
        db=db,
        case_id=upload.case_id,
        file_bytes=file_bytes,
        filename=upload.filename or "upload.png",
        format_enum=format_enum,
        current_user=current_user,
        allow_duplicate=upload.allow_duplicate,
        background_tasks=background_tasks,
    )

async def _process_image_upload(
    db: AsyncSession,
    case_id: uuid.UUID,
    file_bytes: bytes,
    filename: str,
    format_enum: ImageFormat,
    current_user: User,
    allow_duplicate: bool = False,
    background_tasks: Optional[BackgroundTasks] = None,
):
    try:
        print(f"[UPLOAD] Starting upload for case_id={case_id}, filename={filename}", flush=True)

        # Verify case exists
        stmt = select(Case).where(Case.case_id == case_id)
        result = await db.execute(stmt)
        case = result.scalar_one_or_none()

        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        # Validate Size (already read into bytes)
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
        
        # Map back to MIME type for storage
        content_type_map = {ImageFormat.PNG: "image/png", ImageFormat.JPEG: "image/jpeg", ImageFormat.DICOM: "application/dicom"}
        content_type = content_type_map.get(format_enum, "application/octet-stream")

        try:
            upload_file(settings.MINIO_BUCKET_IMAGES, object_name, file_bytes, content_type)
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

        # Schedule AI inference as a background task. The HF Space runs on CPU
        # and a single image can take 20-40 minutes, far longer than any HTTP
        # request should block on. The frontend polls /inference/{image_id}/status
        # to discover when results land.
        if background_tasks is not None:
            background_tasks.add_task(
                run_inference_in_background,
                image_id=saved_image_id,
                case_id=case_id,
                file_bytes=file_bytes,
                format_value=format_enum.value,
            )

        return ImageUploadResponse(image_id=saved_image_id, case_id=case_id)

    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPLOAD] UNEXPECTED ERROR: {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        raise


async def run_inference_in_background(
    image_id: uuid.UUID,
    case_id: uuid.UUID,
    file_bytes: bytes,
    format_value: str,
):
    """Call the HF Space AI service and persist the result.

    Runs after the upload response is already returned. Opens its own DB
    session because the request-scoped session closed when the response went
    out. Frontend polls /inference/{image_id}/status for completion.
    """
    import httpx
    import base64

    inference_id = uuid.uuid4()
    image_b64 = base64.b64encode(file_bytes).decode("utf-8")
    ai_url = f"{settings.AI_SERVICE_URL}/predict"

    print(f"[INFERENCE-BG] image_id={image_id} calling {ai_url}", flush=True)
    print(f"[INFERENCE-BG] sending {len(file_bytes)} bytes, timeout={settings.AI_INFERENCE_TIMEOUT_SECONDS}s", flush=True)

    try:
        async with httpx.AsyncClient(timeout=settings.AI_INFERENCE_TIMEOUT_SECONDS) as client:
            ai_response = await client.post(
                ai_url,
                json={
                    "inference_id": str(inference_id),
                    "image_base64": image_b64,
                    "image_format": format_value,
                },
                headers={"X-Internal-API-Key": settings.AI_INTERNAL_API_KEY},
            )
    except Exception as e:
        print(f"[INFERENCE-BG] HTTP call failed: {type(e).__name__}: {e}", flush=True)
        return

    print(f"[INFERENCE-BG] image_id={image_id} status={ai_response.status_code}", flush=True)
    if ai_response.status_code != 200:
        return

    try:
        ai_data = ai_response.json()
    except Exception as e:
        print(f"[INFERENCE-BG] could not decode AI response: {e}", flush=True)
        return

    if ai_data.get("error"):
        print(f"[INFERENCE-BG] AI returned error: {ai_data.get('error')}", flush=True)
        return

    from app.models.inference_result import InferenceResult

    classification = ai_data.get("classification")
    cls_probs = ai_data.get("classification_probs", {})
    if not classification and cls_probs:
        top_class = max(cls_probs, key=cls_probs.get)
        classification = {
            "disease_class": top_class,
            "confidence_score": cls_probs[top_class],
            "probabilities": cls_probs,
        }

    predictions = ai_data.get("predictions", [])

    async with async_session_maker() as session:
        try:
            session.add(InferenceResult(
                inference_id=inference_id,
                image_id=image_id,
                model_version=ai_data.get("model_version", "unknown"),
                processing_time_sec=ai_data.get("processing_time_sec"),
                predictions=predictions,
                classification=classification,
            ))

            CRITICAL_CLASSES = ("Lung Tumor", "Tuberculosis", "tumor_xray", "tuberculosis")
            is_critical = any(
                p.get("disease_class") in CRITICAL_CLASSES
                and float(p.get("confidence_score", 0)) > 0.5
                for p in predictions
            )
            if (
                not is_critical
                and isinstance(classification, dict)
                and classification.get("disease_class") in CRITICAL_CLASSES
                and float(classification.get("confidence_score", 0)) > 0.5
            ):
                is_critical = True

            if is_critical:
                case_stmt = select(Case).where(Case.case_id == case_id)
                case_res = await session.execute(case_stmt)
                case_row = case_res.scalar_one_or_none()
                if case_row:
                    case_row.priority = UrgencyLevel.Critical

            await session.commit()
            print(f"[INFERENCE-BG] image_id={image_id} saved", flush=True)
        except Exception as e:
            await session.rollback()
            print(f"[INFERENCE-BG] DB save failed: {type(e).__name__}: {e}", flush=True)


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
        headers={"Cache-Control": "private, max-age=900"},
    )
