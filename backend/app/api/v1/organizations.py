"""Organization lookups used by the internal admin workspace."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from app.core.constants import RoleName
from app.core.dependencies import DBSession, require_roles
from app.models.organization import Organization
from app.schemas.common import DataResponse


router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("")
async def list_organizations(
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
    status: str | None = Query("active", max_length=20),
):
    """List partner options for the internal student assignment form."""
    query = select(Organization).order_by(Organization.name.asc())
    if status:
        query = query.where(Organization.status == status)
    organizations = (await db.execute(query)).scalars().all()
    return DataResponse(data=[
        {
            "id": str(organization.id),
            "name": organization.name,
            "slug": organization.slug,
            "type": organization.type,
            "status": organization.status,
            "logo_url": organization.logo_url,
        }
        for organization in organizations
    ])
