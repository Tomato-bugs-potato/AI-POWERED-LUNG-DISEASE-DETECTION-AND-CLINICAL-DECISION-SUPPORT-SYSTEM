import pytest
import asyncio
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Replace with an in-memory test db or a separate test postgres instance (e.g. lungdb_test)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(class_=AsyncSession, bind=engine, expire_on_commit=False)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    """
    Function level isolated database.
    Since we use SQLite in memory here for speed, we need to create all tables
    first, yield the session, and then drop all tables.
    """
    from app.models import Base
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        yield session
        
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

# Mocked external dependencies for unit tests
@pytest.fixture
def mock_minio(mocker):
    # Mocking internal service storage uploads so we don't need real MinIO instances
    return mocker.patch("app.services.storage.upload_file", return_value="mock_path.png")

@pytest.fixture
def mock_celery(mocker):
    # Mock celery tasks to avoid real redis queuing
    return mocker.patch("app.workers.inference_tasks.run_inference_pipeline.delay", return_value=True)
