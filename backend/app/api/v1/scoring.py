"""
Scoring Engine API routes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.constants import RoleName
from app.core.dependencies import DBSession, require_roles
from app.core.exceptions import NotFoundException
from app.repositories.course_repository import EnrollmentRepository
from app.repositories.prediction_repository import PredictionRepository
from app.services.scoring.engine import ScoreManager
from app.schemas.common import DataResponse

router = APIRouter(prefix="/scoring", tags=["Scoring Engine"])


@router.post("/calculate/{enrollment_id}")
async def calculate_scores(
    enrollment_id: UUID, db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Calculate all scores for a specific enrollment."""
    enrollment_repo = EnrollmentRepository(db)
    enrollment = await enrollment_repo.get_by_id(enrollment_id)
    if not enrollment:
        raise NotFoundException("Enrollment")

    engine = ScoreManager(db)
    result = await engine.calculate_all_scores(
        enrollment.student_id, enrollment.id, enrollment.course_id,
    )
    return DataResponse(data=result)


@router.post("/calculate-batch")
async def calculate_batch(
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Recalculate scores for all active enrollments."""
    enrollment_repo = EnrollmentRepository(db)
    enrollments = await enrollment_repo.get_active_enrollments(limit=500)

    engine = ScoreManager(db)
    results = []
    for enrollment in enrollments:
        result = await engine.calculate_all_scores(
            enrollment.student_id, enrollment.id, enrollment.course_id,
        )
        results.append({
            "enrollment_id": str(enrollment.id),
            "overall_score": result["overall_score"],
            "classification": result["classification"],
        })

    return DataResponse(data={"processed": len(results), "results": results})


@router.get("/enrollment/{enrollment_id}")
async def get_enrollment_scores(enrollment_id: UUID, db: DBSession):
    """Get latest scores for an enrollment."""
    repo = PredictionRepository(db)
    predictions = await repo.get_all_latest_by_enrollment(enrollment_id)

    scores = [{
        "score_type": p.score_type,
        "score_value": p.score_value,
        "classification": p.classification,
        "breakdown": p.score_breakdown,
        "engine_version": p.engine_version,
        "calculated_at": p.calculated_at.isoformat(),
    } for p in predictions]

    return DataResponse(data=scores)


@router.get("/enrollment/{enrollment_id}/history")
async def get_score_history(enrollment_id: UUID, db: DBSession, score_type: str = "overall"):
    """Get score history for trend analysis."""
    repo = PredictionRepository(db)
    history = await repo.get_history(enrollment_id, score_type)

    return DataResponse(data=[{
        "score_value": p.score_value,
        "classification": p.classification,
        "calculated_at": p.calculated_at.isoformat(),
    } for p in history])


@router.get("/classifications")
async def get_classifications(
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Get classification distribution summary."""
    repo = PredictionRepository(db)
    summary = await repo.get_classifications_summary()
    return DataResponse(data=summary)
