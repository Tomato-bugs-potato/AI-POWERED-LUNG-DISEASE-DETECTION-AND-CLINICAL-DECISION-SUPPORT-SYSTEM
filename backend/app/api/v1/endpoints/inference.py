from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.db.session import get_db
from app.models.inference_result import InferenceResult
from app.schemas.inference import InferenceResponse, InferenceStatusResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role

router = APIRouter()

require_clinical_staff = require_roles(Role.Radiologist, Role.Doctor)

@router.get("/{image_id}/result", response_model=InferenceResponse)
async def get_inference_result(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_clinical_staff)
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
    current_user: User = Depends(require_clinical_staff)
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

@router.post("/{image_id}/retry", response_model=InferenceStatusResponse)
async def retry_inference(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Admin, Role.Lab_Technician))
):
    # Re-queue inference job logic will go here
    # enqueue_inference_job.delay(str(image_id))
    return {"status": "queued"}
