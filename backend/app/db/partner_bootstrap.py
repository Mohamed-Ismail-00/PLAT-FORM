"""Explicit bootstrap for partner workspace accounts.

Partner credentials are never committed. A deployment enables this path only
when the four `ELSWEDY_PARTNER_*` environment variables are configured.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import get_settings
from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.organization import Organization
from app.models.partner import PartnerUser


logger = logging.getLogger(__name__)


async def bootstrap_elswedy_partner_user() -> None:
    """Create or update the explicitly configured El Sewedy partner admin."""
    settings = get_settings()
    if not settings.ELSWEDY_PARTNER_BOOTSTRAP_ENABLED:
        return

    required_values = {
        "ELSWEDY_PARTNER_EMAIL": settings.ELSWEDY_PARTNER_EMAIL,
        "ELSWEDY_PARTNER_PASSWORD": settings.ELSWEDY_PARTNER_PASSWORD,
    }
    missing = [name for name, value in required_values.items() if not value]
    if missing:
        raise RuntimeError(
            "El Sewedy partner bootstrap is enabled but missing: " + ", ".join(missing)
        )

    async with async_session_factory() as db:
        try:
            organization = (await db.execute(
                select(Organization).where(Organization.slug == "elswedy")
            )).scalar_one_or_none()
            if organization is None:
                organization = Organization(
                    name="El Sewedy University",
                    slug="elswedy",
                    type="university",
                    status="active",
                    branding_settings={},
                )
                db.add(organization)
                await db.flush()

            result = await db.execute(
                select(PartnerUser).where(
                    PartnerUser.workspace_slug == "elswedy",
                    PartnerUser.email == settings.ELSWEDY_PARTNER_EMAIL.lower(),
                )
            )
            user = result.scalar_one_or_none()
            if user is None:
                user = PartnerUser(
                    workspace_slug="elswedy",
                    organization_id=organization.id,
                    email=settings.ELSWEDY_PARTNER_EMAIL.lower(),
                    password_hash=hash_password(settings.ELSWEDY_PARTNER_PASSWORD),
                    first_name=settings.ELSWEDY_PARTNER_FIRST_NAME,
                    last_name=settings.ELSWEDY_PARTNER_LAST_NAME,
                    role="partner_admin",
                    status="active",
                )
                db.add(user)
            else:
                user.password_hash = hash_password(settings.ELSWEDY_PARTNER_PASSWORD)
                user.organization_id = organization.id
                user.first_name = settings.ELSWEDY_PARTNER_FIRST_NAME
                user.last_name = settings.ELSWEDY_PARTNER_LAST_NAME
                user.role = "partner_admin"
                user.status = "active"
                user.updated_at = datetime.now(timezone.utc)
            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("El Sewedy partner account bootstrap failed")
            raise
