"""
Executable test cases for performance / reliability non-functional requirements.

NFR-01: Image-upload → inference end-to-end ≤ 12 s on single GPU
NFR-02: UI overlay toggle < 300 ms (frontend; here we check the API helper < 300 ms)
NFR-03: PDF report generation cached ≤ 10 s / uncached ≤ 18 s
NFR-04: 200 concurrent sessions handled — load test sketch
NFR-07: Inference retry endpoint exists
NFR-08: App lifecycle hook registers (sanity)

NOTE: Real GPU latency, concurrency and recovery targets must be measured
against the live staging deployment with Locust. These tests give a
fast-feedback sanity guarantee inside CI by exercising the same code paths
with mocked external services (so they are timing-the-app-layer only).
"""
import io
import time
import pytest


def _png(payload: bytes = b"nfr-perf") -> bytes:
    return bytes.fromhex("89504e470d0a1a0a") + payload


# ---------------------------------------------------------------------------
# NFR-01 — End-to-end upload + inference returns within the budget
# ---------------------------------------------------------------------------

def test_nfr_01_upload_and_inference_under_12s(tech_client, sample_case):
    """TC-NFR-01: with mocked AI service, the API layer round-trip is < 12 s."""
    start = time.perf_counter()
    response = tech_client.post(
        "/api/v1/images/upload",
        files={"file": ("x.png", io.BytesIO(_png(b"nfr01")), "image/png")},
        data={"case_id": str(sample_case.case_id)},
    )
    elapsed = time.perf_counter() - start

    assert response.status_code == 200
    assert elapsed < 12, f"Upload+inference took {elapsed:.2f}s, budget is 12s"


# ---------------------------------------------------------------------------
# NFR-02 — Inference result fetch < 300 ms
# ---------------------------------------------------------------------------

def test_nfr_02_inference_result_fetch_fast(tech_client, rad_client, sample_case):
    """TC-NFR-02: GET /inference/{image_id}/result responds in < 300 ms (overlay refresh)."""
    upload = tech_client.post(
        "/api/v1/images/upload",
        files={"file": ("x.png", io.BytesIO(_png(b"nfr02")), "image/png")},
        data={"case_id": str(sample_case.case_id)},
    )
    image_id = upload.json()["image_id"]

    start = time.perf_counter()
    response = rad_client.get(f"/api/v1/inference/{image_id}/result")
    elapsed = time.perf_counter() - start

    assert response.status_code == 200
    assert elapsed < 0.3, f"Inference result fetch took {elapsed*1000:.1f}ms"


# ---------------------------------------------------------------------------
# NFR-03 — Report response < 10 s (with seeded report row)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_nfr_03_report_fetch_fast(doctor_client, sample_case, db_session, seeded_users):
    """TC-NFR-03: cached report fetch responds in well under 10 s."""
    from app.models.report import Report
    rpt = Report(
        case_id=sample_case.case_id,
        generated_by=seeded_users["doctor"].user_id,
        pdf_url="reports/seeded.pdf",
        cached=True,
    )
    db_session.add(rpt)
    await db_session.commit()

    start = time.perf_counter()
    response = doctor_client.get(f"/api/v1/reports/{sample_case.case_id}")
    elapsed = time.perf_counter() - start

    assert response.status_code == 200
    assert elapsed < 10


# ---------------------------------------------------------------------------
# NFR-04 — Concurrency sketch (50 sequential requests; full 200-concurrent
# load is exercised via Locust against staging — see /docs/load-tests).
# ---------------------------------------------------------------------------

def test_nfr_04_health_endpoint_sustains_repeated_requests(client):
    """TC-NFR-04: 50 sequential health pings all succeed under 5 s total."""
    start = time.perf_counter()
    for _ in range(50):
        assert client.get("/health/").status_code == 200
    elapsed = time.perf_counter() - start
    assert elapsed < 5, f"50 health checks took {elapsed:.2f}s"


# ---------------------------------------------------------------------------
# NFR-07 — Inference retry endpoint
# ---------------------------------------------------------------------------

def test_nfr_07_retry_endpoint_exists(tech_client, rad_client, sample_case):
    """TC-NFR-07: /inference/{image_id}/retry succeeds for an existing image."""
    upload = tech_client.post(
        "/api/v1/images/upload",
        files={"file": ("x.png", io.BytesIO(_png(b"nfr07")), "image/png")},
        data={"case_id": str(sample_case.case_id)},
    )
    image_id = upload.json()["image_id"]

    response = rad_client.post(f"/api/v1/inference/{image_id}/retry")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# NFR-08 — App lifecycle hook registers
# ---------------------------------------------------------------------------

def test_nfr_08_health_root_responds(client):
    """TC-NFR-08: the FastAPI app boots and responds to /health/ — confirms lifespan ran."""
    response = client.get("/health/")
    assert response.status_code == 200
    assert "timestamp" in response.json()
