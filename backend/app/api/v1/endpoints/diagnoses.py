from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.db.session import get_db
from app.models.diagnosis import Diagnosis
from app.models.case import Case
from app.schemas.diagnosis import DiagnosisCreate, DiagnosisResponse, DiagnosisDraftCreate
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction, CaseStatus
from app.core.audit import log_action

router = APIRouter()

# Strictly Doctor-only routes
require_doctor = require_roles(Role.Doctor)

@router.post("/{case_id}", response_model=DiagnosisResponse, dependencies=[Depends(require_doctor)])
async def submit_diagnosis(
    case_id: uuid.UUID,
    diag_in: DiagnosisCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Case).where(Case.case_id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    stmt = select(Diagnosis).where(Diagnosis.case_id == case_id)
    result = await db.execute(stmt)
    diagnosis = result.scalar_one_or_none()
    
    if diagnosis:
        # Update Draft logic if diagnosis was already drafted
        diagnosis.primary_diagnosis = diag_in.primary_diagnosis
        diagnosis.diagnosis_notes = diag_in.diagnosis_notes # TypeDecorator handles AES encryption invisibly
        diagnosis.urgency_level = diag_in.urgency_level
        diagnosis.treatment_recommendations = diag_in.treatment_recommendations
    else:
        diagnosis = Diagnosis(
            case_id=case_id,
            doctor_id=current_user.user_id,
            primary_diagnosis=diag_in.primary_diagnosis,
            diagnosis_notes=diag_in.diagnosis_notes,
            urgency_level=diag_in.urgency_level,
            treatment_recommendations=diag_in.treatment_recommendations
        )
        db.add(diagnosis)
        
    case.status = CaseStatus.Diagnosed
    
    await db.commit()
    await db.refresh(diagnosis)
    
    # TODO: Phase 6 trigger Celery background worker to compile the final PDF Report
    # generate_report.delay(str(case_id), str(current_user.user_id))

    await log_action(
        db, 
        AuditAction.DIAGNOSIS_SUBMITTED, 
        user_id=current_user.user_id, 
        case_id=case_id,
        details={"primary_diagnosis": diag_in.primary_diagnosis.value, "urgency": diag_in.urgency_level.value}
    )
    
    return diagnosis

@router.post("/{case_id}/draft", response_model=DiagnosisResponse, dependencies=[Depends(require_doctor)])
async def save_diagnosis_draft(
    case_id: uuid.UUID,
    diag_in: DiagnosisDraftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Case).where(Case.case_id == case_id)
    result = await db.execute(stmt)
    case = result.scalar_one_or_none()
    
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    stmt = select(Diagnosis).where(Diagnosis.case_id == case_id)
    result = await db.execute(stmt)
    diagnosis = result.scalar_one_or_none()
    
    if not diagnosis:
        diagnosis = Diagnosis(
            case_id=case_id,
            doctor_id=current_user.user_id,
            primary_diagnosis=diag_in.primary_diagnosis,
            diagnosis_notes=diag_in.diagnosis_notes or "",
            urgency_level=diag_in.urgency_level,
            treatment_recommendations=diag_in.treatment_recommendations
        )
        db.add(diagnosis)
    else:
        if diag_in.primary_diagnosis:
            diagnosis.primary_diagnosis = diag_in.primary_diagnosis
        if diag_in.diagnosis_notes is not None:
            diagnosis.diagnosis_notes = diag_in.diagnosis_notes
        if diag_in.urgency_level:
            diagnosis.urgency_level = diag_in.urgency_level
        if diag_in.treatment_recommendations is not None:
            diagnosis.treatment_recommendations = diag_in.treatment_recommendations
            
    # Leave status as Ready_for_Diagnosis
    await db.commit()
    await db.refresh(diagnosis)
    
    await log_action(db, AuditAction.DIAGNOSIS_DRAFT_SAVED, user_id=current_user.user_id, case_id=case_id)
    return diagnosis

@router.get("/{case_id}", response_model=DiagnosisResponse, dependencies=[Depends(require_doctor)])
async def get_diagnosis(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Diagnosis).where(Diagnosis.case_id == case_id)
    result = await db.execute(stmt)
    diagnosis = result.scalar_one_or_none()
    
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found for this case")
        
    # The EncryptedText TypeDecorator automatically decrypts during retrieval!
    return diagnosis
