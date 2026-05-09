"""
Shared fixtures for executable test cases mapped to FR-01–FR-27 and NFR-1–NFR-29.

Strategy:
- SQLite in-memory database (no Postgres dependency for CI)
- App's PostgreSQL types (UUID, JSONB) are swapped for cross-dialect equivalents
  before any models are imported, so create_all works on SQLite.
- Redis, MinIO, the AI service, and Celery are mocked.
- One TestClient per role (lab_tech, radiologist, doctor, admin) is exposed
  via fixtures.
"""
import os
import sys
import uuid
import asyncio
from datetime import date, datetime
from pathlib import Path
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

# ---------------------------------------------------------------------------
# 1. Environment — must be set BEFORE importing the app
# ---------------------------------------------------------------------------
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-pytest-only-do-not-use-in-prod-32b"
os.environ["JWT_ALGORITHM"] = "HS256"
os.environ["FIELD_ENCRYPTION_KEY"] = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="  # 32 zero bytes b64
os.environ["MINIO_ENDPOINT"] = "localhost:9000"
os.environ["MINIO_ACCESS_KEY"] = "test"
os.environ["MINIO_SECRET_KEY"] = "test"
os.environ["MINIO_SECURE"] = "false"
os.environ["MINIO_EXTERNAL_HOST"] = ""
os.environ["AI_SERVICE_URL"] = "http://localhost:8001"
os.environ["AI_INTERNAL_API_KEY"] = "test-internal-key"
os.environ["BACKUP_BUCKET"] = "test-backups"
os.environ["SMTP_USER"] = "test@test.com"
os.environ["SMTP_PASSWORD"] = "test"
os.environ["EMAIL_FROM"] = "test@test.com"
os.environ["SKIP_OTP"] = "true"
os.environ["SEED_TEST_USERS"] = "false"
os.environ["DEBUG"] = "true"
os.environ["FRONTEND_URL"] = "http://localhost:3000"

# Add backend root to sys.path so `import app.*` works regardless of cwd
BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

# ---------------------------------------------------------------------------
# 2. Patch PostgreSQL-specific column types BEFORE models are imported
# ---------------------------------------------------------------------------
# UUID and JSONB only exist in Postgres dialect. For SQLite tests we swap them
# for cross-dialect equivalents at import time.
import sqlalchemy.dialects.postgresql as _pg
from sqlalchemy import JSON, String, CHAR
from sqlalchemy.types import TypeDecorator


class _UUIDString(TypeDecorator):
    """Stores UUIDs as 36-char strings; returns them as uuid.UUID objects."""
    impl = CHAR
    cache_ok = True

    def __init__(self, as_uuid: bool = True, *args, **kwargs):
        self.as_uuid = as_uuid
        super().__init__(36)

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return str(value)
        return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if self.as_uuid and not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value


_pg.UUID = _UUIDString          # type: ignore[assignment]
_pg.JSONB = JSON                # type: ignore[assignment]

# ---------------------------------------------------------------------------
# 2b. Wrap create_async_engine to drop Postgres-only kwargs when using SQLite.
#     The app's db/session.py passes pool_size/max_overflow unconditionally;
#     SQLite's StaticPool rejects them.
# ---------------------------------------------------------------------------
import sqlalchemy.ext.asyncio as _sa_async

_orig_create_async_engine = _sa_async.create_async_engine


def _patched_create_async_engine(url, *args, **kwargs):
    url_str = str(url)
    if url_str.startswith("sqlite"):
        kwargs.pop("pool_size", None)
        kwargs.pop("max_overflow", None)
    return _orig_create_async_engine(url, *args, **kwargs)


_sa_async.create_async_engine = _patched_create_async_engine

# ---------------------------------------------------------------------------
# 3. Now safe to import the app
# ---------------------------------------------------------------------------
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Defer app imports until after the type patches above
from app.main import app  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.models import Base, User, Hospital, Patient, Case  # noqa: E402
from app.db.base import Role, UserStatus, PatientSex, CaseStatus, UrgencyLevel  # noqa: E402
from app.core.security import hash_password, create_access_token  # noqa: E402
from app.dependencies import get_current_user  # noqa: E402


# ---------------------------------------------------------------------------
# 4. Database fixtures
# ---------------------------------------------------------------------------
# Single shared in-memory engine for the test session so the schema persists
# across multiple connections.
TEST_DB_URL = "sqlite+aiosqlite:///file:pytest_mem?mode=memory&cache=shared&uri=true"

