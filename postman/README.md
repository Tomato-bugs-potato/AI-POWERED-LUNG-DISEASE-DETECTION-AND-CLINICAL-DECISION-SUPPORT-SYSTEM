# Postman End-to-End Workflow

This folder contains an executable Postman collection that walks the entire clinical workflow as a single test run — no clicking through endpoints one at a time.

---

## 🟢 One-time setup (do this before running, only once per machine)

**The collection will return 422 on step 08 unless you do ONE of these two things first.** Postman GUI does not auto-attach files referenced in an imported collection.

### Option 1 (recommended) — Set Postman's Working Directory

This makes the file references in the collection just work, forever, and survives every re-import.

1. **Postman → Settings (gear icon, top right) → General**.
2. Scroll to **Working directory**.
3. Set it to: `D:\School\AI-POWERED-LUNG-DISEASE-DETECTION-AND-CLINICAL-DECISION-SUPPORT-SYSTEM\postman`
4. Check **"Allow reading files outside working directory"** (if shown).
5. Close Settings. Done. Now `src: samples/tb0007.png` resolves automatically.

### Option 2 — Manually attach the file once after each import

If you can't change Postman settings:

1. Open `08 · Lab Tech uploads chest X-ray  [⚠️ ATTACH FILE IN BODY → form-data → file]` → **Body** tab → **form-data** → click the **`file`** row's **Select Files** button → choose `postman/samples/tb0007.png`. **Save the request.**
2. Open `22 · Duplicate-upload check (FR-07)  [⚠️ ATTACH SAME FILE AS STEP 08]` → repeat with the **same** `tb0007.png` (the test asserts SHA-256 collision).

You'll need to redo this every time you re-import the JSON. Option 1 avoids that.

---

## Files

| File | Purpose |
|------|---------|
| `LungDx_E2E_Workflow.postman_collection.json` | The 23-step ordered workflow. Each step stores IDs / tokens in collection variables so later steps reference them automatically. |
| `LungDx_Local.postman_environment.json` | Default environment pointing at `http://localhost:8000` with the seeded `admin@test.com / password` credentials. |
| `samples/tb0007.png` … `samples/tb0232.png` | Six real TB chest X-rays. Step 08 uses `tb0007.png`; swap the `src` field in the request body to point at any of the others to exercise a different study. |

## What the workflow does

```
00 Health check  (hits {{host_url}}/health/, outside /api/v1)
   ↓
01 Admin login   (auto-handles OTP: if backend returns otp_code+user_id, the
                   script calls /auth/verify-otp inline via pm.sendRequest)
   ↓
02–04 Admin creates Lab Tech, Radiologist, Doctor accounts
   ↓
05 Lab Tech login
   ↓
06 Lab Tech registers patient (with consent — FR-23)
   ↓
07 Lab Tech creates case
   ↓
08 Lab Tech uploads X-ray (PNG)             ─── triggers AI inference
   ↓
09 Poll inference status until 'completed'  ─── self-loops every 2s
   ↓
10 Radiologist login
   ↓
11 Radiologist fetches AI predictions       ─── asserts bbox + confidence shape
   ↓
12 Radiologist saves review + annotations
   ↓
13 Radiologist sends review to doctor       ─── case → Ready_for_Diagnosis
   ↓
14 Doctor login
   ↓
15 Doctor saves diagnosis draft (FR-18)
   ↓
16 Doctor submits final diagnosis           ─── case → Diagnosed, report queued
   ↓
17 Poll report status until 'ready'
   ↓
18 Doctor downloads PDF report              ─── verifies all sections present
   ↓
19 Doctor lists past reports
   ↓
20 RBAC negative check — Admin cannot read diagnosis (FR-19) → expects 403
   ↓
21 Admin views audit log for this case      ─── asserts CASE_CREATED / IMAGE_UPLOADED / DIAGNOSIS_SUBMITTED rows
   ↓
22 Duplicate-upload check (FR-07)           ─── expects 409
   ↓
23 Doctor logout (FR-04)
```

Each step has a `pm.test(...)` block — by the end you have **≈ 35 assertions** across the full workflow.

## How to run

### A. From the Postman GUI

> ⚠️ **Did you do the one-time setup above?** If not, scroll up — step 08 will return 422 otherwise.

1. **Import** both JSON files (`File → Import...`). If you've imported a previous version, Postman will prompt **Replace** vs **Create copy** — choose **Replace**.
2. Top-right → select environment **LungDx — Local (Docker Compose)**.
3. Open the collection → **Run** → keep iteration count `1` → **Run Lung Disease Detection — End-to-End Clinical Workflow**.
4. Watch the Runner log: every step shows pass/fail counts.

