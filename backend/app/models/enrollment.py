"""
Enrollment model: Student <-> Course junction with status tracking.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import BatchName, EnrollmentStatus
from app.models.base import Base, UUIDMixin


class Enrollment(Base, UUIDMixin):
    """Student enrollment in a course."""

    __tablename__ = "enrollments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False,
    )
    batch_name: Mapped[str] = mapped_column(
        String(20),
        default=BatchName.BATCH_1.value,
        server_default=BatchName.BATCH_1.value,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), default=EnrollmentStatus.ACTIVE.value)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    attended_lessons_count: Mapped[int] = mapped_column(default=0)
    total_lessons_count: Mapped[int] = mapped_column(default=10)
    completed_tasks_count: Mapped[int] = mapped_column(default=0)
    total_tasks_count: Mapped[int] = mapped_column(default=12)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    student: Mapped["Student"] = relationship(back_populates="enrollments")
    course: Mapped["Course"] = relationship(back_populates="enrollments")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="enrollment")
    recommendations: Mapped[list["Recommendation"]] = relationship(back_populates="enrollment")
    instructor_notes: Mapped[list["InstructorNote"]] = relationship(back_populates="enrollment")

    __table_args__ = (
        UniqueConstraint("student_id", "course_id", name="uq_enrollment_student_course"),
        Index("idx_enrollments_student_id", "student_id"),
        Index("idx_enrollments_course_id", "course_id"),
        Index("idx_enrollments_status", "status"),
    )


from app.models.user import Student  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.prediction import Prediction, Recommendation  # noqa: E402
from app.models.notification import InstructorNote  # noqa: E402
