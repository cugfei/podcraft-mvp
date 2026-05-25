"""Unified API response schemas for PodCraft."""

from typing import Any, Optional

from pydantic import BaseModel


class BaseResponse(BaseModel):
    """Base response structure shared by all API responses."""

    code: int = 0
    message: str = "ok"


class SuccessResponse(BaseResponse):
    """Wrapper for successful API responses containing data."""

    data: Any = None


class ErrorResponse(BaseResponse):
    """Wrapper for error API responses (data is always null)."""

    data: None = None
    message: str = "Error"
