"""Schemas for immutable certificate issuance audit events."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class CertificateIssuanceCreate(BaseModel):
    """A non-blocking audit request sent after a certificate download starts."""

    event_id: UUID
    student_id: UUID
    enrollment_id: UUID
    certificate_type: Literal["internship", "course"]
    file_format: Literal["pdf", "png"]
    program_title: str = Field(min_length=1, max_length=255)
    training_period: Optional[str] = Field(default=None, max_length=160)
    course_hours: Optional[int] = Field(default=None, ge=1, le=10_000)


class CertificateIssuanceResponse(BaseModel):
    id: UUID
    issued_at: datetime


class CertificateActivitySummary(BaseModel):
    issued: bool
    total_issuance_records: int
    last_issued_at: Optional[datetime] = None
    last_issued_by_name: Optional[str] = None


class CertificateIssuanceListItem(BaseModel):
    id: UUID
    student_id: Optional[UUID] = None
    enrollment_id: Optional[UUID] = None
    student_name: str
    student_code: str
    program_title: str
    training_period: Optional[str] = None
    course_hours: Optional[int] = None
    certificate_type: Literal["internship", "course"]
    file_format: Literal["pdf", "png"]
    issued_by_name: str
    issued_at: datetime
