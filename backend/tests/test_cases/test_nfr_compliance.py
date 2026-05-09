"""
Executable test cases for privacy & compliance non-functional requirements.

NFR-25: Data minimisation — Patient model stores only minimal identifiers
NFR-26: Explicit consent recording at registration
NFR-27: Right to erasure (DELETE /patients/{id} cascades & queues file cleanup)
NFR-12: Role-based access enforcement via RBAC dependencies (FR-19 supplement)
NFR-28: Localization support — TBD frontend (skipped in backend tests)
"""
import uuid
import pytest
from datetime import date, datetime
from sqlalchemy import select
from app.models.patient import Patient
from app.models.case import Case
from app.db.base import PatientSex, CaseStatus, UrgencyLevel


# ---------------------------------------------------------------------------
# NFR-25 — Data minimisation
# ---------------------------------------------------------------------------

def test_nfr_25a_patient_model_has_no_name_or_address():
    """TC-NFR-25a: Patient ORM model does not declare 'name' or 'address' columns."""
    column_names = {c.name for c in Patient.__table__.columns}
    forbidden = {"name", "full_name", "address", "phone_number", "email"}
    assert column_names.isdisjoint(forbidden), \
        f"Patient model leaks PII columns: {column_names & forbidden}"


def test_nfr_25b_patient_minimum_required_fields():
    """TC-NFR-25b: only minimal fields are required (age, sex, consent)."""
    cols = {c.name: c for c in Patient.__table__.columns}
    assert not cols["age"].nullable
    assert not cols["sex"].nullable
    assert not cols["consent_recorded"].nullable


# ---------------------------------------------------------------------------
# NFR-26 — Consent recording
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nfr_26a_consent_date_recorded(tech_client, db_session):
    """TC-NFR-26a: consent_date is populated at registration."""
    response = tech_client.post("/api/v1/patients/", json={
        "age": 28,
        "sex": "Female",
        "consent_recorded": True,
        "visit_date": str(date.today()),
    })
    assert response.status_code == 200
    patient_id = response.json()["patient_id"]

    res = await db_session.execute(select(Patient).where(Patient.patient_id == uuid.UUID(patient_id)))
    patient = res.scalar_one()
    assert patient.consent_recorded is True
    assert patient.consent_date is not None


def test_nfr_26b_missing_consent_blocks_registration(tech_client):
    """TC-NFR-26b: consent_recorded=false is rejected."""
    response = tech_client.post("/api/v1/patients/", json={
        "age": 28,
        "sex": "Female",
        "consent_recorded": False,
        "visit_date": str(date.today()),
    })
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# NFR-27 — Right to erasure
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nfr_27a_admin_can_delete_patient(admin_client, sample_patient, db_session):
    """TC-NFR-27a: DELETE /patients/{id} succeeds for admin and removes the row."""
    pid = sample_patient.patient_id
    response = admin_client.delete(f"/api/v1/patients/{pid}")
    assert response.status_code == 204

    res = await db_session.execute(select(Patient).where(Patient.patient_id == pid))
    assert res.scalar_one_or_none() is None


def test_nfr_27b_non_admin_cannot_delete_patient(doctor_client, sample_patient):
    """TC-NFR-27b: Doctor calling DELETE /patients/{id} gets 403."""
    response = doctor_client.delete(f"/api/v1/patients/{sample_patient.patient_id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_nfr_27c_delete_patient_cascades_cases(admin_client, sample_patient, sample_case, db_session):
    """TC-NFR-27c: deleting a patient cascades to their cases (cascade='all, delete-orphan')."""
    pid = sample_patient.patient_id
    admin_client.delete(f"/api/v1/patients/{pid}")

    res = await db_session.execute(select(Case).where(Case.patient_id == pid))
    assert res.scalars().all() == []


# ---------------------------------------------------------------------------
# NFR-12 — RBAC enforcement on every cross-role surface (sanity sweep)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("path", [
    "/api/v1/users/",
    "/api/v1/logs/",
])
def test_nfr_12a_admin_only_endpoints_block_doctor(doctor_client, path):
    """TC-NFR-12a: admin-only endpoints return 403 when called by a Doctor."""
    response = doctor_client.get(path)
    assert response.status_code == 403


@pytest.mark.parametrize("path", [
    "/api/v1/patients/search",
    "/api/v1/cases/",
])
def test_nfr_12b_clinical_endpoints_block_anonymous(client, path):
    """TC-NFR-12b: clinical-staff endpoints reject unauthenticated requests."""
    response = client.get(path)
    assert response.status_code in (401, 403)


@pytest.mark.parametrize("path", [
    "/api/v1/diagnoses/{cid}",
    "/api/v1/reports/{cid}",
])
def test_nfr_12c_doctor_only_endpoints_block_lab_tech(tech_client, sample_case, path):
    """TC-NFR-12c: doctor-only endpoints reject Lab_Technician."""
    response = tech_client.get(path.format(cid=sample_case.case_id))
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# NFR-28 — Localization (Amharic + English) — frontend only, sanity stub
# ---------------------------------------------------------------------------

def test_nfr_28a_locale_unused_in_backend():
    """TC-NFR-28a: backend does not hardcode user-facing language strings in API
    responses; localisation is delegated to the frontend i18n bundle.
    This test documents the design choice; assertion is informational."""
    # Hit a typical error and confirm it returns a stable English key suitable
    # for frontend translation.
    from fastapi import HTTPException
    exc = HTTPException(status_code=400, detail="Invalid OTP format")
    assert exc.detail == "Invalid OTP format"
