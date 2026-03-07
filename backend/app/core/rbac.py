from fastapi import Depends, HTTPException, status
from typing import Callable, Any
from app.db.base import Role
from app.dependencies import get_current_user
from app.models.user import User

def require_roles(*allowed_roles: Role) -> Callable:
    """
    Factory function returns a FastAPI dependency that checks if the current user
    has one of the allowed roles.
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to perform this action"
            )
        return current_user
    return role_checker

# Role-specific dependency shortcuts
require_radiologist = require_roles(Role.Lab_Technician, Role.Radiologist)
require_doctor = require_roles(Role.Doctor)
require_admin = require_roles(Role.Admin)
require_authenticated = require_roles(*list(Role))  # Any valid role
