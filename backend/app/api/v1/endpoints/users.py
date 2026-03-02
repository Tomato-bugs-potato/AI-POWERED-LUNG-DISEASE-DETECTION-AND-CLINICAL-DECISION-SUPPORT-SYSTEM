from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserUpdate, UserRoleUpdate
from app.dependencies import get_current_user
from app.core.rbac import require_admin, require_authenticated
from app.db.base import AuditAction, UserStatus
from app.core.audit import log_action
from app.core.security import hash_password

router = APIRouter()

@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate, 
    db: AsyncSession = Depends(get_db)
):
    # Check if user exists
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        
    temp_password = user_in.password if hasattr(user_in, 'password') else "temp" # Fallback if not provided
    hashed_pwd = hash_password(temp_password)

    new_user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        name=user_in.name,
        role=user_in.role,
        hospital_id=user_in.hospital_id,
        phone_number=user_in.phone_number
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Log self-registration
    await log_action(db, AuditAction.USER_CREATED, user_id=new_user.user_id, details={"created_user_id": str(new_user.user_id), "method": "public_signup"})
    await db.refresh(new_user)
    return new_user

@router.get("/me", response_model=UserResponse, dependencies=[Depends(require_authenticated)])
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def get_user_by_id(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("/{user_id}/role", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def update_user_role(
    user_id: uuid.UUID,
    role_update: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    old_role = user.role.value
    user.role = role_update.role
    await db.commit()
    await db.refresh(user)
    
    await log_action(
        db, 
        AuditAction.USER_ROLE_CHANGED, 
        user_id=current_user.user_id, 
        details={"target_user_id": str(user_id), "old_role": old_role, "new_role": user.role.value}
    )
    await db.refresh(user)
    return user

@router.post("/{user_id}/deactivate", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = UserStatus.Inactive
    await db.commit()
    await db.refresh(user)
    
    await log_action(
        db, 
        AuditAction.USER_DEACTIVATED, 
        user_id=current_user.user_id, 
        details={"target_user_id": str(user_id)}
    )
    await db.refresh(user)
    return user
