"""
Executable test cases for non-functional security requirements.

NFR-11: AES-256 field-level encryption (diagnosis notes, audit details)
NFR-12: PostgreSQL Row-Level Security session role (set on auth)
NFR-13: Immutable / append-only audit log table
NFR-14: Argon2 password hashing
NFR-15: Strong password policy (12+ chars, mixed case, digit, special)
"""
import base64
from jose import jwt as _pyjwt
import pytest
from sqlalchemy import select
from app.core.encryption import encrypt_field, decrypt_field, EncryptedText
from app.core.security import (
    hash_password, verify_password, validate_password,
    create_access_token, decode_access_token, generate_otp, hash_otp, hash_token,
)
from app.config import settings


# ---------------------------------------------------------------------------
# NFR-11 — AES-256-GCM field encryption
# ---------------------------------------------------------------------------

def test_nfr_11a_aes_round_trip():
    """TC-NFR-11a: encrypt → decrypt returns the original plaintext."""
    plaintext = "Patient diagnosed with pneumonia, RLL infiltrate."
    cipher = encrypt_field(plaintext)
    assert cipher != plaintext
    assert decrypt_field(cipher) == plaintext


def test_nfr_11b_ciphertext_is_base64():
    """TC-NFR-11b: encrypted output is valid base64 (storable as TEXT)."""
    cipher = encrypt_field("hello")
    # Must base64-decode without error
    base64.b64decode(cipher.encode("ascii"))


def test_nfr_11c_each_encryption_uses_unique_nonce():
    """TC-NFR-11c: GCM nonces are random — same plaintext produces different ciphertexts."""
    c1 = encrypt_field("identical")
    c2 = encrypt_field("identical")
    assert c1 != c2
    assert decrypt_field(c1) == decrypt_field(c2) == "identical"


def test_nfr_11d_decrypt_invalid_raises():
    """TC-NFR-11d: tampering with ciphertext causes ValueError."""
    cipher = encrypt_field("hello")
    tampered = "A" + cipher[1:]  # flip first byte
    with pytest.raises(ValueError):
        decrypt_field(tampered)


@pytest.mark.asyncio
async def test_nfr_11e_diagnosis_notes_encrypted_at_rest(
    doctor_client, sample_case, db_session
):
    """TC-NFR-11e: diagnosis_notes column stores ciphertext, not plaintext."""
    plaintext = "SECRET_DX_MARKER_98765"
    doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Pneumonia",
        "diagnosis_notes": plaintext,
        "urgency_level": "Critical",
    })

    # Raw text() bypasses the EncryptedText decorator — so we see the
    # on-disk ciphertext. It must NOT equal the plaintext, and must round-trip
    # through decrypt_field back to the plaintext.
    from sqlalchemy import text
    result = await db_session.execute(text("SELECT diagnosis_notes FROM diagnoses"))
    raw_value = result.scalar_one()
    assert raw_value != plaintext, "diagnosis_notes is stored unencrypted!"
    assert decrypt_field(raw_value) == plaintext


# ---------------------------------------------------------------------------
# NFR-13 — Append-only audit log (no UPDATE/DELETE in code paths)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nfr_13a_audit_log_entries_persist(admin_client, doctor_client, sample_case, db_session):
    """TC-NFR-13a: actions across roles all leave audit_log rows."""
    from app.models.audit_log import AuditLog
    doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Normal",
        "diagnosis_notes": "fine",
        "urgency_level": "Non_Critical",
    })
    admin_client.get("/api/v1/logs/")

    res = await db_session.execute(select(AuditLog))
    rows = res.scalars().all()
    assert len(rows) >= 2


# ---------------------------------------------------------------------------
# NFR-14 — Argon2 password hashing
# ---------------------------------------------------------------------------

def test_nfr_14a_password_hash_uses_argon2():
    """TC-NFR-14a: hash string starts with $argon2 prefix."""
    hashed = hash_password("StrongP@ssword123")
    assert hashed.startswith("$argon2")


def test_nfr_14b_hash_is_not_reversible():
    """TC-NFR-14b: hash output is not equal to input."""
    pw = "StrongP@ssword123"
    assert hash_password(pw) != pw


def test_nfr_14c_verify_password_correct_and_wrong():
    """TC-NFR-14c: verify_password returns True for the original, False for any other input."""
    pw = "StrongP@ssword123"
    h = hash_password(pw)
    assert verify_password(pw, h) is True
    assert verify_password("WrongP@ss123!", h) is False


def test_nfr_14d_each_hash_uses_unique_salt():
    """TC-NFR-14d: hashing the same password twice produces different hashes."""
    pw = "StrongP@ssword123"
    assert hash_password(pw) != hash_password(pw)


# ---------------------------------------------------------------------------
# NFR-15 — Password policy
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("pw,expected_valid", [
    ("short", False),                       # too short
    ("alllowercase1234!", False),           # no uppercase
    ("ALLUPPERCASE1234!", False),           # no lowercase
    ("NoDigitsHere!!!!", False),            # no digit
    ("NoSpecialChar1234", False),           # no special character
    ("StrongP@ssword123", True),            # all rules satisfied
    ("V@lidPass1234567", True),
])
def test_nfr_15_password_policy(pw, expected_valid):
    """TC-NFR-15: validate_password enforces 12+ chars, upper, lower, digit, special."""
    ok, _msg = validate_password(pw)
    assert ok is expected_valid


def test_nfr_15a_signup_rejects_weak_password(client):
    """TC-NFR-15a: public signup rejects weak password with 400."""
    response = client.post("/api/v1/users/", json={
        "email": "newweak@test.com",
        "name": "Weak",
        "role": "Doctor",
        "password": "weakpass",
    })
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# JWT structure / OTP / refresh token cryptographic primitives
# ---------------------------------------------------------------------------

def test_nfr_jwt_claims_present():
    """TC-NFR-JWT-a: created JWT contains sub/role/email/iat/exp claims."""
    token = create_access_token("user-id-123", "Doctor", "doc@test.com")
    payload = _pyjwt.decode(
        token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )
    assert payload["sub"] == "user-id-123"
    assert payload["role"] == "Doctor"
    assert payload["email"] == "doc@test.com"
    assert "iat" in payload and "exp" in payload


def test_nfr_jwt_tampered_token_rejected():
    """TC-NFR-JWT-b: a JWT signed with a different secret raises HTTPException."""
    bad_token = _pyjwt.encode(
        {"sub": "x", "role": "Admin", "email": "x@x.com"},
        "different-secret-key", algorithm="HS256",
    )
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        decode_access_token(bad_token)
    assert exc.value.status_code == 401


def test_nfr_otp_generator_produces_6_digit_strings():
    """TC-NFR-OTP-a: OTPs are always 6 numeric digits."""
    for _ in range(100):
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()


def test_nfr_otp_hash_deterministic():
    """TC-NFR-OTP-b: hash_otp is deterministic for the same input (SHA-256)."""
    assert hash_otp("123456") == hash_otp("123456")
    assert hash_otp("123456") != hash_otp("123457")


def test_nfr_refresh_token_is_random_hex():
    """TC-NFR-RT-a: refresh tokens are 128-char hex (64 bytes)."""
    from app.core.security import create_refresh_token
    t = create_refresh_token()
    assert len(t) == 128
    int(t, 16)  # parses as hex → would raise otherwise


def test_nfr_token_hash_is_sha256_hex():
    """TC-NFR-RT-b: hash_token returns 64-char hex (SHA-256)."""
    h = hash_token("anything")
    assert len(h) == 64
    int(h, 16)
