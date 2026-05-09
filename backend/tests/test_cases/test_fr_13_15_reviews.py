"""
Executable test cases for FR-13 through FR-15.

FR-13: Radiologist views AI predictions for a case
FR-14: Radiologist edits annotations (add/remove boxes); change history is logged
FR-15: Radiologist adjusts confidence threshold; only matching detections shown
"""
import uuid
import pytest
from sqlalchemy import select
from app.db.base import AuditAction, CaseStatus
from app.models.audit_log import AuditLog
from app.models.radiologist_review import RadiologistReview


# ---------------------------------------------------------------------------
# FR-13 — Radiologist can fetch review for a case
# ---------------------------------------------------------------------------

def test_fr_13a_get_review_empty_initially(rad_client, sample_case):
    """TC-FR-13a: GET /reviews/{case_id} returns null/empty before any review is saved."""
    response = rad_client.get(f"/api/v1/reviews/{sample_case.case_id}")
    assert response.status_code == 200
    assert response.json() in (None, {})


def test_fr_13b_doctor_can_view_review(doctor_client, rad_client, sample_case):
    """TC-FR-13b: Doctor can also fetch the review (shared rad/doctor RBAC)."""
    rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": [{"x": 1, "y": 2, "w": 30, "h": 40, "label": "Pneumonia"}]},
        "notes": "Visible infiltrate",
        "confidence_threshold_applied": 50,
    })
    response = doctor_client.get(f"/api/v1/reviews/{sample_case.case_id}")
    assert response.status_code == 200
    assert response.json()["notes"] == "Visible infiltrate"


# ---------------------------------------------------------------------------
# FR-14 — Edits + history
# ---------------------------------------------------------------------------

def test_fr_14a_radiologist_creates_annotation(rad_client, sample_case):
    """TC-FR-14a: a radiologist saves bounding-box annotations."""
    payload = {
        "annotations": {"boxes": [{"x": 10, "y": 20, "w": 100, "h": 120, "label": "Pneumonia"}]},
        "notes": "Initial review",
    }
    response = rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["annotations"]["boxes"][0]["label"] == "Pneumonia"


def test_fr_14b_radiologist_edits_annotation(rad_client, sample_case):
    """TC-FR-14b: a second POST updates the existing review (idempotent upsert)."""
    rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "notes": "v1",
    })
    response = rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": [{"x": 0, "y": 0, "w": 1, "h": 1, "label": "Tuberculosis"}]},
        "notes": "v2",
    })
    assert response.status_code == 200
    assert response.json()["notes"] == "v2"
    assert len(response.json()["annotations"]["boxes"]) == 1


@pytest.mark.asyncio
async def test_fr_14c_edit_history_logged_to_audit_log(rad_client, sample_case, db_session):
    """TC-FR-14c: annotation edits write an ANNOTATION_EDITED audit row."""
    # First save creates the review (REVIEW_SAVED)
    rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "notes": "v1",
    })
    # Second save edits it (ANNOTATION_EDITED)
    rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": [{"x": 1, "y": 1, "w": 1, "h": 1, "label": "x"}]},
        "notes": "v2",
    })

    res = await db_session.execute(
        select(AuditLog).where(AuditLog.case_id == sample_case.case_id)
    )
    actions = {row.action_type for row in res.scalars().all()}
    assert AuditAction.REVIEW_SAVED in actions
    assert AuditAction.ANNOTATION_EDITED in actions


def test_fr_14d_non_radiologist_cannot_edit(doctor_client, sample_case):
    """TC-FR-14d: a Doctor cannot create or edit a radiologist review."""
    response = doctor_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "notes": "should fail",
    })
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# FR-15 — Confidence threshold
# ---------------------------------------------------------------------------

def test_fr_15a_confidence_threshold_persisted(rad_client, sample_case):
    """TC-FR-15a: the confidence_threshold_applied value is saved on the review."""
    response = rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "notes": "threshold check",
        "confidence_threshold_applied": 80,
    })
    assert response.status_code == 200
    assert response.json()["confidence_threshold_applied"] == 80


def test_fr_15b_threshold_can_be_changed(rad_client, sample_case):
    """TC-FR-15b: changing the threshold on a subsequent save is reflected."""
    rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "confidence_threshold_applied": 50,
    })
    response = rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "confidence_threshold_applied": 80,
    })
    assert response.json()["confidence_threshold_applied"] == 80


# ---------------------------------------------------------------------------
# Workflow: send review to doctor (transitions case status)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_review_send_advances_case_status(rad_client, sample_case, db_session):
    """TC-FR-13c: /reviews/{case_id}/send moves the case to Ready_for_Diagnosis."""
    rad_client.post(f"/api/v1/reviews/{sample_case.case_id}", json={
        "annotations": {"boxes": []},
        "notes": "ready",
    })
    response = rad_client.post(f"/api/v1/reviews/{sample_case.case_id}/send")
    assert response.status_code == 200

    # Confirm via the API rather than the ORM session, which is held open across the request.
    cases = rad_client.get("/api/v1/cases/").json()
    target = next(c for c in cases if c["case_id"] == str(sample_case.case_id))
    assert target["status"] == CaseStatus.Ready_for_Diagnosis.value
