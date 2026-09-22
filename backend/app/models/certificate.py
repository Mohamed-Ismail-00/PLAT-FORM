"""Immutable certificate issuance audit records."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, UUIDMixin


class CertificateIssuanceEvent(Base, UUIDMixin):
    """Append-only record for an official certificate download request.

    Snapshot columns preserve the certificate details at issue time. Nullable
    foreign keys use ``SET NULL`` so this audit record survives later cleanup
    of students, enrollments, users, or organizations.
    """

    __tablename__ = "certificate_issuance_events"

    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="SET NULL"), nullable=True,
    )
    enrollment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="SET NULL"), nullable=True,
    )
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True,
    )
    issued_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    program_type: Mapped[str] = mapped_column(String(20), nullable=False)
    certificate_type: Mapped[str] = mapped_column(String(20), nullable=False)
    event_type: Mapped[str] = mapped_column(
        String(40), nullable=False, default="download_initiated", server_default="download_initiated",
    )
    file_format: Mapped[str] = mapped_column(String(10), nullable=False)
    source: Mapped[str] = mapped_column(
        String(40), nullable=False, default="admin_dashboard", server_default="admin_dashboard",
    )

    student_name_snapshot: Mapped[str] = mapped_column(String(220), nullable=False)
    student_code_snapshot: Mapped[str] = mapped_column(String(40), nullable=False)
    program_title_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    training_period_snapshot: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    course_hours_snapshot: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    issued_by_name_snapshot: Mapped[str] = mapped_column(String(220), nullable=False)
    issued_by_email_snapshot: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("program_type IN ('intern', 'student')", name="ck_certificate_events_program_type"),
        CheckConstraint(
            "certificate_type IN ('internship', 'course')",
            name="ck_certificate_events_certificate_type",
        ),
        CheckConstraint("file_format IN ('pdf', 'png')", name="ck_certificate_events_file_format"),
        CheckConstraint(
            "(program_type = 'intern' AND certificate_type = 'internship') "
            "OR (program_type = 'student' AND certificate_type = 'course')",
            name="ck_certificate_events_program_certificate_match",
        ),
        Index("idx_certificate_events_student_issued_at", "student_id", "issued_at"),
        Index("idx_certificate_events_enrollment_issued_at", "enrollment_id", "issued_at"),
        Index("idx_certificate_events_program_issued_at", "program_type", "issued_at"),
        Index("idx_certificate_events_organization_issued_at", "organization_id", "issued_at"),
    )
