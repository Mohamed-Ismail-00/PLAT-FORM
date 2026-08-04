"""
Course and Lesson schemas.
"""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CourseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    instructor_id: UUID
    total_lessons: int = Field(default=0, ge=0)
    duration_weeks: Optional[int] = Field(None, ge=1)
    difficulty_level: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CourseUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    total_lessons: Optional[int] = Field(None, ge=0)
    duration_weeks: Optional[int] = Field(None, ge=1)
    status: Optional[str] = None
    difficulty_level: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class CourseResponse(BaseModel):
    id: UUID
    instructor_id: UUID
    title: str
    description: Optional[str] = None
    total_lessons: int
    duration_weeks: Optional[int] = None
    status: str
    difficulty_level: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    instructor_name: Optional[str] = None
    enrolled_count: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LessonCreate(BaseModel):
    course_id: UUID
    title: str = Field(min_length=1, max_length=255)
    order_number: int = Field(ge=1)
    duration_minutes: Optional[int] = Field(None, ge=1)
    video_url: Optional[str] = Field(None, max_length=500)
    type: str = "recorded"
    scheduled_at: Optional[datetime] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    order_number: Optional[int] = Field(None, ge=1)
    duration_minutes: Optional[int] = Field(None, ge=1)
    video_url: Optional[str] = Field(None, max_length=500)
    type: Optional[str] = None
    scheduled_at: Optional[datetime] = None


class LessonResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    order_number: int
    duration_minutes: Optional[int] = None
    video_url: Optional[str] = None
    type: str
    scheduled_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
