from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.models.radiologist_review import RadiologistReview
from app.models.case import Case
from app.schemas.review import ReviewCreate, ReviewResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction, CaseStatus
from app.core.audit import log_action

router = APIRouter()

# Both Doctor and Radiologist can view
require_rad_or_doc = require_roles(Role.Radiologist, Role.Doctor)
# Only radiologist can submit reviews
require_radiologist = require_roles(Role.Radiologist)

@router.post("/{case_id}", response_model=ReviewResponse, dependencies=[Depends(require_radiologist)])
async def create_or_update_review(
    case_id: uuid.UUID,
    review_in: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Case).where(Case.case_id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    stmt = select(RadiologistReview).where(RadiologistReview.case_id == case_id)
    result = await db.execute(stmt)
    review = result.scalar_one_or_none()
    
    if review:
        # Update existing
        review.annotations = review_in.annotations
        review.notes = review_in.notes
        review.confidence_threshold_applied = review_in.confidence_threshold_applied
        
        await log_action(db, AuditAction.ANNOTATION_EDITED, user_id=current_user.user_id, case_id=case_id)
    else:
        # Create new
        review = RadiologistReview(
            case_id=case_id,
            radiologist_id=current_user.user_id,
            annotations=review_in.annotations,
            notes=review_in.notes,
            confidence_threshold_applied=review_in.confidence_threshold_applied
        )
        db.add(review)
        await log_action(db, AuditAction.REVIEW_SAVED, user_id=current_user.user_id, case_id=case_id)
        
    if review_in.priority:
        case.priority = review_in.priority

    await db.commit()
    await db.refresh(review)
    return review

@router.post("/{case_id}/send", response_model=ReviewResponse, dependencies=[Depends(require_radiologist)])
async def submit_review_to_doctor(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Case).where(Case.case_id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    stmt = select(RadiologistReview).where(RadiologistReview.case_id == case_id)
    result = await db.execute(stmt)
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(status_code=400, detail="Cannot send empty review to doctor. Please save review first.")
        
    case.status = CaseStatus.Ready_for_Diagnosis
    await db.commit()
    
    await log_action(db, AuditAction.REVIEW_SENT_TO_DOCTOR, user_id=current_user.user_id, case_id=case_id)
    return review

@router.get("/{case_id}", response_model=Optional[ReviewResponse], dependencies=[Depends(require_rad_or_doc)])
async def get_review(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    try:
        stmt = select(RadiologistReview).where(RadiologistReview.case_id == case_id)
        result = await db.execute(stmt)
        review = result.scalar_one_or_none()
        return review
    except Exception as e:
        import traceback
        import sys
        print(f"[REVIEWS] Error in get_review: {e}", file=sys.stderr)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Internal server error retrieving review")
