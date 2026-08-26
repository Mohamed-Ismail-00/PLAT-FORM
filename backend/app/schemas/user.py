"""
User and Student schemas.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── User Schemas ─────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    status: str
    last_login_at: Optional[datetime] = None
    roles: list[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = None


# ── Student Schemas ──────────────────────────────────────────────

class StudentResponse(BaseModel):
    id: UUID
    user_id: UUID
    student_code: str
    date_of_birth: Optional[date] = None
    education_level: Optional[str] = None
    user: Optional[UserResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    date_of_birth: Optional[date] = None
    education_level: Optional[str] = Field(None, max_length=50)


class StudentListItem(BaseModel):
    """Lightweight student item for lists."""
    id: UUID
    student_code: str
    full_name: str
    email: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class QuickAddStudentRequest(BaseModel):
    """Schema for quickly adding a student to a track."""
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    course_id: UUID
    personal_email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()

