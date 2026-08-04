"""
Application middleware: logging, error handling, request timing.
"""

import time
import uuid

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.exceptions import AppException

logger = structlog.get_logger()


def setup_middleware(app: FastAPI):
    """Register all custom middleware."""

    @app.middleware("http")
    async def request_logging_middleware(request: Request, call_next):
        """Log every request with timing and correlation ID."""
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Attach request_id to request state
        request.state.request_id = request_id

        response = await call_next(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)

        logger.info(
            "request_completed",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration_ms}ms"

        return response

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        """Handle custom application exceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "code": exc.code,
                "errors": exc.errors,
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """Handle unexpected exceptions."""
        logger.error(
            "unhandled_exception",
            error=str(exc),
            path=request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={
                "detail": "An internal server error occurred",
                "code": "INTERNAL_ERROR",
                "errors": [],
            },
        )
