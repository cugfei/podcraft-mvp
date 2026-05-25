"""FastAPI application entry point with CORS, logging & error handling."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.database import engine, Base
from app.api.v1.health import router as health_router
from app.exceptions import AppException
from app.middleware.logging import RequestLoggingMiddleware
from app.utils.response import success, error

# Import all models so Base.metadata is populated for create_all / Alembic
import app.models  # noqa: F401

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# ---------------------------------------------------------------------------
# Middleware (order matters — logging before CORS so every request is logged)
# ---------------------------------------------------------------------------
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Exception handlers — convert all exceptions to unified ``{code, data, message}``
# ---------------------------------------------------------------------------


@app.exception_handler(AppException)
async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
    """Handle business exceptions with their defined status code."""
    return JSONResponse(
        status_code=exc.code,
        content=error(exc.code, exc.message),
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    _request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Convert Starlette/FastAPI HTTPExceptions into unified format."""
    return JSONResponse(
        status_code=exc.status_code,
        content=error(exc.status_code, str(exc.detail)),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation errors into a unified 422 response."""
    details: list[str] = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err["loc"])
        details.append(f"{loc}: {err['msg']}")
    msg = "; ".join(details)
    return JSONResponse(
        status_code=422,
        content=error(422, msg),
    )


@app.exception_handler(IntegrityError)
async def integrity_exception_handler(
    _request: Request, _exc: IntegrityError
) -> JSONResponse:
    """Convert database constraint violations into a 409 response."""
    return JSONResponse(
        status_code=409,
        content=error(409, "Database constraint violation"),
    )


@app.exception_handler(Exception)
async def global_exception_handler(
    _request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler — hides internals when DEBUG is False."""
    settings_local = get_settings()
    msg = str(exc) if settings_local.DEBUG else "Internal server error"
    return JSONResponse(
        status_code=500,
        content=error(500, msg),
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(health_router, prefix="/api")


@app.on_event("startup")
async def startup_event() -> None:
    """Create database tables on startup (dev convenience)."""
    Base.metadata.create_all(bind=engine)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Execute tasks on application shutdown."""
    pass