_engine = create_async_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False, "uri": True},
    echo=False,
)
_TestSession = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def _setup_schema():
    """Create all tables before each test, drop them after."""
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with _TestSession() as session:
        yield session


# ---------------------------------------------------------------------------
# 5. External-service mocks (Redis, MinIO, AI service, Celery)
# ---------------------------------------------------------------------------
class _FakeRedis:
    """In-memory async stub covering the methods the app actually calls."""
    def __init__(self):
        self._store: dict[str, str | int] = {}

    async def get(self, key):
        return self._store.get(key)

    async def set(self, key, value, *_, **__):
        self._store[key] = value

    async def setex(self, key, ttl, value):
        self._store[key] = value

    async def incr(self, key):
        self._store[key] = int(self._store.get(key, 0)) + 1
        return self._store[key]

    async def expire(self, key, ttl):
        return True

    async def delete(self, *keys):
        for k in keys:
            self._store.pop(k, None)

    async def ping(self):
        return True

    async def close(self):
        return None


@pytest.fixture(autouse=True)
def _mock_external_services(monkeypatch):
    """Stub out Redis, MinIO, AI service, and Celery for every test."""
    fake_redis = _FakeRedis()

    async def fake_get_redis():
        return fake_redis

    monkeypatch.setattr("app.core.redis.get_redis", fake_get_redis)
    # Modules that did `from app.core.redis import get_redis` at load time
    # need their local binding patched too.
    for module_path in (
        "app.api.v1.endpoints.auth",
        "app.dependencies",
        "app.main",
    ):
        monkeypatch.setattr(f"{module_path}.get_redis", fake_get_redis, raising=False)

    # Storage layer — no real MinIO. Patch source and every module that did
    # `from app.services.storage import X` at load time.
    def _fake_upload(*a, **k): return "mocked/object/path.png"
    def _fake_presign(*a, **k): return "http://mocked-presigned-url/"
    def _fake_get_data(*a, **k): return (b"fake-image-bytes", "image/png")
    def _fake_ensure_buckets(): return None

    monkeypatch.setattr("app.services.storage.upload_file", _fake_upload)
    monkeypatch.setattr("app.services.storage.get_presigned_url", _fake_presign)
    monkeypatch.setattr("app.services.storage.get_file_data", _fake_get_data)
    monkeypatch.setattr("app.services.storage.ensure_buckets_exist", _fake_ensure_buckets)

    # Patch local bindings in modules that imported the symbols at load time
    for mod, sym, fake in [
        ("app.api.v1.endpoints.images", "upload_file", _fake_upload),
        ("app.api.v1.endpoints.images", "get_presigned_url", _fake_presign),
        ("app.api.v1.endpoints.images", "get_file_data", _fake_get_data),
        ("app.api.v1.endpoints.inference", "get_file_data", _fake_get_data),
        ("app.api.v1.endpoints.reports", "get_presigned_url", _fake_presign),
        ("app.api.v1.endpoints.users", "upload_file", _fake_upload),
        ("app.api.v1.endpoints.users", "get_presigned_url", _fake_presign),
    ]:
        monkeypatch.setattr(f"{mod}.{sym}", fake, raising=False)

    # AI service — replace httpx.AsyncClient with one that returns a canned
    # YOLO-style prediction
    class _FakeAIResponse:
        status_code = 200

        def json(self):
            return {
                "inference_id": str(uuid.uuid4()),
                "model_version": "yolox-test-v1",
                "processing_time_sec": 0.42,
                "predictions": [
                    {
                        "disease_class": "Pneumonia",
                        "confidence_score": 0.87,
                        "bounding_box": {"x": 100, "y": 120, "w": 80, "h": 90},
                    }
                ],
                "classification": {
                    "disease_class": "Pneumonia",
                    "confidence_score": 0.91,
                    "probabilities": {"Pneumonia": 0.91, "Tuberculosis": 0.05, "Lung Tumor": 0.04},
                },
            }

    class _FakeAsyncClient:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *a, **k): pass
        async def post(self, *a, **k): return _FakeAIResponse()
        async def get(self, *a, **k): return _FakeAIResponse()

    monkeypatch.setattr("httpx.AsyncClient", _FakeAsyncClient)

    # Celery — replace `.delay(...)` with a no-op so tests don't need a broker
    def _noop_delay(*a, **k):
        return MagicMock(id=str(uuid.uuid4()))

    # workers may not exist depending on test ordering — guard each one
    for path in [
        "app.workers.inference_tasks.run_inference_pipeline",
        "app.workers.report_tasks.generate_report_task",
        "app.workers.email_tasks.send_welcome_email",
        "app.workers.backup_tasks.delete_minio_files",
    ]:
        try:
            monkeypatch.setattr(path + ".delay", _noop_delay, raising=False)
        except Exception:
            pass

    yield


