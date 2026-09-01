"""One-time platform administrator bootstrap for managed deployments.

The regular demo seed is intentionally not executed by Vercel serverless
functions. This module provides a small, explicit bootstrap path for the two
platform administrator accounts using deployment environment variables.
"""

import logging
from dataclasses import dataclass

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.security import hash_password
from app.db.session import async_session_factory
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.user import User


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PlatformAccount:
    email: str
    password: str
    first_name: str
    last_name: str
    role_name: str


ADMIN_RESOURCES = (
    "users",
    "courses",
    "students",
    "enrollments",
    "attendance",
    "quizzes",
    "assignments",
    "projects",
    "dashboard",
    "scoring",
    "notifications",
)


async def ensure_platform_accounts(
    db: AsyncSession,
    accounts: tuple[PlatformAccount, ...],
) -> None:
    """Create/update platform accounts and grant complete admin permissions."""
    roles: dict[str, Role] = {}
    for role_name in ("admin", "super_admin"):
        result = await db.execute(select(Role).where(Role.name == role_name))
        role = result.scalar_one_or_none()
        if role is None:
            role = Role(
                name=role_name,
                description=f"{role_name.replace('_', ' ').title()} role",
            )
            db.add(role)
            await db.flush()
        roles[role_name] = role

    for account in accounts:
        role = roles[account.role_name]
        result = await db.execute(select(User).where(User.email == account.email))
        user = result.scalar_one_or_none()

        if user is None:
            user = User(
                email=account.email,
                password_hash=hash_password(account.password),
                first_name=account.first_name,
                last_name=account.last_name,
                status="active",
            )
            db.add(user)
            await db.flush()
        else:
            user.password_hash = hash_password(account.password)
            user.first_name = account.first_name
            user.last_name = account.last_name
            user.status = "active"

        await db.execute(delete(UserRole).where(UserRole.user_id == user.id))
        db.add(UserRole(user_id=user.id, role_id=role.id))

    permissions: list[Permission] = []
    for resource in ADMIN_RESOURCES:
        for action in ("create", "read", "update", "delete"):
            result = await db.execute(
                select(Permission).where(
                    Permission.resource == resource,
                    Permission.action == action,
                )
            )
            permission = result.scalar_one_or_none()
            if permission is None:
                permission = Permission(resource=resource, action=action)
                db.add(permission)
                await db.flush()
            permissions.append(permission)

    for role_name in ("admin", "super_admin"):
        for permission in permissions:
            result = await db.execute(
                select(RolePermission).where(
                    RolePermission.role_id == roles[role_name].id,
                    RolePermission.permission_id == permission.id,
                )
            )
            if result.scalar_one_or_none() is None:
                db.add(
                    RolePermission(
                        role_id=roles[role_name].id,
                        permission_id=permission.id,
                    )
                )

    await db.flush()


async def bootstrap_platform_accounts() -> None:
    """Run the explicit Vercel bootstrap when enabled by environment variables."""
    settings = get_settings()
    if not settings.PLATFORM_ACCOUNTS_BOOTSTRAP_ENABLED:
        return

    required_values = {
        "PLATFORM_ADMIN_EMAIL": settings.PLATFORM_ADMIN_EMAIL,
        "PLATFORM_ADMIN_PASSWORD": settings.PLATFORM_ADMIN_PASSWORD,
        "PLATFORM_SUPER_ADMIN_EMAIL": settings.PLATFORM_SUPER_ADMIN_EMAIL,
        "PLATFORM_SUPER_ADMIN_PASSWORD": settings.PLATFORM_SUPER_ADMIN_PASSWORD,
    }
    missing = [name for name, value in required_values.items() if not value]
    if missing:
        raise RuntimeError(
            "Platform account bootstrap is enabled but missing: "
            + ", ".join(missing)
        )

    accounts = (
        PlatformAccount(
            email=settings.PLATFORM_ADMIN_EMAIL,
            password=settings.PLATFORM_ADMIN_PASSWORD,
            first_name="Platform",
            last_name="Administrator",
            role_name="admin",
        ),
        PlatformAccount(
            email=settings.PLATFORM_SUPER_ADMIN_EMAIL,
            password=settings.PLATFORM_SUPER_ADMIN_PASSWORD,
            first_name="Super",
            last_name="Administrator",
            role_name="super_admin",
        ),
    )

    async with async_session_factory() as db:
        try:
            await ensure_platform_accounts(db, accounts)
            await db.commit()
        except Exception:
            await db.rollback()
            logger.exception("Platform account bootstrap failed")
            raise

