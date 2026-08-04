"""
Assessment and Submission repositories.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Quiz, Assignment, Project
from app.models.submission import QuizAttempt, AssignmentSubmission, ProjectSubmission
from app.repositories.base import BaseRepository


class QuizRepository(BaseRepository[Quiz]):
    def __init__(self, db: AsyncSession):
        super().__init__(Quiz, db)

    async def get_by_course(self, course_id: UUID):
        result = await self.db.execute(
            select(Quiz).where(Quiz.course_id == course_id)
        )
        return list(result.scalars().all())

    async def count_by_course(self, course_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Quiz).where(Quiz.course_id == course_id)
        )
        return result.scalar_one()


class QuizAttemptRepository(BaseRepository[QuizAttempt]):
    def __init__(self, db: AsyncSession):
        super().__init__(QuizAttempt, db)

    async def get_by_student_and_course(self, student_id: UUID, course_id: UUID):
        result = await self.db.execute(
            select(QuizAttempt)
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .where(QuizAttempt.student_id == student_id, Quiz.course_id == course_id)
        )
        return list(result.scalars().all())

    async def get_best_attempts(self, student_id: UUID, course_id: UUID):
        """Get best attempt per quiz for a student in a course."""
        # Get all attempts
        attempts = await self.get_by_student_and_course(student_id, course_id)
        # Group by quiz_id and keep best
        best = {}
        for a in attempts:
            if a.quiz_id not in best or a.percentage > best[a.quiz_id].percentage:
                best[a.quiz_id] = a
        return list(best.values())

    async def get_by_student(self, student_id: UUID):
        result = await self.db.execute(
            select(QuizAttempt).where(QuizAttempt.student_id == student_id)
        )
        return list(result.scalars().all())


class AssignmentRepository(BaseRepository[Assignment]):
    def __init__(self, db: AsyncSession):
        super().__init__(Assignment, db)

    async def get_by_course(self, course_id: UUID):
        result = await self.db.execute(
            select(Assignment).where(Assignment.course_id == course_id)
        )
        return list(result.scalars().all())

    async def count_by_course(self, course_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Assignment).where(Assignment.course_id == course_id)
        )
        return result.scalar_one()


class AssignmentSubmissionRepository(BaseRepository[AssignmentSubmission]):
    def __init__(self, db: AsyncSession):
        super().__init__(AssignmentSubmission, db)

    async def get_by_student_and_course(self, student_id: UUID, course_id: UUID):
        result = await self.db.execute(
            select(AssignmentSubmission)
            .join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
            .where(AssignmentSubmission.student_id == student_id, Assignment.course_id == course_id)
        )
        return list(result.scalars().all())

    async def get_graded_by_student(self, student_id: UUID, course_id: UUID):
        result = await self.db.execute(
            select(AssignmentSubmission)
            .join(Assignment, AssignmentSubmission.assignment_id == Assignment.id)
            .where(
                AssignmentSubmission.student_id == student_id,
                Assignment.course_id == course_id,
                AssignmentSubmission.status == "graded",
            )
        )
        return list(result.scalars().all())


class ProjectRepository(BaseRepository[Project]):
    def __init__(self, db: AsyncSession):
        super().__init__(Project, db)

    async def get_by_course(self, course_id: UUID):
        result = await self.db.execute(
            select(Project).where(Project.course_id == course_id)
        )
        return list(result.scalars().all())

    async def count_by_course(self, course_id: UUID) -> int:
        result = await self.db.execute(
            select(func.count()).select_from(Project).where(Project.course_id == course_id)
        )
        return result.scalar_one()


class ProjectSubmissionRepository(BaseRepository[ProjectSubmission]):
    def __init__(self, db: AsyncSession):
        super().__init__(ProjectSubmission, db)

    async def get_by_student_and_course(self, student_id: UUID, course_id: UUID):
        result = await self.db.execute(
            select(ProjectSubmission)
            .join(Project, ProjectSubmission.project_id == Project.id)
            .where(ProjectSubmission.student_id == student_id, Project.course_id == course_id)
        )
        return list(result.scalars().all())

    async def get_graded_by_student(self, student_id: UUID, course_id: UUID):
        result = await self.db.execute(
            select(ProjectSubmission)
            .join(Project, ProjectSubmission.project_id == Project.id)
            .where(
                ProjectSubmission.student_id == student_id,
                Project.course_id == course_id,
                ProjectSubmission.status == "graded",
            )
        )
        return list(result.scalars().all())
