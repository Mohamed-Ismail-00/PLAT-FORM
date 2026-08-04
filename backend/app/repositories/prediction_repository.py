"""
Prediction repository for storing scoring engine results.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import Prediction, Recommendation
from app.repositories.base import BaseRepository


class PredictionRepository(BaseRepository[Prediction]):
    def __init__(self, db: AsyncSession):
        super().__init__(Prediction, db)

    async def get_latest_by_enrollment(self, enrollment_id: UUID, score_type: str = None) -> Optional[Prediction]:
        query = (
            select(Prediction)
            .where(Prediction.enrollment_id == enrollment_id)
        )
        if score_type:
            query = query.where(Prediction.score_type == score_type)
        query = query.order_by(Prediction.calculated_at.desc()).limit(1)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all_latest_by_enrollment(self, enrollment_id: UUID) -> list[Prediction]:
        """Get the most recent score for each score_type."""
        from sqlalchemy import func
        subq = (
            select(
                Prediction.score_type,
                func.max(Prediction.calculated_at).label("max_calc"),
            )
            .where(Prediction.enrollment_id == enrollment_id)
            .group_by(Prediction.score_type)
            .subquery()
        )
        result = await self.db.execute(
            select(Prediction)
            .join(
                subq,
                (Prediction.score_type == subq.c.score_type)
                & (Prediction.calculated_at == subq.c.max_calc)
                & (Prediction.enrollment_id == enrollment_id),
            )
        )
        return list(result.scalars().all())

    async def get_history(self, enrollment_id: UUID, score_type: str = "overall", limit: int = 20):
        result = await self.db.execute(
            select(Prediction)
            .where(
                Prediction.enrollment_id == enrollment_id,
                Prediction.score_type == score_type,
            )
            .order_by(Prediction.calculated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_classifications_summary(self, course_id: UUID = None) -> dict:
        """Count students by classification."""
        from app.models.enrollment import Enrollment
        from sqlalchemy import func

        query = (
            select(Prediction.classification, func.count().label("count"))
            .join(Enrollment, Prediction.enrollment_id == Enrollment.id)
            .where(Prediction.score_type == "overall", Prediction.classification.isnot(None))
        )
        if course_id:
            query = query.where(Enrollment.course_id == course_id)

        # Get latest prediction per enrollment
        subq = (
            select(
                Prediction.enrollment_id,
                func.max(Prediction.calculated_at).label("max_calc"),
            )
            .where(Prediction.score_type == "overall")
            .group_by(Prediction.enrollment_id)
            .subquery()
        )

        query = (
            select(Prediction.classification, func.count().label("count"))
            .join(
                subq,
                (Prediction.enrollment_id == subq.c.enrollment_id)
                & (Prediction.calculated_at == subq.c.max_calc),
            )
            .where(Prediction.score_type == "overall")
            .group_by(Prediction.classification)
        )

        result = await self.db.execute(query)
        return {row.classification: row.count for row in result.all()}


class RecommendationRepository(BaseRepository[Recommendation]):
    def __init__(self, db: AsyncSession):
        super().__init__(Recommendation, db)

    async def get_by_enrollment(self, enrollment_id: UUID, status: str = None):
        query = select(Recommendation).where(Recommendation.enrollment_id == enrollment_id)
        if status:
            query = query.where(Recommendation.status == status)
        query = query.order_by(Recommendation.priority.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())
