"""
Tracking models: Attendance, VideoProgress, ActivityLog.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import AttendanceStatus
from app.models.base import Base, UUIDMixin


class Attendance(Base, UUIDMixin):
    """Student attendance per lesson."""

    __tablename__ = "attendance"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="attendance_records")
    lesson: Mapped["Lesson"] = relationship(back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("student_id", "lesson_id", name="uq_attendance_student_lesson"),
        Index("idx_attendance_student_id", "student_id"),
        Index("idx_attendance_lesson_id", "lesson_id"),
        Index("idx_attendance_status", "status"),
    )


class VideoProgress(Base, UUIDMixin):
    """Track video watching progress per student per lesson."""

    __tablename__ = "video_progress"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False,
    )
    watched_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    watch_duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    last_position_seconds: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="video_progress")
    lesson: Mapped["Lesson"] = relationship(back_populates="video_progress")

    __table_args__ = (
        UniqueConstraint("student_id", "lesson_id", name="uq_video_progress_student_lesson"),
        Index("idx_video_progress_student_id", "student_id"),
    )


class ActivityLog(Base, UUIDMixin):
    """Basic activity tracking for engagement scoring."""

    __tablename__ = "activity_logs"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    resource_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid(as_uuid=True), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="activity_logs")

    __table_args__ = (
        Index("idx_activity_student_id", "student_id"),
        Index("idx_activity_created_at", "created_at"),
    )


from app.models.user import Student  # noqa: E402
from app.models.course import Lesson  # noqa: E402
