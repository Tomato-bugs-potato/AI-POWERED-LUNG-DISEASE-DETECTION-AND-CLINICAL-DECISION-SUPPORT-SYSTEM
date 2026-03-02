from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.config import settings
import secrets
import hashlib

# Password Hashing
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=12,
)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# JWT Tokens
def create_access_token(user_id: str, role: str, email: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "role": role,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token() -> str:
    """Generate cryptographically random 64-byte token"""
    return secrets.token_hex(64)

def hash_token(token: str) -> str:
    """SHA-256 hash for storage/comparison"""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# OTP Utilities
def generate_otp() -> str:
    """6-digit zero-padded random integer"""
    return f"{secrets.randbelow(1000000):06d}"

def hash_otp(otp: str) -> str:
    """SHA-256 hash for OTP"""
    return hashlib.sha256(otp.encode('utf-8')).hexdigest()
