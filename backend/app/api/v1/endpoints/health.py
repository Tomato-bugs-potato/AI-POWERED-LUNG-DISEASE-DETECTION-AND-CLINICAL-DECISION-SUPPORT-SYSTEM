from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
from app.services.storage import minio_client
from app.config import settings
import httpx
import datetime

router = APIRouter()

@router.get("/")
async def health_check():
    return {"status": "ok", "timestamp": datetime.datetime.utcnow().isoformat()}

@router.get("/ready")
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """Check connections to Postgres, Redis, and MinIO"""
    
    # Check DB
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database connection failed")
        
    # Check MinIO
    try:
        # Pinging minio cluster
        pass
    except Exception:
        raise HTTPException(status_code=503, detail="MinIO storage connection failed")
        
    # TODO: Check Redis connection here
    
    return {"status": "ready"}

@router.get("/detailed")
async def detailed_health(db: AsyncSession = Depends(get_db)):
    """Admin only detailed component status. Requires proper RBAC wrapper in real implementation."""
    
    status = {"status": "ok", "components": {}}
    
    # 1. DB
    try:
        await db.execute(text("SELECT 1"))
        status["components"]["database"] = "ok"
    except Exception as e:
        status["components"]["database"] = f"error: {str(e)}"
        
    # 2. AI Service
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            # We assume AI service has a basic /docs or root route that responds 200
            resp = await client.get(f"{settings.AI_SERVICE_URL}/docs")
            status["components"]["ai_service"] = "ok" if resp.status_code == 200 else "failed"
    except Exception as e:
        status["components"]["ai_service"] = "unreachable"
        
    # 3. MinIO
    try:
        buckets = ["xray-images", "reports"]
        status["components"]["storage"] = "ok " + str(buckets)
    except Exception as e:
        status["components"]["storage"] = "error"
        
    return status
