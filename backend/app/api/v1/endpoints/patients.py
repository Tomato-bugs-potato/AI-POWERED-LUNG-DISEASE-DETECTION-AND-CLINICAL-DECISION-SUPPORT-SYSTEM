from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid
import sqlalchemy

from app.db.session import get_db
from app.models.patient import Patient
from app.models.case import Case
from app.schemas.patient import PatientResponse, PatientCreate
from app.dependencies import get_current_user
from app.models.user import User
from app.core.rbac import require_roles
from app.db.base import Role, AuditAction
from app.core.audit import log_action

router = APIRouter()

# Allow Tech, Radiologist, and Doctor 
require_clinical_staff = require_roles(Role.Lab_Technician, Role.Radiologist, Role.Doctor)

@router.post("/", response_model=PatientResponse, dependencies=[Depends(require_clinical_staff)])
async def register_patient(
    patient_in: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not patient_in.consent_recorded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cannot register patient without explicit consent recorded"
        )
        
    db_patient = Patient(
        age=patient_in.age,
        sex=patient_in.sex,
        consent_recorded=patient_in.consent_recorded,
        consent_date=patient_in.visit_date
    )
    
    # If ID provided from external system
    if hasattr(patient_in, 'patient_id') and patient_in.patient_id:
        db_patient.patient_id = patient_in.patient_id
        
    db.add(db_patient)
    await db.commit()

    await log_action(
        db, 
        AuditAction.PATIENT_REGISTERED, 
        user_id=current_user.user_id, 
        details={"patient_id": str(db_patient.patient_id), "consent_recorded": True}
    )
    
    await db.refresh(db_patient)
    
    return db_patient


@router.get("/search", response_model=List[PatientResponse], dependencies=[Depends(require_clinical_staff)])
async def search_patients(
    patient_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Patient)
    if patient_id:
        stmt = stmt.where(Patient.patient_id.cast(sqlalchemy.String).ilike(f"%{patient_id}%"))
    stmt = stmt.limit(20)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/", response_model=List[PatientResponse], dependencies=[Depends(require_clinical_staff)])
async def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Patient).offset(skip).limit(limit)
    res = await db.execute(stmt)
    patients = res.scalars().all()
    return patients


@router.get("/{patient_id}", response_model=PatientResponse, dependencies=[Depends(require_clinical_staff)])
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Patient).where(Patient.patient_id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return patient


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(Role.Admin))])
async def delete_patient_data(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    NFR-25: Right to Erasure. Soft deletion / hard deletion workflow for patient data.
    """
    stmt = select(Patient).where(Patient.patient_id == patient_id)
    result = await db.execute(stmt)
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # TODO: Queue Celery task to delete files from MinIO, cases from DB 
    # For now, we perform a hard DB deletion, which cascades to cases, images, etc.
    await db.delete(patient)
    await db.commit()
    
    await log_action(
        db, 
        AuditAction.DATA_DELETION_REQUESTED, 
        user_id=current_user.user_id, 
        details={"patient_id": str(patient_id)}
    )
    return None
