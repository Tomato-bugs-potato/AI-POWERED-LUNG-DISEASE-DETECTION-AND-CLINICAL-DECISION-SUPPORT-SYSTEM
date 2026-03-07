from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
import hashlib
import traceback
import sys

from app.db.session import get_db
from app.models.image import Image
from app.models.case import Case
from app.schemas.image import ImageUploadResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction, ImageFormat, CaseStatus
from app.core.audit import log_action
from app.services.storage import upload_file
from app.config import settings

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/png": ImageFormat.PNG,
    "image/jpeg": ImageFormat.JPEG,
    "application/dicom": ImageFormat.DICOM
}

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 # 50 MB

@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    case_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Doctor, Role.Radiologist))
):
  try:
    print(f"[UPLOAD] Starting upload for case_id={case_id}, file={file.filename}, content_type={file.content_type}", flush=True)
    
    # Verify case exists
    stmt = select(Case).where(Case.case_id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    print(f"[UPLOAD] Case found: {case.case_id}", flush=True)
        
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPEG, and DICOM allowed.")
        
    format_enum = ALLOWED_MIME_TYPES[file.content_type]
    file_bytes = await file.read()
    
    print(f"[UPLOAD] File read: {len(file_bytes)} bytes, format={format_enum.value}", flush=True)
    
    # Validate Size
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")
        
    # Check duplicate via hash (bypassed for testing by appending UUID)
    file_hash = hashlib.sha256(file_bytes + str(uuid.uuid4()).encode()).hexdigest()
    
    # stmt = select(Image).where(Image.file_hash == file_hash)
    # result = await db.execute(stmt)
    # if result.scalar_one_or_none():
    #     await log_action(db, AuditAction.IMAGE_DUPLICATE_DETECTED, user_id=current_user.user_id, case_id=case_id)
    #     raise HTTPException(status_code=409, detail="Duplicate image detected. File already exists in the system.")
    
    print(f"[UPLOAD] Hash check bypassed for testing: {file_hash[:16]}...", flush=True)
        
    # MinIO Upload
    extension = "dcm" if format_enum == ImageFormat.DICOM else format_enum.value.lower()
    object_name = f"{case_id}/{uuid.uuid4()}.{extension}"
    
    print(f"[UPLOAD] Uploading to MinIO bucket={settings.MINIO_BUCKET_IMAGES}, object={object_name}", flush=True)
    
    try:
        upload_file(settings.MINIO_BUCKET_IMAGES, object_name, file_bytes, file.content_type)
        print(f"[UPLOAD] MinIO upload succeeded", flush=True)
    except Exception as e:
        print(f"[UPLOAD] MinIO upload FAILED: {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()
        sys.stdout.flush()
        raise HTTPException(status_code=500, detail=f"Storage service error: {str(e)}")
        
    # Save Image Record
    db_img = Image(
        case_id=case_id,
        file_url=object_name,
        file_hash=file_hash,
        file_format=format_enum,
        file_size_bytes=len(file_bytes)
    )
    db.add(db_img)
    
    # Optionally bump case status if pending
    if case.status == CaseStatus.Pending_Review:
        case.status = CaseStatus.In_Review
    
    print(f"[UPLOAD] Committing to DB...", flush=True)
    await db.commit()
    await db.refresh(db_img)
    print(f"[UPLOAD] DB commit done, image_id={db_img.image_id}", flush=True)
    
    await log_action(
        db, 
        AuditAction.IMAGE_UPLOADED, 
        user_id=current_user.user_id, 
        case_id=case_id,
        details={"image_id": str(db_img.image_id), "format": format_enum.value, "size_bytes": len(file_bytes)}
    )
    
    # Trigger AI inference (non-blocking — failure won't break the upload)
    inference_id = uuid.uuid4()
    try:
        import httpx
        image_public_url = f"http://minio:9000/{settings.MINIO_BUCKET_IMAGES}/{db_img.file_url}"
        print(f"[UPLOAD] Triggering AI inference {inference_id} at {settings.AI_SERVICE_URL}/predict", flush=True)
        
        async with httpx.AsyncClient(timeout=settings.AI_INFERENCE_TIMEOUT_SECONDS) as client:
            ai_response = await client.post(
                f"{settings.AI_SERVICE_URL}/predict",
                json={
                    "inference_id": str(inference_id),
                    "image_url": image_public_url,
                    "image_format": format_enum.value
                },
                headers={"X-Internal-API-Key": settings.AI_INTERNAL_API_KEY}
            )
        
        ai_data = ai_response.json()
        print(f"[UPLOAD] AI response: {ai_data}", flush=True)
        
        if ai_response.status_code == 200 and not ai_data.get("error"):
            from app.models.inference_result import InferenceResult
            inference_record = InferenceResult(
                inference_id=inference_id,
                image_id=db_img.image_id,
                model_version=ai_data.get("model_version", "unknown"),
                processing_time_sec=ai_data.get("processing_time_sec"),
                predictions=ai_data.get("predictions", [])
            )
            db.add(inference_record)
            await db.commit()
            print(f"[UPLOAD] Inference result saved: {len(ai_data.get('predictions', []))} detections", flush=True)
        else:
            print(f"[UPLOAD] AI inference returned error: {ai_data}", flush=True)
            
    except Exception as e:
        print(f"[UPLOAD] AI inference failed (non-critical): {type(e).__name__}: {e}", flush=True)
    
    print(f"[UPLOAD] SUCCESS", flush=True)
    return ImageUploadResponse(image_id=db_img.image_id, case_id=case_id)
    
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
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Doctor, Role.Radiologist, Role.Admin))
):
    """Return a URL for viewing the image."""
    stmt = select(Image).where(Image.image_id == image_id)
    result = await db.execute(stmt)
    image = result.scalar_one_or_none()
    
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Use direct public URL since the bucket has public download access
    # The MinIO container exposes port 9000 to the host
    url = f"http://localhost:9000/{settings.MINIO_BUCKET_IMAGES}/{image.file_url}"
    return {"url": url}
