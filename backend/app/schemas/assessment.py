"""
Assessment schemas: Quiz, Assignment, Project.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Quiz ─────────────────────────────────────────────────────────

class QuizCreate(BaseModel):
    course_id: UUID
    title: str = Field(min_length=1, max_length=255)
    total_marks: float = Field(gt=0)
    duration_minutes: Optional[int] = Field(None, ge=1)
    due_date: Optional[datetime] = None


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    total_marks: Optional[float] = Field(None, gt=0)
    duration_minutes: Optional[int] = Field(None, ge=1)
    due_date: Optional[datetime] = None


class QuizResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    total_marks: float
    duration_minutes: Optional[int] = None
    due_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Quiz Attempt ─────────────────────────────────────────────────

class QuizAttemptCreate(BaseModel):
    student_id: UUID
    quiz_id: UUID
    score: float = Field(ge=0)
    percentage: float = Field(ge=0, le=100)
    attempt_number: int = Field(default=1, ge=1)


class QuizAttemptResponse(BaseModel):
    id: UUID
    student_id: UUID
    quiz_id: UUID
    score: float
    percentage: float
    attempt_number: int
    completed_at: datetime
    quiz_title: Optional[str] = None

    class Config:
        from_attributes = True


# ── Assignment ───────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    course_id: UUID
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    total_marks: float = Field(gt=0)
    due_date: Optional[datetime] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    total_marks: Optional[float] = Field(None, gt=0)
    due_date: Optional[datetime] = None


class AssignmentResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    total_marks: float
    due_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Submission ───────────────────────────────────────────────────

class SubmissionCreate(BaseModel):
    student_id: UUID
    submission_url: Optional[str] = Field(None, max_length=500)


class SubmissionGrade(BaseModel):
    score: float = Field(ge=0)
    feedback: Optional[str] = None


class AssignmentSubmissionResponse(BaseModel):
    id: UUID
    student_id: UUID
    assignment_id: UUID
    submission_url: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    status: str
    submitted_at: datetime
    graded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Project ──────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    course_id: UUID
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    total_marks: float = Field(gt=0)
    due_date: Optional[datetime] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    total_marks: Optional[float] = Field(None, gt=0)
    due_date: Optional[datetime] = None


class ProjectResponse(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: Optional[str] = None
    total_marks: float
    due_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProjectSubmissionResponse(BaseModel):
    id: UUID
    student_id: UUID
    project_id: UUID
    submission_url: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None
    status: str
    submitted_at: datetime
    graded_at: Optional[datetime] = None

    class Config:
        from_attributes = True
