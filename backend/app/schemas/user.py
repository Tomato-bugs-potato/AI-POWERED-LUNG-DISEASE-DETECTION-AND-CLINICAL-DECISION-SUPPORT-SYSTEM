from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid
from app.db.base import Role, UserStatus

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: Role
    hospital_id: Optional[uuid.UUID] = None
    phone_number: Optional[str] = None

class UserCreate(UserBase):
    password: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None

class UserResponse(UserBase):
    user_id: uuid.UUID
    status: UserStatus
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: Role
