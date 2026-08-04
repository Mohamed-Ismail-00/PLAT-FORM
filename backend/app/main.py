"""
FastAPI application entry point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.middleware import setup_middleware
from app.api.v1.router import api_v1_router
from app.api.health import health_router
from app.db.session import engine


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Student Performance Intelligence Platform by Innovera",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Custom Middleware ────────────────────────────────────────────
setup_middleware(app)

# ── Routers ──────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(api_v1_router, prefix="/api/v1")
