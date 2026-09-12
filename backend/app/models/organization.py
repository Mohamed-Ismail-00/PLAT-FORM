"""Organizations that own or sponsor student program enrollments."""

import uuid
from typing import Optional

from sqlalchemy import Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Organization(Base, UUIDMixin, TimestampMixin):
    """A university, company, or other partner organization.

    The organization is attached to an enrollment instead of the student
    identity so one student can participate in multiple programs safely.
    """

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    type: Mapped[str] = mapped_column(String(40), nullable=False, default="university")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    branding_settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="organization")
    partner_users: Mapped[list["PartnerUser"]] = relationship(back_populates="organization")

    __table_args__ = (
        Index("idx_organizations_status", "status"),
    )


from app.models.enrollment import Enrollment  # noqa: E402
from app.models.partner import PartnerUser  # noqa: E402
