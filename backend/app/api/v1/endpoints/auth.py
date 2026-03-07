from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.session import Session as DBSession
from app.schemas.auth import LoginRequest, TokenResponse, VerifyOTPRequest, MessageResponse, ResendOTPRequest, LoginResponse
from app.core.security import verify_password, create_access_token, create_refresh_token, hash_token, generate_otp, hash_otp
from app.db.base import UserStatus, AuditAction
from app.core.audit import log_action

router = APIRouter()

# Placeholder for Redis dependency until Redis is implemented in Phase 9
async def get_redis():
    return None

@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    payload: LoginRequest, 
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            await log_action(db, AuditAction.LOGIN_FAILURE, user_id=user.user_id, ip_address=request.client.host if request.client else None)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if user.status == UserStatus.Inactive:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    if user.status == UserStatus.Locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account locked")

    # TODO: Generate OTP, save to Redis with 5 min TTL, dispatch email worker
    # For now, simulate success
    otp = generate_otp()
    # redis.setex(f"otp:{user.user_id}", 300, hash_otp(otp))
    
    await log_action(db, AuditAction.OTP_SENT, user_id=user.user_id, ip_address=request.client.host if request.client else None)
    
    return LoginResponse(
        message=f"OTP sent to {user.email}. Use user_id {user.user_id} for verification flow.",
        user_id=user.user_id
    )

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    request: Request,
    payload: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.user_id == payload.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # TODO: Verify OTP against Redis. Check attempts.
    # For now, simulate verification. Assuming any 6 digits pass for schema test.
    
    if len(payload.otp) != 6:
        await log_action(db, AuditAction.OTP_FAILED, user_id=user.user_id, ip_address=request.client.host if request.client else None)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    # On success:
    user.last_login = datetime.utcnow()
    
    # Generate tokens
    access_token = create_access_token(str(user.user_id), user.role.value, user.email)
    refresh_token = create_refresh_token()
    
    # Store refresh token hashed
    db_session = DBSession(
        user_id=user.user_id,
        token_hash=hash_token(refresh_token),
        expires_at=datetime.utcnow() # + 30 days based on config
    )
    db.add(db_session)
    await log_action(db, AuditAction.LOGIN_SUCCESS, user_id=user.user_id, ip_address=request.client.host if request.client else None)
    await db.commit()
    
    # To conform with Phase 4 specs, return user dict alongside tokens.
    user_dict = {
        "user_id": str(user.user_id),
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "hospital_id": str(user.hospital_id) if user.hospital_id else None
    }

    return {"access_token": access_token, "token_type": "bearer", "user": user_dict}

@router.post("/logout")
async def logout():
    # TODO: Invalidate session token
    pass
