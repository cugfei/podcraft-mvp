"""HTTP request logging middleware for observability."""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every request with method, path, status code, and duration.

    Example log line:  GET /api/health -> 200 (1.23ms)
    """

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        start = time.monotonic()
        response = await call_next(request)
        duration = round((time.monotonic() - start) * 1000, 2)
        logger.info(
            "%s %s -> %s (%.2fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )
        return response
