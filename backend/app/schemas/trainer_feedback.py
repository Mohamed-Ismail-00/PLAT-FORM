"""API contracts for trainer feedback imports and performance analytics."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class RatingColumnMapping(BaseModel):
    column: str = Field(min_length=1, max_length=255)
    max_score: Optional[int] = Field(default=None, ge=1, le=100)


class TrainerFeedbackMapping(BaseModel):
    trainer_column: str = Field(min_length=1, max_length=255)
    submitted_at_column: Optional[str] = Field(default=None, max_length=255)
    feedback_column: Optional[str] = Field(default=None, max_length=255)
    rating_columns: list[RatingColumnMapping] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def unique_rating_columns(self):
        columns = [entry.column for entry in self.rating_columns]
        if len(columns) != len(set(columns)):
            raise ValueError("Each rating column can only be selected once")
        return self


class TrainerFeedbackPreview(BaseModel):
    filename: str
    source_format: str
    worksheet_name: Optional[str] = None
    headers: list[str]
    row_count: int
    sample_rows: list[dict[str, str]]
    suggested_mapping: TrainerFeedbackMapping | dict


class TrainerFeedbackImportResult(BaseModel):
    import_id: UUID
    imported_rows: int
    skipped_rows: int
    duplicate: bool = False


class TrainerAxisScore(BaseModel):
    name: str
    score: float
    response_count: int


class TrainerPerformanceItem(BaseModel):
    rank: int
    trainer_name: str
    response_count: int
    overall_score: Optional[float] = None
    confidence: str
    status: str
    axis_scores: list[TrainerAxisScore]
    feedback_count: int
    recent_feedback: list[str]


class TrainerPerformanceAnalytics(BaseModel):
    total_trainers: int
    total_responses: int
    overall_score: Optional[float] = None
    latest_import_at: Optional[datetime] = None
    trainers: list[TrainerPerformanceItem]
