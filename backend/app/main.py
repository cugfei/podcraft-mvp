"""FastAPI application entry point with CORS configuration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
from app.api.v1.health import router as health_router

# Import all models so Base.metadata is populated for create_all / Alembic
import app.models  # noqa: F401

settings = get_settings()

# Create FastAPI application instance
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# Configure CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 routers
app.include_router(health_router, prefix="/api")


@app.on_event("startup")
async def startup_event() -> None:
    """Create database tables on startup (dev convenience)."""
    Base.metadata.create_all(bind=engine)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Execute tasks on application shutdown."""
    pass
