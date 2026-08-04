"""
Prediction and Recommendation models for the AI Scoring Engine.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, Uuid, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import RecommendationSource, RecommendationStatus
from app.models.base import Base, UUIDMixin


class Prediction(Base, UUIDMixin):
    """Stores calculated scores from the AI Scoring Engine."""

    __tablename__ = "predictions"

    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False,
    )
    score_type: Mapped[str] = mapped_column(String(50), nullable=False)
    score_value: Mapped[float] = mapped_column(Float, nullable=False)
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    classification: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    engine_version: Mapped[str] = mapped_column(String(20), nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    enrollment: Mapped["Enrollment"] = relationship(back_populates="predictions")

    __table_args__ = (
        Index("idx_pred_enrollment_type", "enrollment_id", "score_type"),
        Index("idx_pred_enrollment_id", "enrollment_id"),
        Index("idx_pred_calculated_at", "calculated_at"),
        Index("idx_pred_classification", "classification"),
    )


class Recommendation(Base, UUIDMixin):
    """Recommended actions for students."""

    __tablename__ = "recommendations"

    enrollment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("enrollments.id", ondelete="CASCADE"), nullable=False,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default=RecommendationStatus.ACTIVE.value)
    source: Mapped[str] = mapped_column(String(30), default=RecommendationSource.MANUAL.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    enrollment: Mapped["Enrollment"] = relationship(back_populates="recommendations")

    __table_args__ = (
        Index("idx_rec_enrollment_id", "enrollment_id"),
        Index("idx_rec_status", "status"),
    )


from app.models.enrollment import Enrollment  # noqa: E402
