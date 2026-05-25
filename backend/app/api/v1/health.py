"""Health check API endpoint."""

from fastapi import APIRouter

from app.utils.response import success

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    """Return the health status in unified response format.

    Returns:
        dict: ``{"code": 0, "data": {"status": "ok"}, "message": "ok"}``
    """
    return success({"status": "ok"})
