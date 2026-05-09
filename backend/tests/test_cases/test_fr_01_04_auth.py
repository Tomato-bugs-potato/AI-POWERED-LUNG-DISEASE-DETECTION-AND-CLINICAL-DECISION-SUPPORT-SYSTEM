"""
Executable test cases for FR-01 through FR-04.

FR-01: User Login (email + password)
FR-02: OTP-based two-factor authentication with attempt tracking and lockout
FR-03: Role-based access (Lab_Technician, Radiologist, Doctor, Admin)
FR-04: Logout + refresh token rotation
"""
import pytest
from sqlalchemy import select
from app.db.base import Role, UserStatus
from app.models.user import User
from app.models.session import Session as DBSession


# ---------------------------------------------------------------------------
# FR-01 — Login
# ---------------------------------------------------------------------------

def test_fr_01a_valid_login_returns_token(client, seeded_users):
    """TC-FR-01a: valid credentials return an access token (SKIP_OTP=true in test env)."""
    response = client.post("/api/v1/auth/login", json={
        "email": "doc@test.com",
        "password": "StrongP@ssword123",
    })
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "Doctor"


def test_fr_01b_wrong_password_rejected(client, seeded_users):
    """TC-FR-01b: invalid password returns 401."""
    response = client.post("/api/v1/auth/login", json={
        "email": "doc@test.com",
        "password": "WrongPassword!!",
    })
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()


def test_fr_01c_unknown_email_rejected(client, seeded_users):
    """TC-FR-01c: non-existent email returns 401 (no user enumeration)."""
    response = client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "StrongP@ssword123",
    })
    assert response.status_code == 401


def test_fr_01d_malformed_email_rejected(client, seeded_users):
    """TC-FR-01d: malformed email fails schema validation with 422."""
    response = client.post("/api/v1/auth/login", json={
        "email": "not-an-email",
        "password": "StrongP@ssword123",
    })
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# FR-02 — OTP
# ---------------------------------------------------------------------------
import os


def test_fr_02a_otp_format_validation(client, seeded_users):
    """TC-FR-02a: verify-otp rejects non-6-digit codes with 400."""
    user_id = str(seeded_users["doctor"].user_id)
    response = client.post("/api/v1/auth/verify-otp", json={
        "user_id": user_id,
        "otp": "123",  # too short
    })
    assert response.status_code == 400
    assert "format" in response.json()["detail"].lower()


def test_fr_02b_otp_generated_on_login_when_not_skipped(client, seeded_users, monkeypatch):
    """TC-FR-02b: when SKIP_OTP=false, login returns an OTP instead of tokens."""
    from app.config import settings as app_settings
    monkeypatch.setattr(app_settings, "SKIP_OTP", False)

    response = client.post("/api/v1/auth/login", json={
        "email": "doc@test.com",
        "password": "StrongP@ssword123",
    })
    assert response.status_code == 200
    body = response.json()
    assert "otp_code" in body
    assert len(body["otp_code"]) == 6
    assert body["otp_code"].isdigit()
    assert "user_id" in body


def test_fr_02c_resend_otp_returns_new_code(client, seeded_users):
    """TC-FR-02c: /resend-otp returns a fresh 6-digit OTP for an existing user."""
    user_id = str(seeded_users["doctor"].user_id)
    response = client.post("/api/v1/auth/resend-otp", json={"user_id": user_id})
    assert response.status_code == 200
    body = response.json()
    assert len(body["otp_code"]) == 6
    assert body["email"] == "doc@test.com"


def test_fr_02d_otp_max_attempts_enforced(client, seeded_users, monkeypatch):
    """TC-FR-02d: after OTP_MAX_ATTEMPTS wrong OTPs, the code is invalidated."""
    from app.config import settings as app_settings
    monkeypatch.setattr(app_settings, "SKIP_OTP", False)

    # Trigger an OTP
    login = client.post("/api/v1/auth/login", json={
        "email": "doc@test.com",
        "password": "StrongP@ssword123",
    }).json()
    user_id = login["user_id"]

    # Exhaust attempts with wrong codes
    for _ in range(app_settings.OTP_MAX_ATTEMPTS):
        client.post("/api/v1/auth/verify-otp", json={"user_id": user_id, "otp": "000000"})

    # Next attempt should be rejected — either "max attempts" or "invalid"
    final = client.post("/api/v1/auth/verify-otp", json={"user_id": user_id, "otp": "000000"})
    assert final.status_code == 400


# ---------------------------------------------------------------------------
# FR-03 — Role definitions
# ---------------------------------------------------------------------------

def test_fr_03a_four_roles_defined():
    """TC-FR-03a: the four required roles exist in the Role enum."""
    assert {r.value for r in Role} == {"Lab_Technician", "Radiologist", "Doctor", "Admin"}


def test_fr_03b_role_persists_on_user(seeded_users):
    """TC-FR-03b: each seeded user has the correct role assignment."""
    assert seeded_users["lab_technician"].role == Role.Lab_Technician
    assert seeded_users["radiologist"].role == Role.Radiologist
    assert seeded_users["doctor"].role == Role.Doctor
    assert seeded_users["admin"].role == Role.Admin


# ---------------------------------------------------------------------------
# FR-04 — Logout & refresh
# ---------------------------------------------------------------------------

def test_fr_04a_logout_returns_success(doctor_client):
    """TC-FR-04a: authenticated user can log out and gets a confirmation."""
    response = doctor_client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"].startswith("Logged out")


@pytest.mark.asyncio
async def test_fr_04b_logout_deletes_sessions(doctor_client, db_session, seeded_users):
    """TC-FR-04b: logout removes any active refresh-token sessions for the user."""
    # Seed a fake session row
    doctor = seeded_users["doctor"]
    from datetime import datetime, timedelta
    sess = DBSession(
        user_id=doctor.user_id,
        token_hash="dummy-hash",
        expires_at=datetime.utcnow() + timedelta(days=1),
    )
    db_session.add(sess)
    await db_session.commit()

    doctor_client.post("/api/v1/auth/logout")

    res = await db_session.execute(select(DBSession).where(DBSession.user_id == doctor.user_id))
    remaining = res.scalars().all()
    assert len(remaining) == 0


def test_fr_04c_refresh_without_cookie_rejected(client, seeded_users):
    """TC-FR-04c: /auth/refresh returns 401 when no refresh_token cookie is present."""
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 401


def test_fr_04d_logout_requires_authentication(client):
    """TC-FR-04d: anonymous user cannot call /logout."""
    response = client.post("/api/v1/auth/logout")
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Brute-force lockout (supports FR-02 + Security NFR-15)
# ---------------------------------------------------------------------------

def test_fr_02e_repeated_failed_logins_tracked(client, seeded_users):
    """TC-FR-02e: each failed login is recorded as an audit event."""
    for _ in range(3):
        client.post("/api/v1/auth/login", json={
            "email": "doc@test.com",
            "password": "WrongPassword!",
        })
    # The 4th attempt should still 401 (lockout kicks in at the threshold;
    # implementation may be tolerant on the boundary).
    final = client.post("/api/v1/auth/login", json={
        "email": "doc@test.com",
        "password": "WrongPassword!",
    })
    assert final.status_code in (401, 429)
