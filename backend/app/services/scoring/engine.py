"""
Score Manager — Orchestrator for the AI Scoring Engine.
Runs all scorers, calculates overall score, classifies student, persists results.
"""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.constants import (
    CLASSIFICATION_THRESHOLDS,
    SCORING_WEIGHTS,
    SCORING_WEIGHTS_NO_PROJECT,
    Classification,
    ScoreType,
)
from app.models.prediction import Prediction
from app.repositories.prediction_repository import PredictionRepository
from app.services.scoring.interface import ScoreResult, clamp
from app.services.scoring.scorers import (
    ActivityScorer,
    AssignmentScorer,
    AttendanceScorer,
    ConsistencyScorer,
    EngagementScorer,
    ProjectScorer,
    QuizScorer,
)

settings = get_settings()


class ScoreManager:
    """Orchestrates all scorers and produces final classification."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.prediction_repo = PredictionRepository(db)
        self.scorers = [
            AttendanceScorer(db),
            QuizScorer(db),
            AssignmentScorer(db),
            ProjectScorer(db),
            EngagementScorer(db),
            ConsistencyScorer(db),
            ActivityScorer(db),
        ]

    async def calculate_all_scores(
        self, student_id: UUID, enrollment_id: UUID, course_id: UUID
    ) -> dict:
        """Run all scorers, calculate overall, classify, and persist."""

        results: dict[str, ScoreResult] = {}
        for scorer in self.scorers:
            result = await scorer.calculate(student_id, enrollment_id, course_id)
            results[result.score_type] = result

        # Calculate overall score
        overall = self._calculate_overall(results)

        # Classify
        classification = self._classify(overall, results)

        # Persist individual scores
        engine_version = settings.SCORING_ENGINE_VERSION
        for score_type, result in results.items():
            if result.score_value < 0:  # N/A scores (e.g., no projects)
                continue
            prediction = Prediction(
                enrollment_id=enrollment_id,
                score_type=score_type,
                score_value=result.score_value,
                score_breakdown=result.breakdown,
                engine_version=engine_version,
            )
            self.db.add(prediction)

        # Persist overall score
        overall_prediction = Prediction(
            enrollment_id=enrollment_id,
            score_type="overall",
            score_value=round(overall, 1),
            score_breakdown={
                "individual_scores": {k: round(v.score_value, 1) for k, v in results.items() if v.score_value >= 0},
                "weights_used": "standard" if results.get("project", ScoreResult("", -1)).score_value >= 0 else "no_project",
            },
            classification=classification,
            engine_version=engine_version,
        )
        self.db.add(overall_prediction)
        await self.db.flush()

        return {
            "scores": {k: {"value": round(v.score_value, 1), "breakdown": v.breakdown} for k, v in results.items()},
            "overall_score": round(overall, 1),
            "classification": classification,
            "engine_version": engine_version,
        }

    def _calculate_overall(self, results: dict[str, ScoreResult]) -> float:
        """Calculate weighted overall score, normalizing active weights if optional components (quizzes/projects) are absent."""
        valid_scores = {}
        for st, res in results.items():
            if res.score_value < 0:
                continue
            if res.breakdown.get("reason") in ["no_quizzes", "no_lessons", "no_assignments", "no_projects_in_course"]:
                continue
            valid_scores[st] = res.score_value

        if not valid_scores:
            return 0.0

        no_quizzes = results.get("quiz") and results.get("quiz").breakdown.get("reason") == "no_quizzes"
        no_projects = (not results.get("project")) or (results.get("project").score_value < 0)

        # Standard intern track monitoring: 40% Attendance + 60% Tasks
        if no_quizzes and no_projects:
            att_score = valid_scores.get("attendance", 0)
            task_score = valid_scores.get("assignment", 0)
            return clamp((att_score * 0.4) + (task_score * 0.6))

        weights = SCORING_WEIGHTS if not no_projects else SCORING_WEIGHTS_NO_PROJECT

        total_weight = 0.0
        weighted_sum = 0.0
        for score_type, weight in weights.items():
            result = results.get(score_type.value)
            if result and result.score_value >= 0 and result.breakdown.get("reason") not in ["no_quizzes", "no_projects_in_course"]:
                weighted_sum += result.score_value * weight
                total_weight += weight

        if total_weight > 0:
            return clamp(weighted_sum / total_weight)

        return clamp(weighted_sum)

    def _classify(self, overall: float, results: dict[str, ScoreResult]) -> str:
        """Classify student with override rules."""

        activity_result = results.get("activity")
        attendance_result = results.get("attendance")
        assignment_result = results.get("assignment")

        att_val = attendance_result.score_value if attendance_result and attendance_result.score_value >= 0 else 50
        task_val = assignment_result.score_value if assignment_result and assignment_result.score_value >= 0 else 50

        # Override Rule 1: Force High Risk if low activity AND severe academic failure (attendance < 30% and tasks < 30%)
        if activity_result and activity_result.score_value < 10 and att_val < 30 and task_val < 30:
            return Classification.HIGH_RISK.value

        # Override Rule 2: Force Needs Attention if poor attendance or low task completion
        if att_val < 50 or task_val < 50:
            if overall >= CLASSIFICATION_THRESHOLDS[Classification.NEEDS_ATTENTION]:
                return Classification.NEEDS_ATTENTION.value

        # Standard classification by score range
        if overall >= CLASSIFICATION_THRESHOLDS[Classification.EXCELLENT]:
            return Classification.EXCELLENT.value
        elif overall >= CLASSIFICATION_THRESHOLDS[Classification.GOOD]:
            return Classification.GOOD.value
        elif overall >= CLASSIFICATION_THRESHOLDS[Classification.AVERAGE]:
            return Classification.AVERAGE.value
        elif overall >= CLASSIFICATION_THRESHOLDS[Classification.NEEDS_ATTENTION]:
            return Classification.NEEDS_ATTENTION.value
        else:
            return Classification.HIGH_RISK.value
