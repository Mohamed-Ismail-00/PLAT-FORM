"""Schemas for isolated partner workspace APIs."""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


PartnerTrack = Literal["Software Engineering", "Artificial Intelligence"]
PartnerBatch = Literal["BATCH 1", "BATCH 2"]


class PartnerLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class PartnerStudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    university_id: Optional[str] = Field(default=None, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=30)
    track_name: PartnerTrack
    batch_name: PartnerBatch = "BATCH 2"


class PartnerStudentUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    university_id: Optional[str] = Field(default=None, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(default=None, max_length=30)
    track_name: Optional[PartnerTrack] = None
    batch_name: Optional[PartnerBatch] = None
    status: Optional[Literal["active", "completed", "on_hold"]] = None
