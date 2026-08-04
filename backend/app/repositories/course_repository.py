"""
Course and Enrollment repositories.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.course import Course, Lesson
from app.models.enrollment import Enrollment
from app.models.user import Instructor
from app.repositories.base import BaseRepository


class CourseRepository(BaseRepository[Course]):
    def __init__(self, db: AsyncSession):
        super().__init__(Course, db)

    async def get_with_instructor(self, course_id: UUID) -> Optional[Course]:
        result = await self.db.execute(
            select(Course)
            .options(selectinload(Course.instructor).selectinload(Instructor.user))
            .where(Course.id == course_id)
        )
        return result.scalar_one_or_none()

    async def get_by_instructor(self, instructor_id: UUID, offset=0, limit=20):
        result = await self.db.execute(
            select(Course)
            .where(Course.instructor_id == instructor_id)
            .offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    async def get_enrolled_count(self, course_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Enrollment)
            .where(Enrollment.course_id == course_id, Enrollment.status == "active")
        )
        return result.scalar_one()


class LessonRepository(BaseRepository[Lesson]):
    def __init__(self, db: AsyncSession):
        super().__init__(Lesson, db)

    async def get_by_course(self, course_id: UUID):
        result = await self.db.execute(
            select(Lesson)
            .where(Lesson.course_id == course_id)
            .order_by(Lesson.order_number)
        )
        return list(result.scalars().all())

    async def count_by_course(self, course_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Lesson)
            .where(Lesson.course_id == course_id)
        )
        return result.scalar_one()


class EnrollmentRepository(BaseRepository[Enrollment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Enrollment, db)

    async def get_by_student_and_course(self, student_id: UUID, course_id: UUID) -> Optional[Enrollment]:
        result = await self.db.execute(
            select(Enrollment)
            .where(Enrollment.student_id == student_id, Enrollment.course_id == course_id)
        )
        return result.scalar_one_or_none()

    async def get_by_student(self, student_id: UUID, status: Optional[str] = None):
        query = select(Enrollment).options(
            selectinload(Enrollment.course)
        ).where(Enrollment.student_id == student_id)
        if status:
            query = query.where(Enrollment.status == status)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_course(self, course_id: UUID, status: Optional[str] = None):
        query = (
            select(Enrollment)
            .options(selectinload(Enrollment.student))
            .where(Enrollment.course_id == course_id)
        )
        if status:
            query = query.where(Enrollment.status == status)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_active_enrollments(self, offset=0, limit=100):
        result = await self.db.execute(
            select(Enrollment)
            .where(Enrollment.status == "active")
            .offset(offset).limit(limit)
        )
        return list(result.scalars().all())
