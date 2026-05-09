"""Smoke tests to verify the conftest fixtures work end-to-end."""
import pytest


def test_health_endpoint(client):
    """Sanity: the FastAPI app boots and /health/ responds 200."""
    response = client.get("/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_seeded_users_created(seeded_users):
    """Sanity: the seeded_users fixture creates one user per role."""
    assert set(seeded_users.keys()) == {"lab_technician", "radiologist", "doctor", "admin"}
    assert all(u.user_id is not None for u in seeded_users.values())


def test_doctor_client_authenticated(doctor_client):
    """Sanity: an authenticated client can hit /users/me."""
    response = doctor_client.get("/api/v1/users/me")
    assert response.status_code == 200
    assert response.json()["role"] == "Doctor"
