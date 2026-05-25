"""Pydantic schemas package.

Exports:
    - BaseResponse / SuccessResponse / ErrorResponse  — unified API shapes
"""

from app.schemas.response import BaseResponse, ErrorResponse, SuccessResponse  # noqa: F401
