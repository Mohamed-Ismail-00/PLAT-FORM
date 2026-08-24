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


class StudentProgressUpdate(BaseModel):
    attended_lessons_count: int = Field(..., ge=0)
    total_lessons_count: int = Field(10, ge=1)
    completed_tasks_count: int = Field(..., ge=0)
    total_tasks_count: int = Field(12, ge=1)
    feedback: Optional[str] = None


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
