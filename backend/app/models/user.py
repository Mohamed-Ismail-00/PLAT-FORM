"""
User, Student, and Instructor models.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Index, String, Text, Uuid, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import UserStatus
from app.models.base import Base, TimestampMixin, UUIDMixin


class User(Base, UUIDMixin, TimestampMixin):
    """Central authentication table for all users."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=UserStatus.ACTIVE.value, nullable=False)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student_profile: Mapped[Optional["Student"]] = relationship(back_populates="user", uselist=False)
    instructor_profile: Mapped[Optional["Instructor"]] = relationship(back_populates="user", uselist=False)
    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")

    __table_args__ = (
        Index("idx_users_status", "status"),
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Student(Base, UUIDMixin):
    """Extended profile for students."""

    __tablename__ = "students"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False,
    )
    student_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    education_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="student_profile")
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="student")
    attendance_records: Mapped[list["Attendance"]] = relationship(back_populates="student")
    video_progress: Mapped[list["VideoProgress"]] = relationship(back_populates="student")
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="student")
    assignment_submissions: Mapped[list["AssignmentSubmission"]] = relationship(back_populates="student")
    project_submissions: Mapped[list["ProjectSubmission"]] = relationship(back_populates="student")
    activity_logs: Mapped[list["ActivityLog"]] = relationship(back_populates="student")

    __table_args__ = (
        Index("idx_students_user_id", "user_id", unique=True),
        Index("idx_students_code", "student_code", unique=True),
    )


class Instructor(Base, UUIDMixin):
    """Extended profile for instructors."""

    __tablename__ = "instructors"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False,
    )
    specialization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="instructor_profile")
    courses: Mapped[list["Course"]] = relationship(back_populates="instructor")
    instructor_notes: Mapped[list["InstructorNote"]] = relationship(back_populates="instructor")

    __table_args__ = (
        Index("idx_instructors_user_id", "user_id", unique=True),
    )


# Forward references are resolved via relationship() string annotations
from app.models.role import UserRole  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.enrollment import Enrollment  # noqa: E402
from app.models.tracking import Attendance, VideoProgress, ActivityLog  # noqa: E402
from app.models.submission import QuizAttempt, AssignmentSubmission, ProjectSubmission  # noqa: E402
from app.models.notification import Notification, InstructorNote  # noqa: E402
