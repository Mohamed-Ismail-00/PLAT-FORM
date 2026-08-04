"""
Tracking schemas: Attendance, Video Progress.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AttendanceCreate(BaseModel):
    student_id: UUID
    lesson_id: UUID
    status: str  # present, absent, late, excused


class AttendanceBulkCreate(BaseModel):
    lesson_id: UUID
    records: list[AttendanceCreate]


class AttendanceUpdate(BaseModel):
    status: str


class AttendanceResponse(BaseModel):
    id: UUID
    student_id: UUID
    lesson_id: UUID
    status: str
    checked_at: datetime
    student_name: Optional[str] = None
    lesson_title: Optional[str] = None

    class Config:
        from_attributes = True


class VideoProgressUpdate(BaseModel):
    student_id: UUID
    lesson_id: UUID
    watched_percentage: float = Field(ge=0, le=100)
    watch_duration_seconds: int = Field(ge=0)
    last_position_seconds: int = Field(ge=0)


class VideoProgressResponse(BaseModel):
    id: UUID
    student_id: UUID
    lesson_id: UUID
    watched_percentage: float
    watch_duration_seconds: int
    last_position_seconds: int
    completed: bool
    updated_at: datetime

    class Config:
        from_attributes = True
