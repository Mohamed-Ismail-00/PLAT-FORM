"""Persistent, traceable Microsoft Forms feedback imports for trainers."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin


class TrainerFeedbackImport(Base, UUIDMixin, TimestampMixin):
    """One approved spreadsheet import, including its field mapping and provenance."""

    __tablename__ = "trainer_feedback_imports"

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_sha256: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    source_format: Mapped[str] = mapped_column(String(10), nullable=False)
    worksheet_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    column_mapping: Mapped[dict] = mapped_column(JSON, nullable=False)
    imported_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    skipped_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    imported_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False,
    )

    __table_args__ = (
        Index("idx_trainer_feedback_imports_imported_at", "imported_at"),
    )


class TrainerFeedbackResponse(Base, UUIDMixin, TimestampMixin):
    """A normalized response while retaining the original field values for auditability."""

    __tablename__ = "trainer_feedback_responses"

    import_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("trainer_feedback_imports.id", ondelete="CASCADE"), nullable=False,
    )
    source_row_number: Mapped[int] = mapped_column(Integer, nullable=False)
    trainer_name: Mapped[str] = mapped_column(String(220), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    normalized_ratings: Mapped[dict] = mapped_column(JSON, nullable=False)
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    feedback_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False)

    __table_args__ = (
        UniqueConstraint("import_id", "source_row_number", name="uq_trainer_feedback_import_row"),
        Index("idx_trainer_feedback_responses_trainer", "trainer_name"),
        Index("idx_trainer_feedback_responses_import", "import_id"),
    )
