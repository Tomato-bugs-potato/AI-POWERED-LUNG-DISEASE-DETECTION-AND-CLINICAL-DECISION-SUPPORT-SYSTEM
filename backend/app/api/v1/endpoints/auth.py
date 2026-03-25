from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
import uuid
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.user import User
from app.models.session import Session as DBSession
from app.schemas.auth import (
    LoginRequest, TokenResponse, VerifyOTPRequest,
    MessageResponse, ResendOTPRequest, LoginResponse, OTPResendResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
)
from app.core.security import (
    verify_password, hash_password, create_access_token, create_refresh_token,
    hash_token, generate_otp, hash_otp,
)
from app.core.redis import get_redis
from app.db.base import UserStatus, AuditAction
from app.core.audit import log_action
from app.dependencies import get_current_user
from app.config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# Brute-force protection constants (FR-02, Security Design)
# ---------------------------------------------------------------------------
LOCKOUT_THRESHOLDS = [
    (10, None),      # 10 failures → permanent lock
    (5, 15 * 60),    # 5 failures → 15-min lockout
    (3, 60),         # 3 failures → 1-min lockout
]


async def _check_brute_force(redis, user_id: str):
    """Raise 429 / 403 if login attempts exceed thresholds."""
    if redis is None:
        return
    attempts = int(await redis.get(f"login_attempts:{user_id}") or 0)
    for threshold, lockout_seconds in LOCKOUT_THRESHOLDS:
        if attempts >= threshold:
            if lockout_seconds is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account locked due to too many failed attempts. Contact admin.",
                )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many login attempts. Try again in {lockout_seconds // 60} minute(s).",
            )


async def _record_failed_attempt(redis, user_id: str, db: AsyncSession, user: User):
    """Increment failed-login counter; lock account on 10th failure."""
    if redis is None:
        return
    attempts = await redis.incr(f"login_attempts:{user_id}")
    await redis.expire(f"login_attempts:{user_id}", 15 * 60)  # 15-min window
    if attempts >= 10:
        user.status = UserStatus.Locked
        await db.commit()


