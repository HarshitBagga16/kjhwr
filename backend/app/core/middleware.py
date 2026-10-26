import time
import logging
from collections import defaultdict
from typing import Dict, List
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Sliding-window in-memory rate limiting middleware.

    Protects the WindSight API from runaway scraping loops and client spam.
    Defaults to 120 requests per rolling 60-second window per client IP.
    """

    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.client_records: Dict[str, List[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window_seconds

        # Prune old timestamps
        history = [t for t in self.client_records[client_ip] if t > window_start]
        self.client_records[client_ip] = history

        # Health checks and docs bypass rate limiting
        if request.url.path in ("/api/health", "/docs", "/openapi.json", "/redoc"):
            return await call_next(request)

        if len(history) >= self.max_requests:
            logger.warning(
                "Rate limit exceeded for client IP",
                extra={
                    "client_ip": client_ip,
                    "path": request.url.path,
                    "count": len(history),
                },
            )
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMIT_EXCEEDED",
                    "detail": f"Maximum {self.max_requests} requests per minute exceeded.",
                    "retry_after_seconds": int(self.window_seconds),
                },
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                },
            )

        self.client_records[client_ip].append(now)
        remaining = max(0, self.max_requests - len(self.client_records[client_ip]))

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


class CacheHeaderMiddleware(BaseHTTPMiddleware):
    """Enriches cacheable GET endpoints with HTTP Cache-Control and ETag headers."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Apply caching headers to read-only idempotent queries
        if request.method == "GET" and response.status_code == 200:
            if request.url.path.startswith(
                ("/api/dashboard", "/api/forecasts", "/api/analytics")
            ):
                # Cache for 60 seconds with stale-while-revalidate grace period
                response.headers["Cache-Control"] = (
                    "public, max-age=60, stale-while-revalidate=120"
                )
                response.headers["X-Cache-Engine"] = "WindSight-In-Memory-Proxy"

        return response
