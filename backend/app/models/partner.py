"""Isolated partner workspace models.

Partner records intentionally live outside the platform User/Student tables.
This keeps a white-label partner pilot from becoming visible to the internal
Innovera workspace or its existing student APIs.
"""

from datetime import datetime, timezone
from typing import Optional

import uuid

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, LargeBinary, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class PartnerUser(Base, UUIDMixin, TimestampMixin):
    """User account scoped to one partner workspace."""

    __tablename__ = "partner_users"

    workspace_slug: Mapped[str] = mapped_column(String(80), nullable=False, default="elswedy")
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False, default="partner_admin")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    organization: Mapped[Optional["Organization"]] = relationship(back_populates="partner_users")

    __table_args__ = (
        Index("idx_partner_users_workspace", "workspace_slug"),
    )


class PartnerStudent(Base, UUIDMixin, TimestampMixin):
    """A student belonging to a partner workspace, not the core platform."""

    __tablename__ = "partner_students"

    workspace_slug: Mapped[str] = mapped_column(String(80), nullable=False, default="elswedy")
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    university_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    track_name: Mapped[str] = mapped_column(String(80), nullable=False)
    batch_name: Mapped[str] = mapped_column(String(20), nullable=False, default="BATCH 2")
    student_code: Mapped[str] = mapped_column(String(40), nullable=False)
    attended_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_tasks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tasks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    overall_rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")
    report_status: Mapped[str] = mapped_column(String(30), nullable=False, default="not_started")
    certificate_status: Mapped[str] = mapped_column(String(30), nullable=False, default="not_issued")
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint("workspace_slug", "student_code", name="uq_partner_student_workspace_code"),
        Index("idx_partner_students_workspace", "workspace_slug"),
        Index("idx_partner_students_track_batch", "workspace_slug", "track_name", "batch_name"),
    )


class PartnerDocument(Base, UUIDMixin, TimestampMixin):
    """An issued document safely shared with one partner organization.

    Files are stored as bytes for the current pilot so the partner portal can
    download them through an authenticated API endpoint. The organization and
    student foreign keys keep the document scoped to the same canonical
    enrollment that powers the partner directory.
    """

    __tablename__ = "partner_documents"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False,
    )
    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False,
    )
    document_type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    __table_args__ = (
        Index("idx_partner_documents_scope", "organization_id", "document_type", "is_current"),
        Index("idx_partner_documents_student", "student_id", "document_type", "is_current"),
    )
