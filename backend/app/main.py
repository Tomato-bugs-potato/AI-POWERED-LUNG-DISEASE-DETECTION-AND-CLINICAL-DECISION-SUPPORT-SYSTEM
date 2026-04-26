import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from app.config import settings
from app.api.v1.router import api_router
from contextlib import asynccontextmanager
import time

# Configure structured JSON logging
import structlog
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logger = structlog.get_logger(__name__)

# Try to import prometheus, ignore if not installed in dev
try:
    from prometheus_fastapi_instrumentator import Instrumentator
    PROMETHEUS_ENABLED = True
except ImportError:
    PROMETHEUS_ENABLED = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize connections here (DB, Redis, MinIO)
    logger.info("Starting up FastAPI application...")
    
    from app.db.session import engine, async_session_maker
    from app.models import Base, User
    from app.db.base import Role
    from app.core.security import hash_password
    from sqlalchemy import select
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        if settings.SEED_TEST_USERS:
            async with async_session_maker() as session:
                for email, name, role in [
                    ("admin@test.com", "System Admin", Role.Admin),
                    ("doctor@test.com", "Dr. Endashaw", Role.Doctor)
                ]:
                    result = await session.execute(select(User).where(User.email == email))
                    if not result.scalar_one_or_none():
                        user = User(
                            email=email,
                            password_hash=hash_password("password"),
                            name=name,
                            role=role
                        )
                        session.add(user)
                        try:
                            await session.commit()
                            logger.info(f"Seeded default {role.value} user: {email} / password")
                        except IntegrityError:
                            await session.rollback()
                            logger.warning(f"User {email} already exists (race condition), skipped seeding.")
    
    # Ensure MinIO buckets exist
    from app.services.storage import ensure_buckets_exist
    try:
        ensure_buckets_exist()
        logger.info("MinIO buckets verified/created")
    except Exception as e:
        logger.warning(f"Could not ensure MinIO buckets: {e}")

    # Initialize Redis connection
    from app.core.redis import get_redis
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed (non-fatal): {e}")

    yield
    # Shutdown: Close connections
    logger.info("Shutting down FastAPI application...")
    from app.core.redis import close_redis
    await close_redis()
    await engine.dispose()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware — origins read from FRONTEND_URL env var (comma-separated)
_cors_origins = [o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if PROMETHEUS_ENABLED:
    # Phase 10.2: Autogenerate /metrics endpoint and standard request metrics
    Instrumentator().instrument(app).expose(app)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(
        "request_completed",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_sec=process_time
    )
    return response

# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Stringify the body to prevent JSON serialization errors for raw bytes (like File uploads)
    body_str = str(exc.body) if exc.body else None
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": body_str},
    )

import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Include central API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Include health routes at root level for orchestrators
from app.api.v1.endpoints import health
app.include_router(health.router, prefix="/health", tags=["System"])
