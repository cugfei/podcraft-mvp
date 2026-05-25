"""Health check API endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    """Return the health status of the API.

    Returns:
        dict: A dictionary with the key "status" set to "ok".
    """
    return {"status": "ok"}
