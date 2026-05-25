"""Convenience helpers for building unified API responses."""

from typing import Any


def success(data: Any = None, message: str = "ok") -> dict:
    """Build a unified success response dict.

    Args:
        data: The payload to return to the client.
        message: Optional human-readable message.

    Returns:
        dict with keys ``code``, ``data``, and ``message``.
    """
    return {"code": 0, "data": data, "message": message}


def error(code: int, message: str = "Error") -> dict:
    """Build a unified error response dict.

    Args:
        code: HTTP-like status code (4xx / 5xx).
        message: Human-readable error description.

    Returns:
        dict with keys ``code``, ``data`` (null), and ``message``.
    """
    return {"code": code, "data": None, "message": message}
