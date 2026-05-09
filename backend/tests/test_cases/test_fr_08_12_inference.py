"""
Executable test cases for FR-08 through FR-12.

FR-08: Image preprocessing (resize, normalize, CLAHE) before inference
FR-09: YOLOX detection of Pneumonia / Tuberculosis / Lung Tumor with bounding boxes
FR-10: Bounding box overlay structure (coords + label)
FR-11: Per-detection confidence score (0–1)
FR-12: Inference results persisted and retrievable via API
"""
import io
import uuid
import pytest
from sqlalchemy import select
from app.models.image import Image
from app.models.inference_result import InferenceResult


def _upload_one(client, case_id, payload: bytes = b"fr-inf-payload"):
    PNG_HEADER = bytes.fromhex("89504e470d0a1a0a")
    return client.post(
        "/api/v1/images/upload",
        files={"file": ("x.png", io.BytesIO(PNG_HEADER + payload), "image/png")},
        data={"case_id": str(case_id)},
    )


# ---------------------------------------------------------------------------
# FR-08 — Preprocessing pipeline runs without error on supported formats
# ---------------------------------------------------------------------------

def test_fr_08a_upload_triggers_ai_pipeline(tech_client, sample_case):
    """TC-FR-08a: uploading an image returns a queued/processed image_id without raising preprocess errors."""
    response = _upload_one(tech_client, sample_case.case_id, b"fr08a-bytes")
    assert response.status_code == 200
    assert response.json()["image_id"]


@pytest.mark.asyncio
async def test_fr_08b_inference_result_stored_after_upload(
    tech_client, sample_case, db_session, rad_client
):
    """TC-FR-08b: the mocked AI service result is persisted to InferenceResult."""
    body = _upload_one(tech_client, sample_case.case_id, b"fr08b-bytes").json()
    image_id = body["image_id"]

    res = await db_session.execute(select(InferenceResult).where(InferenceResult.image_id == image_id))
    inference = res.scalar_one_or_none()
    assert inference is not None
    assert inference.model_version  # set by fake AI service in conftest


# ---------------------------------------------------------------------------
# FR-09 — Detection produces disease class + bounding box
# ---------------------------------------------------------------------------

def test_fr_09a_inference_endpoint_returns_predictions(tech_client, rad_client, sample_case):
    """TC-FR-09a: GET /inference/{image_id}/result returns predictions with disease_class."""
    body = _upload_one(tech_client, sample_case.case_id, b"fr09a-bytes").json()
    image_id = body["image_id"]

    response = rad_client.get(f"/api/v1/inference/{image_id}/result")
    assert response.status_code == 200
    data = response.json()
    assert data["predictions"], "predictions should not be empty"
    first = data["predictions"][0]
    assert "disease_class" in first
    assert first["disease_class"] in ("Pneumonia", "Tuberculosis", "Lung Tumor")


def test_fr_09b_inference_unknown_image_404(rad_client):
    """TC-FR-09b: querying an unknown image returns 404."""
    response = rad_client.get(f"/api/v1/inference/{uuid.uuid4()}/result")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# FR-10 — Bounding box structure
# ---------------------------------------------------------------------------

def test_fr_10a_bounding_box_has_xywh(tech_client, rad_client, sample_case):
    """TC-FR-10a: each prediction includes a bounding_box with x, y, w, h."""
    body = _upload_one(tech_client, sample_case.case_id, b"fr10a-bytes").json()
    image_id = body["image_id"]

    data = rad_client.get(f"/api/v1/inference/{image_id}/result").json()
    box = data["predictions"][0]["bounding_box"]
    assert {"x", "y", "w", "h"}.issubset(box.keys())
    for k in ("x", "y", "w", "h"):
        assert isinstance(box[k], (int, float))


# ---------------------------------------------------------------------------
# FR-11 — Confidence scores
# ---------------------------------------------------------------------------

def test_fr_11a_confidence_score_in_unit_range(tech_client, rad_client, sample_case):
    """TC-FR-11a: confidence_score for each prediction is between 0 and 1 inclusive."""
    body = _upload_one(tech_client, sample_case.case_id, b"fr11a-bytes").json()
    image_id = body["image_id"]

    data = rad_client.get(f"/api/v1/inference/{image_id}/result").json()
    for p in data["predictions"]:
        assert 0.0 <= p["confidence_score"] <= 1.0


# ---------------------------------------------------------------------------
# FR-12 — Persistence + retrieval
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_fr_12a_inference_records_persist_across_session(
    tech_client, sample_case, db_session
):
    """TC-FR-12a: every uploaded image yields a stored InferenceResult row."""
    for i in range(3):
        _upload_one(tech_client, sample_case.case_id, f"fr12a-{i}".encode())

    res = await db_session.execute(select(InferenceResult))
    rows = res.scalars().all()
    assert len(rows) >= 3
    for r in rows:
        assert r.predictions is not None
        assert r.model_version is not None


def test_fr_12b_inference_status_endpoint(tech_client, rad_client, sample_case):
    """TC-FR-12b: status endpoint reports 'completed' when a result exists."""
    body = _upload_one(tech_client, sample_case.case_id, b"fr12b-bytes").json()
    image_id = body["image_id"]

    response = rad_client.get(f"/api/v1/inference/{image_id}/status")
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


def test_fr_12c_retry_inference_endpoint(tech_client, rad_client, sample_case):
    """TC-FR-12c: /inference/{image_id}/retry re-runs and returns status."""
    body = _upload_one(tech_client, sample_case.case_id, b"fr12c-bytes").json()
    image_id = body["image_id"]

    response = rad_client.post(f"/api/v1/inference/{image_id}/retry")
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
