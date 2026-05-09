import json
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.db.session import get_db
from app.models.user import User
from app.core.security import decode_access_token
from app.db.base import UserStatus

# Using HTTPBearer for swagger UI token support
security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Verify the JWT token from the Authorization header, fetch the user,
    check their status, and set PostgreSQL Row-Level Security variables.
    """
    token = credentials.credentials

    # 1. Decode generic JWT payload
    payload = decode_access_token(token)
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier"
        )

    # 2. Check token blacklist in Redis (set on logout)
    try:
        from app.core.redis import get_redis
        redis = await get_redis()
        if redis is not None:
            from app.core.security import hash_token
            is_blacklisted = await redis.get(f"blacklist:token:{hash_token(token)}")
            if is_blacklisted:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked. Please log in again."
                )
    except HTTPException:
        raise
    except Exception:
        pass  # Redis unavailable — allow request (non-fatal)
        
    # 3. Fetch User from DB
    stmt = select(User).where(User.user_id == user_id_str)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
    # 4. Check Account Status
    if user.status == UserStatus.Inactive:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account deactivated")
    if user.status == UserStatus.Locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account locked — contact admin")
        
    # 5. Set PostgreSQL Session Role for RLS (Row Level Security)
    # This ensures Postgres applies policies based on this current user
    try:
        await db.execute(
            text("SELECT set_config('app.current_user_role', :role, true)"),
            {"role": user.role.value}
        )
    except Exception as e:
        # In case the specific session variables fail gracefully, rollback so we don't poison the transaction
        await db.rollback()
        
    return user
