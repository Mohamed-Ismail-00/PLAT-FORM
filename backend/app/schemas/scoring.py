"""
Scoring engine schemas.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ScoreResult(BaseModel):
    score_type: str
    score_value: float
    breakdown: dict = {}


class ScoringResponse(BaseModel):
    enrollment_id: UUID
    student_name: str
    course_title: str
    scores: list[ScoreResult]
    overall_score: float
    classification: str
    engine_version: str
    calculated_at: datetime


class ClassificationSummary(BaseModel):
    classification: str
    count: int
    students: list[dict] = []
