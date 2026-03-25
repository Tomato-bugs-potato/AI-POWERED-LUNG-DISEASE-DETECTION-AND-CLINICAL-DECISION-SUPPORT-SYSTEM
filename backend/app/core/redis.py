"""
Redis client for OTP storage, session caching, login attempt tracking, and report caching.
"""
import redis.asyncio as aioredis
from app.config import settings

redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Get or create the async Redis connection."""
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
    return redis_client


async def close_redis():
    """Close the Redis connection pool on shutdown."""
    global redis_client
    if redis_client is not None:
        await redis_client.close()
        redis_client = None
