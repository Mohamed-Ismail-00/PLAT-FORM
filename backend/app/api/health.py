"""
Health check endpoint.
"""

from fastapi import APIRouter

health_router = APIRouter(tags=["Health"])


@health_router.get("/health")
async def health_check():
    """Basic health check."""
    return {"status": "healthy", "service": "Innovera SPI"}
