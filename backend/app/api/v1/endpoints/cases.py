from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.models.case import Case
from app.models.patient import Patient
from app.schemas.case import CaseResponse, CaseDetailResponse, CaseCreate, CaseStatusUpdate
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction, CaseStatus
from app.core.audit import log_action

router = APIRouter()

require_clinical_staff = require_roles(Role.Lab_Technician, Role.Radiologist, Role.Doctor)
require_rad_or_doc = require_roles(Role.Radiologist, Role.Doctor)

@router.post("/", response_model=CaseResponse)
async def create_case(
    case_in: CaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(Role.Lab_Technician, Role.Radiologist, Role.Doctor))
):
    # Verify patient exists
    stmt = select(Patient).where(Patient.patient_id == case_in.patient_id)
    result = await db.execute(stmt)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    new_case = Case(
        patient_id=case_in.patient_id,
        upload_tech_id=current_user.user_id,
        visit_date=case_in.visit_date,
        status=CaseStatus.Pending_Review,
        linked_case_id=case_in.linked_case_id
    )
    
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)
    
    details = {"patient_id": str(case_in.patient_id)}
    if case_in.linked_case_id:
        details["linked_case_id"] = str(case_in.linked_case_id)
        
    await log_action(db, AuditAction.CASE_CREATED, user_id=current_user.user_id, case_id=new_case.case_id, details=details)
    await db.refresh(new_case)
    return new_case

@router.get("/", response_model=List[CaseResponse])
async def list_cases(
    status_filter: Optional[CaseStatus] = None,
    patient_id: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_clinical_staff)
):
    stmt = select(Case).offset(skip).limit(limit)
    
    if status_filter:
        stmt = stmt.where(Case.status == status_filter)
    if patient_id:
        stmt = stmt.where(Case.patient_id == patient_id)
        
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{case_id}", response_model=CaseDetailResponse)
async def get_case(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_clinical_staff)
):
    from app.models.image import Image
    stmt = select(Case).options(
        selectinload(Case.patient),
        selectinload(Case.upload_tech),
        selectinload(Case.images).selectinload(Image.inference_results)
    ).where(Case.case_id == case_id)
    
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    return case

@router.patch("/{case_id}/status", response_model=CaseResponse)
async def update_case_status(
    case_id: uuid.UUID,
    status_update: CaseStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_clinical_staff)
):
    # Depending on status transitions, we might need stricter role checks
    # e.g. only radiologists can move to Ready_for_Diagnosis
    stmt = select(Case).where(Case.case_id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    old_status = case.status.value
    case.status = status_update.status
    
    await db.commit()
    await db.refresh(case)
    
    await log_action(
        db, 
        AuditAction.CASE_STATUS_CHANGED, 
        user_id=current_user.user_id, 
        case_id=case.case_id,
        details={"old_status": old_status, "new_status": case.status.value}
    )
    
    await db.refresh(case)
    return case
