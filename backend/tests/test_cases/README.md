# Executable Test Cases — AI-Powered Lung Disease Detection

This folder contains the executable PyTest suite mapped to **FR-01 through FR-27** and **NFR-1 through NFR-29** from the SRS. Every test directly exercises a real API endpoint or core security primitive.

## Layout

| File | Coverage |
|------|----------|
| `conftest.py` | Fixtures: SQLite in-memory DB, role-scoped TestClients, mocked Redis / MinIO / AI service / Celery |
| `test_smoke.py` | Sanity (3 tests) |
| `test_fr_01_04_auth.py` | Login, OTP, role enum, logout, refresh (15 tests) |
| `test_fr_05_07_images.py` | Upload, format/size validation, SHA-256 duplicate detection (11 tests) |
| `test_fr_08_12_inference.py` | AI inference pipeline, bounding boxes, persistence (9 tests) |
| `test_fr_13_15_reviews.py` | Radiologist annotation CRUD + threshold + workflow (8 tests) |
| `test_fr_16_22_diagnoses_reports.py` | Doctor diagnosis, admin promotion, draft autosave, RBAC block, PDF report (17 tests) |
| `test_fr_23_25_patients.py` | Patient registration, case linking, search & CSV export (11 tests) |
| `test_fr_26_27_admin.py` | User management, audit log access (15 tests) |
| `test_nfr_security.py` | AES-256-GCM encryption, Argon2, password policy, JWT (24 tests) |
| `test_nfr_compliance.py` | Data minimisation, consent, right-to-erasure, RBAC sweep (15 tests) |
| `test_nfr_performance.py` | Upload/inference/report latency budgets, concurrency sketch (6 tests) |

**Total: 137 tests.**

## Running

```bash
cd backend
venv\Scripts\python.exe -m pytest tests/test_cases/ -v
```

For a single file:
```bash
venv\Scripts\python.exe -m pytest tests/test_cases/test_fr_01_04_auth.py -v
```

For one test:
```bash
venv\Scripts\python.exe -m pytest tests/test_cases/test_fr_01_04_auth.py::test_fr_01a_valid_login_returns_token -v
```

## Architecture

- **Database**: SQLite in-memory (`:memory:` with shared cache). PostgreSQL-specific column types (`UUID`, `JSONB`) are monkeypatched at conftest load time to cross-dialect equivalents so `create_all` works.
- **HTTP**: FastAPI `TestClient` — exercises the same middleware stack as production.
- **Auth**: Real JWTs are minted via `create_access_token` and attached to a `TestClient` per role.
- **Redis**: `_FakeRedis` in-memory stub — supports get/set/setex/incr/expire/delete.
- **MinIO**: `app.services.storage.*` functions are monkeypatched to return canned data. No bucket is touched.
- **AI service**: `httpx.AsyncClient` is replaced with a fake that returns a YOLO-style prediction (Pneumonia / Tuberculosis / Lung Tumor + bounding box + confidence + classification probabilities).
- **Celery**: `.delay()` is replaced with a no-op so tests don't need a broker.

The schema is created and torn down per-test (`autouse` fixture in `conftest.py`) for full isolation.

## Coverage matrix

