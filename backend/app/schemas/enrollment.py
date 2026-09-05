"""
Enrollment schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EnrollmentCreate(BaseModel):
    student_id: UUID
    course_id: UUID


class EnrollmentUpdate(BaseModel):
    status: Optional[str] = None
    progress_percentage: Optional[float] = Field(None, ge=0, le=100)


class TaskItem(BaseModel):
    id: Optional[str] = None
    title: str
    submission_link: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=1000)
    # Intern evaluation criteria use a ten-point scale. rating_scale keeps the
    # payload explicit so legacy five-point records can be migrated safely.
    rating_scale: Optional[int] = Field(default=None, ge=10, le=10)
    communication_rating: float = Field(0.0, ge=0, le=10)
    quality_rating: float = Field(0.0, ge=0, le=10)
    teamwork_rating: float = Field(0.0, ge=0, le=10)
    created_at: Optional[str] = None


class StudentProgressUpdate(BaseModel):
    attended_lessons_count: int = Field(..., ge=0)
    total_lessons_count: int = Field(10, ge=1)
    completed_tasks_count: int = Field(..., ge=0)
    total_tasks_count: int = Field(12, ge=1)
    feedback: Optional[str] = None
    tasks: Optional[list[TaskItem]] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    personal_email: Optional[str] = None
    email: Optional[str] = None


class EnrollmentResponse(BaseModel):
    id: UUID
    student_id: UUID
    course_id: UUID
    status: str
    progress_percentage: float
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    student_name: Optional[str] = None
    course_title: Optional[str] = None

    class Config:
        from_attributes = True
