"""
Course and Lesson models.
"""

import uuid
from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import CourseStatus, DifficultyLevel, LessonType
from app.models.base import Base, TimestampMixin, UUIDMixin


class Course(Base, UUIDMixin, TimestampMixin):
    """A learning course taught by an instructor."""

    __tablename__ = "courses"

    instructor_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("instructors.id"), nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_lessons: Mapped[int] = mapped_column(Integer, default=0)
    duration_weeks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=CourseStatus.DRAFT.value)
    difficulty_level: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Relationships
    instructor: Mapped["Instructor"] = relationship(back_populates="courses")
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="course")
    lessons: Mapped[list["Lesson"]] = relationship(back_populates="course", order_by="Lesson.order_number")
    quizzes: Mapped[list["Quiz"]] = relationship(back_populates="course")
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="course")
    projects: Mapped[list["Project"]] = relationship(back_populates="course")

    __table_args__ = (
        Index("idx_courses_instructor", "instructor_id"),
        Index("idx_courses_status", "status"),
    )


class Lesson(Base, UUIDMixin):
    """Individual lesson within a course."""

    __tablename__ = "lessons"

    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_number: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    type: Mapped[str] = mapped_column(String(20), default=LessonType.RECORDED.value)
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    course: Mapped["Course"] = relationship(back_populates="lessons")
    attendance_records: Mapped[list["Attendance"]] = relationship(back_populates="lesson")
    video_progress: Mapped[list["VideoProgress"]] = relationship(back_populates="lesson")

    __table_args__ = (
        Index("idx_lessons_course_order", "course_id", "order_number"),
        Index("idx_lessons_course_id", "course_id"),
    )


from app.models.user import Instructor  # noqa: E402
from app.models.enrollment import Enrollment  # noqa: E402
from app.models.assessment import Quiz, Assignment, Project  # noqa: E402
from app.models.tracking import Attendance, VideoProgress  # noqa: E402
