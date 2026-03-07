import pytest
from app.core.security import hash_password, verify_password, generate_otp

def test_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword123!", hashed) is False

def test_otp_generation():
    otp1 = generate_otp()
    otp2 = generate_otp()
    
    assert len(otp1) == 6
    assert isinstance(int(otp1), int)
    assert otp1 != otp2 # extremely astronomically unlikely
