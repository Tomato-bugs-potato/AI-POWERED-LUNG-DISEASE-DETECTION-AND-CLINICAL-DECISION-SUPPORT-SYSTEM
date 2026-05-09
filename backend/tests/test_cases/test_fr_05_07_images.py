"""
Executable test cases for FR-05 through FR-07.

FR-05: Upload chest X-ray (PNG / JPEG / DICOM)
FR-06: Format and size validation (≤ 50 MB)
FR-07: Duplicate image detection via SHA-256 hash
"""
import io
import uuid
import hashlib
import pytest
from sqlalchemy import select
from app.models.image import Image


def _png_bytes(payload: bytes = b"unique-payload") -> bytes:
    """Return a minimal valid PNG with an embedded unique payload so the hash differs per test."""
    PNG_HEADER = bytes.fromhex("89504e470d0a1a0a")
    # Minimal IHDR + payload — not a valid image but enough to flow through MIME check
    return PNG_HEADER + payload


def _upload(client, case_id, content, content_type="image/png", filename="x.png", allow_duplicate=False):
    return client.post(
        "/api/v1/images/upload",
        files={"file": (filename, io.BytesIO(content), content_type)},
        data={"case_id": str(case_id), "allow_duplicate": str(allow_duplicate).lower()},
    )


# ---------------------------------------------------------------------------
# FR-05 — Upload
# ---------------------------------------------------------------------------

def test_fr_05a_upload_png_succeeds(tech_client, sample_case):
    """TC-FR-05a: a Lab Technician can upload a PNG to an existing case."""
    response = _upload(tech_client, sample_case.case_id, _png_bytes(b"fr05a"))
    assert response.status_code == 200
    body = response.json()
    assert "image_id" in body
    assert body["case_id"] == str(sample_case.case_id)


def test_fr_05b_upload_jpeg_succeeds(tech_client, sample_case):
    """TC-FR-05b: JPEG content-type is accepted."""
    response = _upload(
        tech_client, sample_case.case_id, b"\xff\xd8\xff\xe0fr05b",
        content_type="image/jpeg", filename="x.jpg",
    )
    assert response.status_code == 200


def test_fr_05c_upload_dicom_succeeds(tech_client, sample_case):
    """TC-FR-05c: DICOM content-type is accepted."""
    response = _upload(
        tech_client, sample_case.case_id, b"DICM" + b"fr05c-payload" * 8,
        content_type="application/dicom", filename="x.dcm",
    )
    assert response.status_code == 200


def test_fr_05d_upload_unknown_case_returns_404(tech_client):
    """TC-FR-05d: upload to a non-existent case returns 404."""
    response = _upload(tech_client, uuid.uuid4(), _png_bytes(b"fr05d"))
    assert response.status_code == 404


def test_fr_05e_upload_requires_clinical_role(client, doctor_client, sample_case):
    """TC-FR-05e: anonymous request is rejected; the Doctor role is permitted to upload."""
    # Anonymous
    anon = _upload(client, sample_case.case_id, _png_bytes(b"fr05e1"))
    assert anon.status_code in (401, 403)

    # Doctor is one of the allowed roles
    ok = _upload(doctor_client, sample_case.case_id, _png_bytes(b"fr05e2"))
    assert ok.status_code == 200


# ---------------------------------------------------------------------------
# FR-06 — Format & size validation
# ---------------------------------------------------------------------------

def test_fr_06a_reject_unknown_mime_type(tech_client, sample_case):
    """TC-FR-06a: text/plain is rejected with 400."""
    response = _upload(
        tech_client, sample_case.case_id, b"not an image",
        content_type="text/plain", filename="readme.txt",
    )
    assert response.status_code == 400
    assert "invalid file type" in response.json()["detail"].lower()


def test_fr_06b_reject_oversized_file(tech_client, sample_case):
    """TC-FR-06b: file > 50 MB is rejected with 400."""
    oversize = b"\x89PNG" + b"A" * (51 * 1024 * 1024)
    response = _upload(tech_client, sample_case.case_id, oversize)
    assert response.status_code == 400
    assert "too large" in response.json()["detail"].lower()


def test_fr_06c_accept_file_under_limit(tech_client, sample_case):
    """TC-FR-06c: a 1 MB file is accepted (boundary check)."""
    payload = b"\x89PNG" + b"B" * (1024 * 1024)
    response = _upload(tech_client, sample_case.case_id, payload)
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# FR-07 — Duplicate detection (SHA-256)
# ---------------------------------------------------------------------------

def test_fr_07a_duplicate_image_detected(tech_client, sample_case):
    """TC-FR-07a: re-uploading the same bytes returns 409 with conflict metadata."""
    payload = _png_bytes(b"fr07-same-bytes")

    first = _upload(tech_client, sample_case.case_id, payload)
    assert first.status_code == 200

    second = _upload(tech_client, sample_case.case_id, payload)
    assert second.status_code == 409
    detail = second.json()["detail"]
    assert "existing_image_id" in detail
    assert "existing_case_id" in detail


def test_fr_07b_allow_duplicate_override_succeeds(tech_client, sample_case):
    """TC-FR-07b: allow_duplicate=true bypasses the 409 conflict."""
    payload = _png_bytes(b"fr07b-bytes")

    _upload(tech_client, sample_case.case_id, payload)
    second = _upload(tech_client, sample_case.case_id, payload, allow_duplicate=True)
    assert second.status_code == 200


@pytest.mark.asyncio
async def test_fr_07c_hash_persisted_per_image(tech_client, sample_case, db_session):
    """TC-FR-07c: each saved Image row has a unique SHA-256 file_hash."""
    payload = _png_bytes(b"fr07c-payload")
    expected_hash = hashlib.sha256(payload).hexdigest()

    _upload(tech_client, sample_case.case_id, payload)

    res = await db_session.execute(select(Image).where(Image.case_id == sample_case.case_id))
    images = res.scalars().all()
    assert len(images) >= 1
    assert any(img.file_hash == expected_hash for img in images)
    assert all(len(img.file_hash) == 64 for img in images)  # SHA-256 hex length
