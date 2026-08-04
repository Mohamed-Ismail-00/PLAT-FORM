"""
Common schemas: pagination, error responses, shared types.
"""

from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Query parameters for pagination."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class PaginationMeta(BaseModel):
    """Pagination metadata in response."""
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response wrapper."""
    data: list[T]
    meta: PaginationMeta


class DataResponse(BaseModel, Generic[T]):
    """Standard single-item response wrapper."""
    data: T


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str
    code: str
    errors: list[Any] = []


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str
