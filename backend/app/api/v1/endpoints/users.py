from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserUpdate, UserRoleUpdate
from app.dependencies import get_current_user
from app.core.rbac import require_admin, require_authenticated
from app.db.base import AuditAction, UserStatus, Role
from app.core.audit import log_action
from app.core.security import hash_password, validate_password
from app.services.storage import upload_file, get_presigned_url
from app.config import settings

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /users/  — Public signup (self-registration)
# ---------------------------------------------------------------------------
@router.post("/", response_model=UserResponse)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    # Check if user exists
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    # Validate password strength (GAP-07)
    password = user_in.password if hasattr(user_in, "password") and user_in.password else None
    if not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required")
    valid, msg = validate_password(password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    hashed_pwd = hash_password(password)

    new_user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        name=user_in.name,
        role=user_in.role,
        hospital_id=user_in.hospital_id,
        phone_number=user_in.phone_number,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await log_action(
        db, AuditAction.USER_CREATED,
        user_id=new_user.user_id,
        details={"created_user_id": str(new_user.user_id), "method": "public_signup"},
    )
    await db.refresh(new_user)
    return new_user


# ---------------------------------------------------------------------------
# POST /users/admin-create  — Admin-only user creation with welcome email (FR-26)
# ---------------------------------------------------------------------------
@router.post("/admin-create", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def admin_create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    password = user_in.password if hasattr(user_in, "password") and user_in.password else None
    if not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required")
    valid, msg = validate_password(password)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    hashed_pwd = hash_password(password)

    new_user = User(
        email=user_in.email,
        password_hash=hashed_pwd,
        name=user_in.name,
        role=user_in.role,
        hospital_id=user_in.hospital_id,
        phone_number=user_in.phone_number,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Send welcome email (FR-26)
    try:
        from app.workers.email_tasks import send_welcome_email
        send_welcome_email.delay(new_user.email, new_user.name, password)
    except Exception:
        pass  # Non-blocking — email failure shouldn't block user creation

    await log_action(
        db, AuditAction.USER_CREATED,
        user_id=current_user.user_id,
        details={"created_user_id": str(new_user.user_id), "method": "admin_create"},
    )
    await db.refresh(new_user)
    return new_user


# ---------------------------------------------------------------------------
# GET /users/me
# ---------------------------------------------------------------------------
@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    # If avatar_url is just a path, we could convert it to a full URL here if needed,
    # but for now we'll assume the frontend handles conversion or it's a full URL.
    return current_user


# ---------------------------------------------------------------------------
# PATCH /users/me  — Update own profile
# ---------------------------------------------------------------------------
@router.patch("/me", response_model=UserResponse)
async def update_me(
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_in.name is not None:
        current_user.name = user_in.name
    if user_in.phone_number is not None:
        current_user.phone_number = user_in.phone_number
    if user_in.avatar_url is not None:
        current_user.avatar_url = user_in.avatar_url

    await db.commit()
    await db.refresh(current_user)
    
    await log_action(
        db, AuditAction.USER_UPDATED,
        user_id=current_user.user_id,
        details={"method": "self_update"}
    )
    return current_user


# ---------------------------------------------------------------------------
# POST /users/me/avatar  — Upload profile picture
# ---------------------------------------------------------------------------
@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ["image/png", "image/jpeg", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPEG, and WEBP allowed.")

    file_bytes = await file.read()
    extension = file.filename.split(".")[-1] if "." in file.filename else "png"
    object_name = f"{current_user.user_id}/avatar.{extension}"

    try:
        upload_file(settings.MINIO_BUCKET_AVATARS, object_name, file_bytes, file.content_type)
        
        # Construct public URL or use a proxy. For simplicity, we'll try to get a presigned URL.
        # However, for profile pictures usually we want something permanent or a simple proxy.
        # Let's just store the object path and let the frontend use a proxy endpoint if needed,
        # OR we can generate a long-lived presigned URL if it's single-tenant dev.
        # But wait, there is no avatar proxy yet. Let's create one or just use the MinIO direct URL.
        
        url = f"http://localhost:9000/{settings.MINIO_BUCKET_AVATARS}/{object_name}"
        if settings.MINIO_EXTERNAL_HOST:
             url = f"https://{settings.MINIO_EXTERNAL_HOST}/{settings.MINIO_BUCKET_AVATARS}/{object_name}"

        current_user.avatar_url = url
        await db.commit()
        await db.refresh(current_user)
        return current_user
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")


# ---------------------------------------------------------------------------
# GET /users/{user_id}  — Admin only
# ---------------------------------------------------------------------------
@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def get_user_by_id(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ---------------------------------------------------------------------------
# GET /users/  — Admin list all
# ---------------------------------------------------------------------------
@router.get("/", response_model=List[UserResponse], dependencies=[Depends(require_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    stmt = select(User)
    result = await db.execute(stmt)
    return result.scalars().all()


# ---------------------------------------------------------------------------
# PATCH /users/{user_id}/role  — Admin role change (FR-17)
# ---------------------------------------------------------------------------
@router.patch("/{user_id}/role", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def update_user_role(
    user_id: uuid.UUID,
    role_update: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # FR-17: Promoting to Admin requires secondary admin approval
    if role_update.role == Role.Admin and user.role != Role.Admin:
        approver_id = role_update.approver_admin_id if hasattr(role_update, "approver_admin_id") else None
        if approver_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Promoting to Admin requires a secondary admin approver. Provide approver_admin_id.",
            )
        if str(approver_id) == str(current_user.user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The approving admin must be different from the requesting admin.",
            )
        # Verify approver is a valid active admin
        approver_stmt = select(User).where(
            User.user_id == approver_id,
            User.role == Role.Admin,
            User.status == UserStatus.Active,
        )
        approver_result = await db.execute(approver_stmt)
        if approver_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid approver: user not found or not an active admin.",
            )

    old_role = user.role.value
    user.role = role_update.role
    await db.commit()
    await db.refresh(user)

    # Terminate active sessions on role change (FR-17)
    from app.models.session import Session as DBSession
    from sqlalchemy import delete
    await db.execute(delete(DBSession).where(DBSession.user_id == user_id))
    await db.commit()

    await log_action(
        db, AuditAction.USER_ROLE_CHANGED,
        user_id=current_user.user_id,
        details={
            "target_user_id": str(user_id),
            "old_role": old_role,
            "new_role": user.role.value,
        },
    )
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# POST /users/{user_id}/deactivate  — Admin only (FR-26)
# ---------------------------------------------------------------------------
@router.post("/{user_id}/deactivate", response_model=UserResponse, dependencies=[Depends(require_admin)])
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Cannot deactivate own account (FR-26)
    if str(user_id) == str(current_user.user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own account")

    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot deactivate last admin (FR-26)
    if user.role == Role.Admin:
        admin_count_stmt = select(func.count()).select_from(User).where(
            User.role == Role.Admin, User.status == UserStatus.Active
        )
        admin_count = (await db.execute(admin_count_stmt)).scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active admin",
            )

    user.status = UserStatus.Inactive

    # Terminate all active sessions so deactivated user is immediately logged out
    from app.models.session import Session as DBSession
    from sqlalchemy import delete as sa_delete
    await db.execute(sa_delete(DBSession).where(DBSession.user_id == user_id))

    await db.commit()
    await db.refresh(user)

    await log_action(
        db, AuditAction.USER_DEACTIVATED,
        user_id=current_user.user_id,
        details={"target_user_id": str(user_id)},
    )
    await db.refresh(user)
    return user


# ---------------------------------------------------------------------------
# DELETE /users/{user_id}  — Admin only (hard delete, use deactivate when possible)
# ---------------------------------------------------------------------------
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if str(user_id) == str(current_user.user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")

    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting the last active admin
    if user.role == Role.Admin:
        admin_count_stmt = select(func.count()).select_from(User).where(
            User.role == Role.Admin, User.status == UserStatus.Active
        )
        admin_count = (await db.execute(admin_count_stmt)).scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the last active admin",
            )

    await db.delete(user)
    await db.commit()
    return None
