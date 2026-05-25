"""FastAPI application entry point with CORS configuration."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.health import router as health_router

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
    """Execute tasks on application startup."""
    pass


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Execute tasks on application shutdown."""
    pass
