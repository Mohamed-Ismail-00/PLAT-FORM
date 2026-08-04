"""
Authentication API routes.
"""

from fastapi import APIRouter, Depends

from app.core.dependencies import CurrentUser, DBSession
from app.schemas.auth import LoginRequest, RegisterRequest, RefreshRequest
from app.schemas.common import DataResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(data: RegisterRequest, db: DBSession):
    """Register a new user."""
    service = AuthService(db)
    result = await service.register(data.model_dump())
    return DataResponse(data=result)


@router.post("/login")
async def login(data: LoginRequest, db: DBSession):
    """Login and receive JWT tokens."""
    service = AuthService(db)
    result = await service.login(data.email, data.password)
    return DataResponse(data=result)


@router.post("/refresh")
async def refresh_token(data: RefreshRequest, db: DBSession):
    """Refresh access token."""
    service = AuthService(db)
    result = await service.refresh_token(data.refresh_token)
    return DataResponse(data=result)


@router.get("/me")
async def get_me(current_user: CurrentUser, db: DBSession):
    """Get current user profile."""
    service = AuthService(db)
    result = await service.get_current_user(current_user["user_id"])
    return DataResponse(data=result)