| Requirement | Test ID prefix | Endpoint(s) | Status |
|-------------|----------------|-------------|--------|
| FR-01 Login | `test_fr_01a..d` | POST /auth/login | covered |
| FR-02 OTP | `test_fr_02a..e` | POST /auth/login + /auth/verify-otp + /auth/resend-otp | covered |
| FR-03 Roles | `test_fr_03a,b` | enum + seeded users | covered |
| FR-04 Logout/Refresh | `test_fr_04a..d` | POST /auth/logout + /auth/refresh | covered |
| FR-05 Upload | `test_fr_05a..e` | POST /images/upload | covered |
| FR-06 Format/Size validation | `test_fr_06a..c` | POST /images/upload | covered |
| FR-07 Duplicate detection | `test_fr_07a..c` | POST /images/upload + DB check | covered |
| FR-08 Preprocessing | `test_fr_08a,b` | upload triggers AI pipeline | covered |
| FR-09 Detection | `test_fr_09a,b` | GET /inference/{id}/result | covered |
| FR-10 Bounding boxes | `test_fr_10a` | inference result structure | covered |
| FR-11 Confidence scores | `test_fr_11a` | inference result structure | covered |
| FR-12 Persistence | `test_fr_12a..c` | DB + GET /inference/{id}/status + /retry | covered |
| FR-13 Radiologist view | `test_fr_13a,b` | GET /reviews/{case_id} | covered |
| FR-14 Annotation edits | `test_fr_14a..d` | POST /reviews/{case_id} + audit | covered |
| FR-15 Confidence threshold | `test_fr_15a,b` | POST /reviews/{case_id} | covered |
| FR-16 Diagnosis | `test_fr_16a..c` | POST /diagnoses/{case_id} | covered |
| FR-17 Admin promotion approval | `test_fr_17a..c` | PATCH /users/{id}/role | covered |
| FR-18 Diagnosis draft | `test_fr_18a,b` | POST /diagnoses/{case_id}/draft | covered |
| FR-19 Admin block from diagnosis | `test_fr_19a,b` | RBAC dependency | covered |
| FR-20 PDF report | `test_fr_20a..d` | GET /reports/{case_id} + /regenerate | covered |
| FR-21 Report sections | `test_fr_21a` | enriched report response | covered |
| FR-22 Past reports | `test_fr_22a..d` | GET /reports/ + /export/csv | covered |
| FR-23 Patient registration | `test_fr_23a..c` | POST /patients/ | covered |
| FR-24 Case linking | `test_fr_24a,b` | POST /cases/ with linked_case_id | covered |
| FR-25 Patient search | `test_fr_25a..g` | GET /patients/search + export | covered |
| FR-26 User management | `test_fr_26a..h` | POST /users/admin-create + /deactivate | covered |
| FR-27 Audit logs | `test_fr_27a..f` | GET /logs/ with filters | covered |
| NFR-1 Inference latency | `test_nfr_01` | timed upload+inference | covered |
| NFR-2 UI overlay <300ms | `test_nfr_02` | timed inference fetch | covered |
| NFR-3 Report <10s | `test_nfr_03` | timed report fetch | covered |
| NFR-4 200 concurrent | `test_nfr_04` | 50-iter health pings (sketch) | covered |
| NFR-7 Inference retry | `test_nfr_07` | POST /inference/{id}/retry | covered |
| NFR-8 Service restart | `test_nfr_08` | health endpoint after lifespan | covered |
| NFR-11 AES-256 encryption | `test_nfr_11a..e` | encrypt/decrypt + on-disk ciphertext | covered |
| NFR-13 Append-only audit | `test_nfr_13a` | audit log persistence | covered |
| NFR-14 Argon2 hashing | `test_nfr_14a..d` | hash format + verify + unique salt | covered |
| NFR-15 Password policy | `test_nfr_15` (parametrized) | validate_password rule set | covered |
| NFR-25 Data minimisation | `test_nfr_25a,b` | Patient model column inspection | covered |
| NFR-26 Consent recording | `test_nfr_26a,b` | POST /patients/ | covered |
| NFR-27 Right to erasure | `test_nfr_27a..c` | DELETE /patients/{id} | covered |
| NFR-12 RBAC sweep | `test_nfr_12a..c` (parametrized) | cross-role endpoint matrix | covered |
| NFR-28 Localisation | `test_nfr_28a` | informational stub | covered |

## Notes & caveats

- **Performance tests are sanity-budget, not load tests.** Real 200-concurrent-user behaviour (NFR-4) and the 30-day uptime claim (NFR-5) must be measured against staging via Locust. These tests catch obvious regressions in the API layer when the AI service is mocked.
- **NFR-5 (95% uptime), NFR-9 (daily backup), NFR-10 (full restore)** require infrastructure-level testing (chaos drills, backup-restore rehearsals) that cannot be expressed as unit tests.
- **NFR-23/24 (WCAG accessibility)** are frontend-only and tested via Lighthouse / axe-core in the Next.js project.
- **FR-09 model accuracy (mAP@0.5 ≥ 90%)** is validated by the model-evaluation notebooks (`final-project-v4.ipynb`), not by this suite. The tests here only verify that the API surface correctly transports the model's output.
