"""Organization schemas shared by the admin and partner surfaces."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class OrganizationOption(BaseModel):
    id: UUID
    name: str
    slug: str
    type: str
    status: str
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True
