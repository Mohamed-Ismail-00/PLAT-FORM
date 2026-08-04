"""
Custom exception classes for consistent error handling.
"""

from typing import Any, Optional


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        code: str = "APP_ERROR",
        errors: Optional[list[Any]] = None,
    ):
        self.status_code = status_code
        self.detail = detail
        self.code = code
        self.errors = errors or []
        super().__init__(self.detail)


class NotFoundException(AppException):
    """Resource not found."""

    def __init__(self, resource: str = "Resource", detail: Optional[str] = None):
        super().__init__(
            status_code=404,
            detail=detail or f"{resource} not found",
            code="NOT_FOUND",
        )


class UnauthorizedException(AppException):
    """Authentication failed."""

    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=401,
            detail=detail,
            code="UNAUTHORIZED",
        )


class ForbiddenException(AppException):
    """Insufficient permissions."""

    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(
            status_code=403,
            detail=detail,
            code="FORBIDDEN",
        )


class ConflictException(AppException):
    """Duplicate resource."""

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(
            status_code=409,
            detail=detail,
            code="CONFLICT",
        )


class ValidationException(AppException):
    """Validation error."""

    def __init__(self, detail: str = "Validation error", errors: Optional[list] = None):
        super().__init__(
            status_code=422,
            detail=detail,
            code="VALIDATION_ERROR",
            errors=errors,
        )


class BusinessLogicException(AppException):
    """Business rule violation."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=422,
            detail=detail,
            code="BUSINESS_LOGIC_ERROR",
        )
