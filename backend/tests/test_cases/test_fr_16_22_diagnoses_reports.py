"""
Executable test cases for FR-16 through FR-22.

FR-16: Doctor submits final diagnosis with urgency level
FR-17: Admin role promotion requires secondary admin approval
FR-18: Doctor saves diagnosis draft (autosave)
FR-19: Admins cannot access or approve diagnosis data
FR-20: Doctor downloads PDF report
FR-21: Report contains required sections (patient, AI findings, diagnosis, etc.)
FR-22: Doctor lists / filters historical reports
"""
import uuid
import pytest
from sqlalchemy import select
from app.db.base import (
    Role, AuditAction, CaseStatus, PrimaryDiagnosis, UrgencyLevel, UserStatus
)
from app.models.diagnosis import Diagnosis
from app.models.user import User
from app.models.report import Report


# ---------------------------------------------------------------------------
# FR-16 — Final diagnosis submission
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_16a_doctor_submits_diagnosis(doctor_client, sample_case, db_session):
    """TC-FR-16a: a Doctor can submit a primary diagnosis with urgency Critical."""
    response = doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Pneumonia",
        "diagnosis_notes": "Right lower lobe consolidation.",
        "urgency_level": "Critical",
        "treatment_recommendations": "IV antibiotics, follow-up CXR in 48h",
    })
    assert response.status_code == 200
    body = response.json()
    assert body["primary_diagnosis"] == "Pneumonia"
    assert body["urgency_level"] == "Critical"

    # Case status flips to Diagnosed — verify via the API to avoid cross-session caching.
    cases = doctor_client.get("/api/v1/cases/").json()
    target = next(c for c in cases if c["case_id"] == str(sample_case.case_id))
    assert target["status"] == CaseStatus.Diagnosed.value


def test_fr_16b_radiologist_cannot_submit_diagnosis(rad_client, sample_case):
    """TC-FR-16b: a Radiologist gets 403 when trying to submit a diagnosis."""
    response = rad_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Pneumonia",
        "diagnosis_notes": "n/a",
        "urgency_level": "Non_Critical",
    })
    assert response.status_code == 403


def test_fr_16c_lab_tech_cannot_submit_diagnosis(tech_client, sample_case):
    """TC-FR-16c: a Lab Technician gets 403."""
    response = tech_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Normal",
        "diagnosis_notes": "n/a",
        "urgency_level": "Non_Critical",
    })
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# FR-17 — Admin promotion requires secondary admin approval
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_17a_promote_to_admin_requires_approver(admin_client, seeded_users):
    """TC-FR-17a: PATCH /users/{id}/role to Admin without approver_admin_id is rejected."""
    target = seeded_users["doctor"].user_id
    response = admin_client.patch(f"/api/v1/users/{target}/role", json={
        "role": "Admin",
    })
    assert response.status_code == 400
    assert "approver" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_fr_17b_promote_to_admin_rejects_self_approval(admin_client, seeded_users):
    """TC-FR-17b: the approver_admin_id cannot equal the requesting admin."""
    target = seeded_users["doctor"].user_id
    requester = seeded_users["admin"].user_id
    response = admin_client.patch(f"/api/v1/users/{target}/role", json={
        "role": "Admin",
        "approver_admin_id": str(requester),
    })
    assert response.status_code == 400
    assert "different from" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_fr_17c_promote_to_admin_with_valid_approver(admin_client, db_session, seeded_users):
    """TC-FR-17c: with a different, active admin approver, the promotion succeeds."""
    # Seed a second admin
    from app.core.security import hash_password
    second_admin = User(
        email="admin2@test.com",
        password_hash=hash_password("StrongP@ssword123"),
        name="Second Admin",
        role=Role.Admin,
        status=UserStatus.Active,
    )
    db_session.add(second_admin)
    await db_session.commit()
    await db_session.refresh(second_admin)

    target = seeded_users["doctor"].user_id
    response = admin_client.patch(f"/api/v1/users/{target}/role", json={
        "role": "Admin",
        "approver_admin_id": str(second_admin.user_id),
    })
    assert response.status_code == 200
    assert response.json()["role"] == "Admin"


# ---------------------------------------------------------------------------
# FR-18 — Diagnosis draft (autosave)
# ---------------------------------------------------------------------------

def test_fr_18a_doctor_saves_draft(doctor_client, sample_case):
    """TC-FR-18a: /diagnoses/{case_id}/draft saves a partial diagnosis with all fields."""
    response = doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}/draft", json={
        "primary_diagnosis": "Pneumonia",
        "diagnosis_notes": "Patient stable, need follow-up imaging.",
        "urgency_level": "Non_Critical",
    })
    assert response.status_code == 200


def test_fr_18b_draft_update_overwrites_notes(doctor_client, sample_case):
    """TC-FR-18b: subsequent draft POSTs update the same draft (autosave)."""
    doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}/draft", json={
        "primary_diagnosis": "Pneumonia",
        "diagnosis_notes": "v1 draft",
        "urgency_level": "Non_Critical",
    })
    response = doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}/draft", json={
        "diagnosis_notes": "v2 draft",
    })
    assert response.status_code == 200
    assert response.json()["diagnosis_notes"] == "v2 draft"


# ---------------------------------------------------------------------------
# FR-19 — Admins cannot access diagnosis data
# ---------------------------------------------------------------------------

