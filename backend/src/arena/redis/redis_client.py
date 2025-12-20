"""Redis client setup and connection management"""

import redis
from arena.config.settings import settings
from redis import ConnectionPool

# Global connection pool
_redis_pool: ConnectionPool | None = None
_redis_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    """
    Get or create Redis client with connection pooling.

    Returns:
        Redis client instance
    """
    global _redis_client, _redis_pool

    if _redis_client is None:
        # Create connection pool
        _redis_pool = ConnectionPool(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password,
            decode_responses=True,
            max_connections=50,
        )

        # Create client from pool
        _redis_client = redis.Redis(connection_pool=_redis_pool)

    return _redis_client


def ping_redis() -> bool:
    """
    Test Redis connection with ping.

    Returns:
        True if connection successful, False otherwise
    """
    try:
        client = get_redis_client()
        result = client.ping()
        return result
    except Exception:
        return False
