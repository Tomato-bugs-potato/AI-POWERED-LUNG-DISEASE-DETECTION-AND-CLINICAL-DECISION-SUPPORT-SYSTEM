from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    user_id: uuid.UUID
    otp: str

class RefreshRequest(BaseModel):
    # Depending on implementation, refresh token may come from HTTPOnly Cookie
    # If not using HTTP cookie, token goes here:
    pass

class ResendOTPRequest(BaseModel):
    user_id: uuid.UUID
    
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class MessageResponse(BaseModel):
    message: str

class LoginResponse(BaseModel):
    message: str
    user_id: uuid.UUID