def test_fr_19a_admin_blocked_from_submitting_diagnosis(admin_client, sample_case):
    """TC-FR-19a: an Admin attempting to submit a diagnosis is rejected."""
    response = admin_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Normal",
        "diagnosis_notes": "should not work",
        "urgency_level": "Non_Critical",
    })
    # require_doctor wraps this — admin is not in the allowed roles, so 403
    assert response.status_code == 403


def test_fr_19b_admin_blocked_from_reading_diagnosis(admin_client, doctor_client, sample_case):
    """TC-FR-19b: Admin cannot GET an existing diagnosis."""
    doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Normal",
        "diagnosis_notes": "ok",
        "urgency_level": "Non_Critical",
    })
    response = admin_client.get(f"/api/v1/diagnoses/{sample_case.case_id}")
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# FR-20 — PDF report download
# ---------------------------------------------------------------------------

def test_fr_20a_get_report_without_diagnosis_404(doctor_client, sample_case):
    """TC-FR-20a: requesting a report for a case with no report row returns 404."""
    response = doctor_client.get(f"/api/v1/reports/{sample_case.case_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_fr_20b_report_retrievable_after_seeded(doctor_client, sample_case, db_session, seeded_users):
    """TC-FR-20b: with a Report row in the DB, GET /reports/{case_id} returns it."""
    # Seed a report row directly — the actual PDF generation is via Celery
    rpt = Report(
        case_id=sample_case.case_id,
        generated_by=seeded_users["doctor"].user_id,
        pdf_url="reports/test.pdf",
        file_size_bytes=1024,
        cached=False,
    )
    db_session.add(rpt)
    await db_session.commit()

    response = doctor_client.get(f"/api/v1/reports/{sample_case.case_id}")
    assert response.status_code == 200
    assert "pdf_url" in response.json()


def test_fr_20c_report_status_endpoint(doctor_client, sample_case):
    """TC-FR-20c: /reports/{case_id}/status returns 'none' when nothing's generated."""
    response = doctor_client.get(f"/api/v1/reports/{sample_case.case_id}/status")
    assert response.status_code == 200
    assert response.json()["status"] == "none"


def test_fr_20d_report_regenerate_enqueued(doctor_client, sample_case):
    """TC-FR-20d: /reports/{case_id}/regenerate returns 202 Accepted (work enqueued)."""
    response = doctor_client.post(f"/api/v1/reports/{sample_case.case_id}/regenerate")
    assert response.status_code == 202


# ---------------------------------------------------------------------------
# FR-21 — Report sections present in response
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_21a_report_response_includes_all_sections(
    doctor_client, rad_client, tech_client, sample_case, db_session, seeded_users
):
    """TC-FR-21a: a fully-populated case yields a report with patient/doctor/radiologist/ai_inference sections."""
    # Build the full chain: image → radiologist_review → diagnosis → report
    import io
    PNG_HEADER = bytes.fromhex("89504e470d0a1a0a")
    tech_client.post(
        "/api/v1/images/upload",
        files={"file": ("x.png", io.BytesIO(PNG_HEADER + b"fr21"), "image/png")},
        data={"case_id": str(sample_case.case_id)},
    )

    rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "notes": "Findings: visible infiltrate",
    })

    doctor_client.post(f"/api/v1/diagnoses/{sample_case.case_id}", json={
        "primary_diagnosis": "Pneumonia",
        "diagnosis_notes": "Confirmed pneumonia",
        "urgency_level": "Critical",
    })

    rpt = Report(
        case_id=sample_case.case_id,
        generated_by=seeded_users["doctor"].user_id,
        pdf_url="reports/fr21.pdf",
        cached=False,
    )
    db_session.add(rpt)
    await db_session.commit()

    response = doctor_client.get(f"/api/v1/reports/{sample_case.case_id}")
    assert response.status_code == 200
    body = response.json()

    assert body["patient"] is not None
    assert body["doctor"] is not None
    assert body["radiologist"] is not None
    assert body["ai_inference"] is not None
    assert body["final_diagnosis"] == "Pneumonia"


# ---------------------------------------------------------------------------
# FR-22 — Past report listing + filtering
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_22a_list_reports_empty(doctor_client):
    """TC-FR-22a: a doctor with no reports gets an empty list."""
    response = doctor_client.get("/api/v1/reports/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_fr_22b_list_reports_returns_doctors_own(
    doctor_client, db_session, seeded_users, sample_case
):
    """TC-FR-22b: list endpoint returns reports authored by the calling doctor."""
    rpt = Report(
        case_id=sample_case.case_id,
        generated_by=seeded_users["doctor"].user_id,
        pdf_url="reports/fr22.pdf",
        cached=False,
    )
    db_session.add(rpt)
    await db_session.commit()

    response = doctor_client.get("/api/v1/reports/")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_fr_22c_csv_export_returns_csv(doctor_client):
    """TC-FR-22c: CSV export endpoint returns text/csv content."""
    response = doctor_client.get("/api/v1/reports/export/csv")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")


def test_fr_22d_pagination_limit_bounded(doctor_client):
    """TC-FR-22d: limit > 100 is clamped (FastAPI Query validation)."""
    response = doctor_client.get("/api/v1/reports/?limit=500")
    assert response.status_code == 422  # le=100 enforced
