"""
FastAPI dependencies for dependency injection.
"""

from typing import Annotated, Optional

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import RoleName
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.db.session import get_db_session


# ── Database Session ────────────────────────────────────────────

async def get_db() -> AsyncSession:
    """Provide a database session per request."""
    async for session in get_db_session():
        yield session


DBSession = Annotated[AsyncSession, Depends(get_db)]


# ── Current User ────────────────────────────────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    """Extract and validate the current user from a JWT access token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Authentication is required")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise UnauthorizedException("Authentication is required")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access" or not payload.get("sub"):
        raise UnauthorizedException("Invalid or expired access token")

    return {
        "user_id": payload["sub"],
        "email": payload.get("email"),
        "roles": payload.get("roles", []),
    }


CurrentUser = Annotated[dict, Depends(get_current_user)]


# ── Role-Based Access ──────────────────────────────────────────

def require_roles(*roles: RoleName):
    """Dependency factory that checks if user has any of the required roles."""

    async def _check_roles(current_user: CurrentUser) -> dict:
        user_roles = current_user.get("roles", [])
        role_values = [r.value for r in roles]

        if not any(role in role_values for role in user_roles):
            raise ForbiddenException()

        return current_user

    return _check_roles


def require_admin():
    """Shorthand: require Admin or Super Admin."""
    return require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)


def require_instructor():
    """Shorthand: require Instructor, Admin, or Super Admin."""
    return require_roles(RoleName.INSTRUCTOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)


def require_super_admin():
    """Shorthand: require Super Admin only."""
    return require_roles(RoleName.SUPER_ADMIN)
