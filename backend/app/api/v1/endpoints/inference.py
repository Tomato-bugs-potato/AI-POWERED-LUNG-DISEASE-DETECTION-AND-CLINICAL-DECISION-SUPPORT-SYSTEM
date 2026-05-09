from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
import httpx
import base64

from app.db.session import get_db
from app.models.inference_result import InferenceResult
from app.models.image import Image
from app.models.case import Case
from app.schemas.inference import InferenceResponse, InferenceStatusResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, UrgencyLevel
from app.services.storage import get_file_data
from app.config import settings

router = APIRouter()

require_clinical_staff = require_roles(Role.Radiologist, Role.Doctor)
require_inference_view = require_roles(Role.Radiologist, Role.Doctor, Role.Lab_Technician)

@router.get("/{image_id}/result", response_model=InferenceResponse)
async def get_inference_result(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inference_view)
):
    stmt = select(InferenceResult).where(InferenceResult.image_id == image_id)
    result = await db.execute(stmt)
    inference = result.scalar_one_or_none()
    
    if not inference:
        raise HTTPException(status_code=404, detail="Inference result not found")
        
    return inference

@router.get("/{image_id}/status", response_model=InferenceStatusResponse)
async def check_inference_status(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inference_view)
):
    # Depending on Celery implementation, we might check redis or local DB
    stmt = select(InferenceResult).where(InferenceResult.image_id == image_id)
    result = await db.execute(stmt)
    inference = result.scalar_one_or_none()
    
    if inference:
        return {"status": "completed"}
    
    # TODO: Look up celery task state from redis queue. 
    # For now mock "processing"
    return {"status": "processing"}

@router.get("/{image_id}/heatmap")
async def get_inference_heatmap(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_inference_view),
):
    """Proxy to the AI service /heatmap endpoint.

    Streams a PNG of the original x-ray with a Grad-CAM heatmap overlay,
    YOLO bounding boxes + segmentation polygons drawn on top, and per-class
    probability labels in the corner. Cached via Cache-Control for the
    radiologist's session — the model output is deterministic per image.
    """
    stmt = select(Image).where(Image.image_id == image_id)
    result = await db.execute(stmt)
    db_img = result.scalar_one_or_none()
    if not db_img:
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        file_bytes, _ = get_file_data(settings.MINIO_BUCKET_IMAGES, db_img.file_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not retrieve image: {e}")

    image_b64 = base64.b64encode(file_bytes).decode("utf-8")
    ai_url = f"{settings.AI_SERVICE_URL}/heatmap"

    try:
        async with httpx.AsyncClient(timeout=settings.AI_INFERENCE_TIMEOUT_SECONDS) as client:
            ai_response = await client.post(
                ai_url,
                json={
                    "inference_id": str(uuid.uuid4()),
                    "image_base64": image_b64,
                    "image_format": db_img.file_format.value,
                },
                headers={"X-Internal-API-Key": settings.AI_INTERNAL_API_KEY},
            )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI heatmap call failed: {type(e).__name__}: {e}")

    if ai_response.status_code != 200:
        raise HTTPException(status_code=502, detail=f"AI service returned {ai_response.status_code}")

    try:
        ai_data = ai_response.json()
    except Exception:
        raise HTTPException(status_code=502, detail="AI service returned non-JSON")

    if ai_data.get("error") or not ai_data.get("heatmap_base64"):
        raise HTTPException(status_code=502, detail=f"AI heatmap failed: {ai_data.get('error', 'no heatmap returned')}")

    try:
        png_bytes = base64.b64decode(ai_data["heatmap_base64"])
    except Exception:
        raise HTTPException(status_code=502, detail="Could not decode heatmap PNG")

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=900"},
    )


@router.post("/{image_id}/retry", response_model=InferenceStatusResponse)
async def retry_inference(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Admin, Role.Lab_Technician, Role.Doctor, Role.Radiologist))
):
    """Manually trigger AI re-evaluation for an image."""
    # 1. Fetch image record
    stmt = select(Image).where(Image.image_id == image_id)
    result = await db.execute(stmt)
    db_img = result.scalar_one_or_none()
    if not db_img:
        raise HTTPException(status_code=404, detail="Image not found")

    # 2. Fetch image data from MinIO
    try:
        file_bytes, _ = get_file_data(settings.MINIO_BUCKET_IMAGES, db_img.file_url)
        image_b64 = base64.b64encode(file_bytes).decode("utf-8")
    except Exception as e:
        print(f"[RETRY] Storage fetch failed: {e}", flush=True)
        raise HTTPException(status_code=502, detail="Failed to retrieve image from storage")

    # 3. Call AI Service
    inference_id = uuid.uuid4()
    try:
        ai_url = f"{settings.AI_SERVICE_URL}/predict"
        async with httpx.AsyncClient(timeout=settings.AI_INFERENCE_TIMEOUT_SECONDS) as client:
            ai_response = await client.post(
                ai_url,
                json={
                    "inference_id": str(inference_id),
                    "image_base64": image_b64,
                    "image_format": db_img.file_format.value,
                },
                headers={"X-Internal-API-Key": settings.AI_INTERNAL_API_KEY},
            )

        if ai_response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"AI service returned error: {ai_response.status_code}")
        
        ai_data = ai_response.json()
        if ai_data.get("error"):
             raise HTTPException(status_code=502, detail=f"AI service error: {ai_data.get('error')}")

        # 4. Update or Create Inference Record
        stmt_inf = select(InferenceResult).where(InferenceResult.image_id == image_id)
        res_inf = await db.execute(stmt_inf)
        inference_record = res_inf.scalar_one_or_none()

        if not inference_record:
            inference_record = InferenceResult(image_id=image_id)
            db.add(inference_record)

        inference_record.inference_id = inference_id
        inference_record.model_version = ai_data.get("model_version", "unknown")
        inference_record.processing_time_sec = ai_data.get("processing_time_sec")
        inference_record.predictions = ai_data.get("predictions", [])
        inference_record.lung_segmentation = ai_data.get("lung_segmentation", [])
        
        # Map classification_probs to the standard classification format
        cls_probs = ai_data.get("classification_probs", {})
        if cls_probs:
            top_class = max(cls_probs, key=cls_probs.get)
            inference_record.classification = {
                "disease_class": top_class,
                "confidence_score": cls_probs[top_class],
                "probabilities": cls_probs
            }

        # 5. Handle priority updates if necessary
        case_stmt = select(Case).where(Case.case_id == db_img.case_id)
        case_res = await db.execute(case_stmt)
        case = case_res.scalar_one_or_none()
        
        if case:
            predictions = ai_data.get("predictions", [])
            # Critical classes in notebook: tumor_xray and tuberculosis
            CRITICAL_CLASSES = ("tumor_xray", "tuberculosis", "Lung Tumor", "Tuberculosis")
            
            is_critical = any(
                p.get("disease_class") in CRITICAL_CLASSES
                and float(p.get("confidence_score", 0)) > 0.5
                for p in predictions
            )
            
            if not is_critical and cls_probs:
                # Check top class from classifier
                top_class = max(cls_probs, key=cls_probs.get)
                if top_class in CRITICAL_CLASSES and cls_probs[top_class] > 0.5:
                    is_critical = True
            
            if is_critical:
                case.priority = UrgencyLevel.Critical

        await db.commit()
        return {"status": "completed"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[RETRY] AI re-evaluation failed: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error during re-evaluation: {str(e)}")
