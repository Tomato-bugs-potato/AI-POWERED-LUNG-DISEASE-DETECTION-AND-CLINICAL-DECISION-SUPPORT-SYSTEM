"""
Executable test cases for FR-23 through FR-25.

FR-23: Patient registration with explicit consent
FR-24: Case-to-case linking (follow-ups, repeats)
FR-25: Patient search (by ID / symptoms / demographics)
"""
import uuid
import pytest
from datetime import date
from sqlalchemy import select
from app.models.case import Case
from app.models.patient import Patient
from app.db.base import CaseStatus, UrgencyLevel


# ---------------------------------------------------------------------------
# FR-23 — Patient registration
# ---------------------------------------------------------------------------

def test_fr_23a_register_patient_with_consent(tech_client):
    """TC-FR-23a: a Lab Technician can register a patient when consent is recorded."""
    response = tech_client.post("/api/v1/patients/", json={
        "age": 33,
        "sex": "Female",
        "consent_recorded": True,
        "visit_date": str(date.today()),
        "symptoms": "persistent cough",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["age"] == 33
    assert body["sex"] == "Female"
    assert body["consent_recorded"] is True


def test_fr_23b_register_patient_without_consent_rejected(tech_client):
    """TC-FR-23b: registration without consent returns 400."""
    response = tech_client.post("/api/v1/patients/", json={
        "age": 33,
        "sex": "Female",
        "consent_recorded": False,
        "visit_date": str(date.today()),
    })
    assert response.status_code == 400
    assert "consent" in response.json()["detail"].lower()


def test_fr_23c_admin_cannot_register_patient(admin_client):
    """TC-FR-23c: Admin is not in the clinical-staff allowlist."""
    response = admin_client.post("/api/v1/patients/", json={
        "age": 33,
        "sex": "Male",
        "consent_recorded": True,
        "visit_date": str(date.today()),
    })
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# FR-24 — Case linking
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_24a_create_case_linked_to_existing(tech_client, sample_patient, sample_case, db_session):
    """TC-FR-24a: a follow-up Case can reference an earlier case_id via linked_case_id."""
    response = tech_client.post("/api/v1/cases/", json={
        "patient_id": str(sample_patient.patient_id),
        "visit_date": str(date.today()),
        "linked_case_id": str(sample_case.case_id),
    })
    assert response.status_code == 200
    body = response.json()
    assert body["linked_case_id"] == str(sample_case.case_id)

    # Verify persistence
    res = await db_session.execute(select(Case).where(Case.case_id == uuid.UUID(body["case_id"])))
    case = res.scalar_one()
    assert case.linked_case_id == sample_case.case_id


def test_fr_24b_create_case_for_unknown_patient_returns_404(tech_client):
    """TC-FR-24b: linking a case to a non-existent patient returns 404."""
    response = tech_client.post("/api/v1/cases/", json={
        "patient_id": str(uuid.uuid4()),
        "visit_date": str(date.today()),
    })
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# FR-25 — Patient search
# ---------------------------------------------------------------------------

def test_fr_25a_search_by_patient_id_prefix(tech_client, sample_patient):
    """TC-FR-25a: searching by patient_id prefix returns the patient."""
    prefix = str(sample_patient.patient_id)[:8]
    response = tech_client.get(f"/api/v1/patients/search?patient_id={prefix}")
    assert response.status_code == 200
    results = response.json()
    assert any(p["patient_id"] == str(sample_patient.patient_id) for p in results)


def test_fr_25b_search_by_age_range(tech_client, sample_patient):
    """TC-FR-25b: search filters by min_age/max_age inclusive."""
    response = tech_client.get("/api/v1/patients/search?min_age=40&max_age=50")
    assert response.status_code == 200
    results = response.json()
    assert all(40 <= p["age"] <= 50 for p in results)


def test_fr_25c_search_by_sex(tech_client, sample_patient):
    """TC-FR-25c: search filters by sex."""
    response = tech_client.get("/api/v1/patients/search?sex=Male")
    assert response.status_code == 200
    assert all(p["sex"] == "Male" for p in response.json())


def test_fr_25d_search_by_symptom_substring(tech_client, sample_patient):
    """TC-FR-25d: symptoms filter does a case-insensitive substring match."""
    response = tech_client.get("/api/v1/patients/search?symptoms=cough")
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1


def test_fr_25e_pagination_clamped(tech_client):
    """TC-FR-25e: limit > 100 is rejected with 422."""
    response = tech_client.get("/api/v1/patients/search?limit=500")
    assert response.status_code == 422


def test_fr_25f_csv_export(tech_client, sample_patient):
    """TC-FR-25f: /patients/search/export/csv returns CSV."""
    response = tech_client.get("/api/v1/patients/search/export/csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    text = response.text
    assert "Patient ID" in text  # header row


def test_fr_25g_anonymous_cannot_search(client):
    """TC-FR-25g: unauthenticated user gets 401/403 on /patients/search."""
    response = client.get("/api/v1/patients/search")
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Critical-case priority sorting (workflow check)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_cases_list_critical_first(rad_client, sample_patient, db_session, seeded_users):
    """TC-FR-list-priority: critical cases appear before non-critical in /cases."""
    # Seed two cases — one critical, one not
    normal = Case(
        patient_id=sample_patient.patient_id,
        upload_tech_id=seeded_users["lab_technician"].user_id,
        visit_date=date.today(),
        status=CaseStatus.Pending_Review,
        priority=UrgencyLevel.Non_Critical,
    )
    critical = Case(
        patient_id=sample_patient.patient_id,
        upload_tech_id=seeded_users["lab_technician"].user_id,
        visit_date=date.today(),
        status=CaseStatus.Pending_Review,
        priority=UrgencyLevel.Critical,
    )
    db_session.add_all([normal, critical])
    await db_session.commit()

    response = rad_client.get("/api/v1/cases/")
    assert response.status_code == 200
    cases = response.json()
    # First entry should be the critical one
    first = cases[0]
    assert first["priority"] == "Critical"
