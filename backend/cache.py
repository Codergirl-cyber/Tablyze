import hashlib
import json
import logging
import os

logger = logging.getLogger(__name__)


class RedisCache:
    """
    Redis-backed cache for dataset analysis results.

    Uses a SHA-256 hash of the uploaded CSV content as the cache key.
    Designed to fail gracefully: if Redis is unavailable, caching is
    silently disabled and the application continues to work normally.
    """

    def __init__(self):
        self.available = False
        self._client = None
        self.ttl = int(os.getenv("CACHE_TTL", "3600"))  # default 1 hour

        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        if not redis_url:
            logger.info(
                "RedisCache: REDIS_URL is not set — caching disabled."
            )
            return

        try:
            import redis as redis_lib

            self._client = redis_lib.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            # Verify connectivity with a lightweight ping
            self._client.ping()
            self.available = True
            logger.info(
                "RedisCache: connected to Redis at %s (TTL=%ss)",
                redis_url,
                self.ttl,
            )
        except Exception as exc:
            logger.warning(
                "RedisCache: failed to connect to Redis at %s — "
                "caching disabled. Error: %s",
                redis_url,
                exc,
            )
            self._client = None
            self.available = False

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, content: bytes) -> dict | None:
        """
        Retrieve cached analysis results for the given CSV content.

        Args:
            content: Raw bytes of the uploaded CSV file.

        Returns:
            The deserialised result dict if found, or ``None`` on a
            cache miss (or when the cache is unavailable).
        """
        if not self.available or self._client is None:
            return None

        key = self._compute_hash(content)
        try:
            raw = self._client.get(key)
            if raw is not None:
                logger.info("RedisCache: HIT for key %s", key)
                return json.loads(raw)
            logger.info("RedisCache: MISS for key %s", key)
            return None
        except Exception as exc:
            logger.warning(
                "RedisCache: get failed for key %s — %s", key, exc
            )
            return None

    def set(self, content: bytes, result: dict) -> None:
        """
        Store analysis results in the cache.

        Args:
            content: Raw bytes of the uploaded CSV file (used for the key).
            result:  The analysis result dict to cache.
        """
        if not self.available or self._client is None:
            return

        key = self._compute_hash(content)
        try:
            self._client.setex(key, self.ttl, json.dumps(result, default=str))
            logger.info(
                "RedisCache: stored key %s (TTL=%ss)", key, self.ttl
            )
        except Exception as exc:
            logger.warning(
                "RedisCache: set failed for key %s — %s", key, exc
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_hash(content: bytes) -> str:
        """Return the SHA-256 hex digest of *content* prefixed with ``csv:``."""
        return "csv:" + hashlib.sha256(content).hexdigest()

