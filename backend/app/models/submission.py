"""
Submission models: QuizAttempt, AssignmentSubmission, ProjectSubmission.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import SubmissionStatus
from app.models.base import Base, UUIDMixin


class QuizAttempt(Base, UUIDMixin):
    """A student's attempt at a quiz."""

    __tablename__ = "quiz_attempts"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    quiz_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False,
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    percentage: Mapped[float] = mapped_column(Float, nullable=False)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="quiz_attempts")
    quiz: Mapped["Quiz"] = relationship(back_populates="attempts")

    __table_args__ = (
        Index("idx_quiz_attempts_student_quiz", "student_id", "quiz_id"),
        Index("idx_quiz_attempts_student_id", "student_id"),
    )


class AssignmentSubmission(Base, UUIDMixin):
    """A student's assignment submission."""

    __tablename__ = "assignment_submissions"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False,
    )
    submission_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SubmissionStatus.SUBMITTED.value)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    graded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="assignment_submissions")
    assignment: Mapped["Assignment"] = relationship(back_populates="submissions")

    __table_args__ = (
        UniqueConstraint("student_id", "assignment_id", name="uq_asub_student_assignment"),
        Index("idx_asub_student_id", "student_id"),
        Index("idx_asub_status", "status"),
    )


class ProjectSubmission(Base, UUIDMixin):
    """A student's project submission."""

    __tablename__ = "project_submissions"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False,
    )
    submission_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=SubmissionStatus.SUBMITTED.value)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    graded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="project_submissions")
    project: Mapped["Project"] = relationship(back_populates="submissions")

    __table_args__ = (
        UniqueConstraint("student_id", "project_id", name="uq_psub_student_project"),
        Index("idx_psub_student_id", "student_id"),
    )


from app.models.user import Student  # noqa: E402
from app.models.assessment import Quiz, Assignment, Project  # noqa: E402