async def _clear_attempts(redis, user_id: str):
    if redis is not None:
        await redis.delete(f"login_attempts:{user_id}")


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------
@router.post("/login")
async def login(
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    redis = await get_redis()

    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        if user:
            await _check_brute_force(redis, str(user.user_id))
            await _record_failed_attempt(redis, str(user.user_id), db, user)
            await log_action(
                db, AuditAction.LOGIN_FAILURE,
                user_id=user.user_id,
                ip_address=request.client.host if request.client else None,
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Check brute-force before proceeding
    await _check_brute_force(redis, str(user.user_id))

    if user.status == UserStatus.Inactive:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    if user.status == UserStatus.Locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account locked")

    # ── DEV SHORTCUT: skip OTP and return tokens directly ──
    if getattr(settings, "SKIP_OTP", False):
        await _clear_attempts(redis, str(user.user_id))
        user.last_login = datetime.utcnow()

        access_token = create_access_token(str(user.user_id), user.role.value, user.email)
        refresh_token = create_refresh_token()

        db_session = DBSession(
            user_id=user.user_id,
            token_hash=hash_token(refresh_token),
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(db_session)

        await log_action(
            db, AuditAction.LOGIN_SUCCESS,
            user_id=user.user_id,
            ip_address=request.client.host if request.client else None,
        )
        await db.commit()

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=False,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
            path="/api/v1/auth",
        )

        user_dict = {
            "user_id": str(user.user_id),
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
            "hospital_id": str(user.hospital_id) if user.hospital_id else None,
        }
        return {"access_token": access_token, "token_type": "bearer", "user": user_dict, "skip_otp": True}
    # ── END DEV SHORTCUT ──

    # Generate OTP, store hashed in Redis with 5-min TTL (FR-02)
    otp = generate_otp()
    if redis is not None:
        await redis.setex(f"otp:{user.user_id}", settings.OTP_EXPIRE_MINUTES * 60, hash_otp(otp))
        await redis.setex(f"otp_attempts:{user.user_id}", settings.OTP_EXPIRE_MINUTES * 60, 0)
    # OTP is returned to the client so the frontend can dispatch it via EmailJS

    await log_action(
        db, AuditAction.OTP_SENT,
        user_id=user.user_id,
        ip_address=request.client.host if request.client else None,
    )

    return LoginResponse(
        message=f"OTP generated for {user.email}.",
        user_id=user.user_id,
        otp_code=otp,
        email=user.email,
    )


# ---------------------------------------------------------------------------
# POST /auth/verify-otp
# ---------------------------------------------------------------------------
@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    request: Request,
    payload: VerifyOTPRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    redis = await get_redis()

    stmt = select(User).where(User.user_id == payload.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if len(payload.otp) != 6:
        await log_action(
            db, AuditAction.OTP_FAILED,
            user_id=user.user_id,
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP format")

    # FR-02: Verify OTP against Redis with attempt tracking
    if redis is not None:
        otp_attempts = int(await redis.get(f"otp_attempts:{user.user_id}") or 0)
        if otp_attempts >= settings.OTP_MAX_ATTEMPTS:
            await redis.delete(f"otp:{user.user_id}")
            await redis.delete(f"otp_attempts:{user.user_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum OTP attempts exceeded. Please request a new code.",
            )

        stored_hash = await redis.get(f"otp:{user.user_id}")
        if stored_hash is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP expired. Please request a new code.",
            )

        if hash_otp(payload.otp) != stored_hash:
            await redis.incr(f"otp_attempts:{user.user_id}")
            await log_action(
                db, AuditAction.OTP_FAILED,
                user_id=user.user_id,
                ip_address=request.client.host if request.client else None,
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

        # OTP valid — clean up
        await redis.delete(f"otp:{user.user_id}")
        await redis.delete(f"otp_attempts:{user.user_id}")
    # else: if Redis unavailable, accept any 6-digit OTP (dev fallback — remove in production)

    # Clear brute-force counter on successful auth
    await _clear_attempts(redis, str(user.user_id))

    # Update last login
    user.last_login = datetime.utcnow()

    # Generate tokens
    access_token = create_access_token(str(user.user_id), user.role.value, user.email)
    refresh_token = create_refresh_token()

    # Store refresh token hashed in Sessions table
    db_session = DBSession(
        user_id=user.user_id,
        token_hash=hash_token(refresh_token),
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(db_session)

    await log_action(
        db, AuditAction.LOGIN_SUCCESS,
        user_id=user.user_id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    # Set refresh token as HTTP-only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set True in production with HTTPS
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/api/v1/auth",
    )

    user_dict = {
        "user_id": str(user.user_id),
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "hospital_id": str(user.hospital_id) if user.hospital_id else None,
    }

    return {"access_token": access_token, "token_type": "bearer", "user": user_dict}


# ---------------------------------------------------------------------------
# POST /auth/logout  (FR-04)
# ---------------------------------------------------------------------------
@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    redis = await get_redis()

    # 1. Delete all sessions for this user
    stmt = delete(DBSession).where(DBSession.user_id == current_user.user_id)
    await db.execute(stmt)

    # 2. Blacklist current access token in Redis (TTL = remaining token lifetime)
    if redis is not None:
        token_key = f"blacklist:user:{current_user.user_id}"
        await redis.setex(token_key, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, "1")

    # 3. Clear refresh token cookie
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")

    # 4. Log event
    await log_action(
        db, AuditAction.LOGOUT,
        user_id=current_user.user_id,
        ip_address=request.client.host if request.client else None,
    )
    await db.commit()

    return {"message": "Logged out successfully"}


# ---------------------------------------------------------------------------
# POST /auth/resend-otp
# ---------------------------------------------------------------------------
@router.post("/resend-otp", response_model=OTPResendResponse)
async def resend_otp(
    request: Request,
    payload: ResendOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    redis = await get_redis()

    stmt = select(User).where(User.user_id == payload.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    otp = generate_otp()
    if redis is not None:
        await redis.setex(f"otp:{user.user_id}", settings.OTP_EXPIRE_MINUTES * 60, hash_otp(otp))
        await redis.setex(f"otp_attempts:{user.user_id}", settings.OTP_EXPIRE_MINUTES * 60, 0)
    # OTP returned to client for EmailJS dispatch

    await log_action(
        db, AuditAction.OTP_SENT,
        user_id=user.user_id,
        ip_address=request.client.host if request.client else None,
    )

    return OTPResendResponse(
        message=f"New OTP generated for {user.email}.",
        otp_code=otp,
        email=user.email,
    )


# ---------------------------------------------------------------------------
# POST /auth/refresh  (FR-04)
# ---------------------------------------------------------------------------
@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a valid HTTP-only refresh_token cookie for a new access token."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    token_hash = hash_token(refresh_token)
    stmt = select(DBSession).where(
        DBSession.token_hash == token_hash,
        DBSession.expires_at > datetime.utcnow(),
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalid or expired")

    stmt_user = select(User).where(User.user_id == session.user_id)
    res_user = await db.execute(stmt_user)
    user = res_user.scalar_one_or_none()

    if not user or user.status != UserStatus.Active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Issue new access token
    access_token = create_access_token(str(user.user_id), user.role.value, user.email)

    user_dict = {
        "user_id": str(user.user_id),
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "hospital_id": str(user.hospital_id) if user.hospital_id else None,
    }
    return {"access_token": access_token, "token_type": "bearer", "user": user_dict}


# ---------------------------------------------------------------------------
# POST /auth/forgot-password
# ---------------------------------------------------------------------------
@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a password-reset token, store it in Redis, and queue a reset email."""
    redis = await get_redis()

    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Always return 200 to avoid email enumeration
    if not user:
        return {"message": "If that email exists you will receive a reset link shortly."}

    reset_token = str(uuid.uuid4())
    if redis is not None:
        await redis.setex(f"pwd_reset:{reset_token}", 15 * 60, str(user.user_id))

    # Queue email (non-blocking; if Celery is down, log and move on)
    try:
        from app.workers.email_tasks import send_password_reset_email
        send_password_reset_email.delay(user.email, user.name, reset_token)
    except Exception:
        pass

    return {"message": "If that email exists you will receive a reset link shortly."}


# ---------------------------------------------------------------------------
# POST /auth/reset-password
# ---------------------------------------------------------------------------
@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Validate reset token from Redis, update password, invalidate all sessions."""
    redis = await get_redis()

    user_id_str: str | None = None
    if redis is not None:
        user_id_str = await redis.get(f"pwd_reset:{payload.token}")

    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token invalid or expired")

    stmt = select(User).where(User.user_id == user_id_str)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = hash_password(payload.new_password)

    # Invalidate all active sessions
    await db.execute(delete(DBSession).where(DBSession.user_id == user.user_id))

    # Remove reset token from Redis
    if redis is not None:
        await redis.delete(f"pwd_reset:{payload.token}")

    await db.commit()
    return {"message": "Password updated successfully. Please log in."}