# ---------------------------------------------------------------------------
# 6. RLS-bypass: app.dependencies.get_current_user calls set_config which
#    only exists in Postgres. The except branch already swallows the error
#    but it rolls back the transaction. We monkeypatch db.execute for the
#    set_config statement during tests.
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _patch_rls_setconfig(monkeypatch):
    """Skip the Postgres-only set_config call in get_current_user."""
    from sqlalchemy.ext.asyncio import AsyncSession as _AS
    original_execute = _AS.execute

    async def patched_execute(self, statement, params=None, *args, **kwargs):
        try:
            compiled = str(statement)
        except Exception:
            compiled = ""
        if "set_config" in compiled or "app.current_user" in compiled:
            return MagicMock()  # pretend it succeeded
        return await original_execute(self, statement, params, *args, **kwargs)

    monkeypatch.setattr(_AS, "execute", patched_execute)


# ---------------------------------------------------------------------------
# 7. Override get_db to use the test engine
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def override_get_db():
    async def _get_test_db():
        async with _TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.pop(get_db, None)


# ---------------------------------------------------------------------------
# 8. Seed users for each role
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def seeded_users(db_session: AsyncSession) -> dict:
    """Create one user per role and return a dict keyed by role name."""
    users = {}
    for role, email in [
        (Role.Lab_Technician, "tech@test.com"),
        (Role.Radiologist, "rad@test.com"),
        (Role.Doctor, "doc@test.com"),
        (Role.Admin, "admin@test.com"),
    ]:
        u = User(
            email=email,
            password_hash=hash_password("StrongP@ssword123"),
            name=f"Test {role.value}",
            role=role,
            status=UserStatus.Active,
        )
        db_session.add(u)
    await db_session.commit()

    # Re-fetch with stable references
    from sqlalchemy import select
    for role in [Role.Lab_Technician, Role.Radiologist, Role.Doctor, Role.Admin]:
        res = await db_session.execute(select(User).where(User.role == role))
        users[role.value.lower()] = res.scalar_one()
    return users


def _auth_header(user: User) -> dict:
    token = create_access_token(str(user.user_id), user.role.value, user.email)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(override_get_db) -> TestClient:
    """Anonymous TestClient (no auth header)."""
    return TestClient(app)


@pytest_asyncio.fixture
async def tech_client(override_get_db, seeded_users) -> TestClient:
    c = TestClient(app)
    c.headers.update(_auth_header(seeded_users["lab_technician"]))
    return c


@pytest_asyncio.fixture
async def rad_client(override_get_db, seeded_users) -> TestClient:
    c = TestClient(app)
    c.headers.update(_auth_header(seeded_users["radiologist"]))
    return c


@pytest_asyncio.fixture
async def doctor_client(override_get_db, seeded_users) -> TestClient:
    c = TestClient(app)
    c.headers.update(_auth_header(seeded_users["doctor"]))
    return c


@pytest_asyncio.fixture
async def admin_client(override_get_db, seeded_users) -> TestClient:
    c = TestClient(app)
    c.headers.update(_auth_header(seeded_users["admin"]))
    return c


# ---------------------------------------------------------------------------
# 9. Domain fixtures: patient + case
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def sample_patient(db_session: AsyncSession) -> Patient:
    p = Patient(
        age=45,
        sex=PatientSex.Male,
        consent_recorded=True,
        consent_date=datetime.utcnow(),
        symptoms="cough, fever",
    )
    db_session.add(p)
    await db_session.commit()
    await db_session.refresh(p)
    return p


@pytest_asyncio.fixture
async def sample_case(db_session: AsyncSession, sample_patient: Patient, seeded_users) -> Case:
    c = Case(
        patient_id=sample_patient.patient_id,
        upload_tech_id=seeded_users["lab_technician"].user_id,
        visit_date=date.today(),
        status=CaseStatus.Pending_Review,
        priority=UrgencyLevel.Non_Critical,
    )
    db_session.add(c)
    await db_session.commit()
    await db_session.refresh(c)
    return c
