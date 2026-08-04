"""
Notification and InstructorNote models.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import NotificationType
from app.models.base import Base, UUIDMixin


class Notification(Base, UUIDMixin):
    """In-app notifications for users."""

    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), default=NotificationType.INFO.value)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="notifications")

    __table_args__ = (
        Index("idx_notif_user_read", "user_id", "is_read"),
        Index("idx_notif_user_id", "user_id"),
        Index("idx_notif_created_at", "created_at"),
    )


class InstructorNote(Base, UUIDMixin):
    """Free-text notes by instructors about student performance."""

    __tablename__ = "instructor_notes"

    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False,
    )
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("instructors.id"), nullable=False,
    )
    note: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    enrollment: Mapped["Enrollment"] = relationship(back_populates="instructor_notes")
    instructor: Mapped["Instructor"] = relationship(back_populates="instructor_notes")

    __table_args__ = (
        Index("idx_notes_enrollment_id", "enrollment_id"),
    )


from app.models.user import User, Instructor  # noqa: E402
from app.models.enrollment import Enrollment  # noqa: E402
