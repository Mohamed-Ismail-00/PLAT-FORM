"""
User repository with auth-specific queries.
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User, Student, Instructor
from app.models.role import Role, UserRole
from app.models.enrollment import Enrollment
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Find user by email with roles loaded."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_with_roles(self, user_id) -> Optional[User]:
        """Get user with roles loaded."""
        result = await self.db.execute(
            select(User)
            .options(selectinload(User.user_roles).selectinload(UserRole.role))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_user_roles(self, user_id) -> list[str]:
        """Get role names for a user."""
        result = await self.db.execute(
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
        )
        return list(result.scalars().all())

    async def assign_role(self, user_id, role_name: str):
        """Assign a role to a user."""
        result = await self.db.execute(select(Role).where(Role.name == role_name))
        role = result.scalar_one_or_none()
        if role:
            user_role = UserRole(user_id=user_id, role_id=role.id)
            self.db.add(user_role)
            await self.db.flush()


class StudentRepository(BaseRepository[Student]):
    def __init__(self, db: AsyncSession):
        super().__init__(Student, db)

    async def get_by_user_id(self, user_id) -> Optional[Student]:
        result = await self.db.execute(
            select(Student)
            .options(selectinload(Student.user))
            .where(Student.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_with_user(self, student_id) -> Optional[Student]:
        result = await self.db.execute(
            select(Student)
            .options(selectinload(Student.user))
            .where(Student.id == student_id)
        )
        return result.scalar_one_or_none()

    async def get_all_with_users(self, offset=0, limit=20, filters=None):
        query = (
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.enrollments).selectinload(Enrollment.course)
            )
            .offset(offset).limit(limit)
        )
        if filters:
            for f in filters:
                query = query.where(f)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def generate_student_code(self) -> str:
        """Generate the next student code."""
        from datetime import datetime
        year = datetime.now().year
        count = await self.count()
        return f"STU-{year}-{(count + 1):04d}"


class InstructorRepository(BaseRepository[Instructor]):
    def __init__(self, db: AsyncSession):
        super().__init__(Instructor, db)

    async def get_by_user_id(self, user_id) -> Optional[Instructor]:
        result = await self.db.execute(
            select(Instructor)
            .options(selectinload(Instructor.user))
            .where(Instructor.user_id == user_id)
        )
        return result.scalar_one_or_none()
