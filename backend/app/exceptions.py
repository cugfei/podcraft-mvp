"""Business exception classes for PodCraft API."""


class AppException(Exception):
    """Base business exception with HTTP status code and user-facing message."""

    def __init__(self, code: int = 400, message: str = "Bad Request") -> None:
        self.code = code
        self.message = message
        super().__init__(message)


class NotFoundException(AppException):
    """Resource not found (404)."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(code=404, message=message)


class ForbiddenException(AppException):
    """Access forbidden (403)."""

    def __init__(self, message: str = "Forbidden") -> None:
        super().__init__(code=403, message=message)


class BadRequestException(AppException):
    """Invalid request (400)."""

    def __init__(self, message: str = "Bad Request") -> None:
        super().__init__(code=400, message=message)


class ConflictException(AppException):
    """Resource conflict (409)."""

    def __init__(self, message: str = "Conflict") -> None:
        super().__init__(code=409, message=message)


class UnauthorizedException(AppException):
    """Authentication required (401)."""

    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(code=401, message=message)