### B. From the CLI with Newman (CI-friendly)

```bash
npm install -g newman
cd postman
newman run LungDx_E2E_Workflow.postman_collection.json \
  -e LungDx_Local.postman_environment.json \
  --delay-request 2000 \
  --timeout-request 60000
```

`--delay-request 2000` gives the polling steps time to settle. CI sample output:

```
┌─────────────────────────┬─────────────────────┬─────────────────────┐
│                         │            executed │              failed │
├─────────────────────────┼─────────────────────┼─────────────────────┤
│              iterations │                   1 │                   0 │
│                requests │                  23 │                   0 │
│            test-scripts │                  23 │                   0 │
│      prerequest-scripts │                  23 │                   0 │
│              assertions │                  35 │                   0 │
└─────────────────────────┴─────────────────────┴─────────────────────┘
```

## Prerequisites

Before running, make sure:

1. **Backend running** at `http://localhost:8000` (e.g. `docker compose up` from the repo root).
2. **`SKIP_OTP=true`** in `backend/.env` so the workflow doesn't pause for an OTP email. To exercise the real OTP path, flip it to `false` — request 01b will then verify the OTP returned by request 01.
3. **`SEED_TEST_USERS=true`** so the default `admin@test.com / password` exists. The workflow uses this admin to create the other three role accounts on first run.
4. **AI service reachable** (`AI_SERVICE_URL` env var). If the HF Space is down, polling step 09 will time out — switch the backend to a mocked AI inference module for offline runs.

## Tweaking

- **Different environment** — duplicate `LungDx_Local.postman_environment.json`, change `base_url`, save as `LungDx_Staging.postman_environment.json`.
- **Use a different X-ray** — change the `file` field's `src` in step 08 (and step 22 to keep the duplicate test paired) to `samples/tb0037.png`, `tb0086.png`, `tb0135.png`, `tb0177.png`, or `tb0232.png`. Each is a distinct real TB study, so the AI predictions in steps 09 / 11 will differ.
- **Re-run safely** — the collection is idempotent: requests 02–04 accept 400 ("email already registered") as success, and request 22 expects the duplicate path.

## Mapping to requirements

| Step | Validates |
|------|-----------|
| 00 | Service liveness |
| 01, 05, 10, 14, 23 | FR-01, FR-02 (inline OTP verify), FR-04 |
| 02–04 | FR-26 (admin user management) |
| 06 | FR-23, NFR-26 (consent) |
| 07, 13 | FR-24, FR-13c (case status workflow) |
| 08, 22 | FR-05, FR-06, FR-07 (upload + duplicate) |
| 09, 11 | FR-08, FR-09, FR-10, FR-11, FR-12 (inference pipeline) |
| 12 | FR-14, FR-15 (annotations + threshold) |
| 15, 16 | FR-16, FR-18 (diagnosis + draft) |
| 17, 18, 19 | FR-20, FR-21, FR-22 (PDF report) |
| 20 | FR-19, NFR-12 (RBAC) |
| 21 | FR-27, NFR-13 (audit trail) |

## Troubleshooting

| Symptom | Likely cause | Fix |
|--------|--------------|-----|
| 01 fails with 401 | Admin user not seeded | Set `SEED_TEST_USERS=true` and restart the backend |
| 01 reports `otp_code` but admin_token not set | OTP verify call failed in the inline `pm.sendRequest` | Open the Postman console — the response from `/auth/verify-otp` is logged there |
| 00 returns 404 | Wrong `host_url` or backend port | Set `host_url=http://localhost:8000` (no trailing slash, no `/api/v1`) |
| 08 fails with `Storage service error` | MinIO not running | `docker compose up minio` |
| **08 fails with 422 Unprocessable Entity** | **File not attached in Postman GUI** | **Open step 08 → Body → form-data → click the `file` row → Select Files → `postman/samples/tb0007.png`. Same for step 22.** |
| 09 stops after 15 attempts | AI service unreachable or worker is stuck | Check `AI_SERVICE_URL` and HF Space status; the polling has a max-attempts guard, won't run away forever |
| 09 skipped immediately | `image_id` is empty because step 08 failed | Fix step 08 first (usually the file-attach issue above), then re-run |
| 17 stops after 15 attempts | Celery worker not running | `docker compose up worker` |
| 21 missing actions | Audit log decryption mismatch | Confirm `FIELD_ENCRYPTION_KEY` matches the value used during the writes |
