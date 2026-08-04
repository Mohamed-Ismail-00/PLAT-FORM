"""
Assessment models: Quiz, Assignment, Project definitions.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin


class Quiz(Base, UUIDMixin):
    """Quiz definition within a course."""

    __tablename__ = "quizzes"

    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    total_marks: Mapped[float] = mapped_column(Float, nullable=False)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="quizzes")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="quiz")

    __table_args__ = (
        Index("idx_quizzes_course_id", "course_id"),
    )


class Assignment(Base, UUIDMixin):
    """Assignment definition within a course."""

    __tablename__ = "assignments"

    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_marks: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="assignments")
    submissions: Mapped[list["AssignmentSubmission"]] = relationship(back_populates="assignment")

    __table_args__ = (
        Index("idx_assignments_course_id", "course_id"),
    )


class Project(Base, UUIDMixin):
    """Project definition within a course."""

    __tablename__ = "projects"

    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_marks: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="projects")
    submissions: Mapped[list["ProjectSubmission"]] = relationship(back_populates="project")

    __table_args__ = (
        Index("idx_projects_course_id", "course_id"),
    )


from app.models.course import Course  # noqa: E402
from app.models.submission import QuizAttempt, AssignmentSubmission, ProjectSubmission  # noqa: E402
