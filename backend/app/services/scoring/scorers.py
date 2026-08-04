"""
Individual rule-based scorers.
Each scorer is independent, stateless, and implements ScorerInterface.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.scoring.interface import ScorerInterface, ScoreResult, clamp
from app.repositories.tracking_repository import AttendanceRepository, VideoProgressRepository, ActivityLogRepository
from app.repositories.assessment_repository import (
    QuizRepository, QuizAttemptRepository,
    AssignmentRepository, AssignmentSubmissionRepository,
    ProjectRepository, ProjectSubmissionRepository,
)
from app.repositories.course_repository import LessonRepository, EnrollmentRepository


class AttendanceScorer(ScorerInterface):
    """Attendance Score: measures class presence."""

    def __init__(self, db: AsyncSession):
        self.attendance_repo = AttendanceRepository(db)
        self.lesson_repo = LessonRepository(db)
        self.enrollment_repo = EnrollmentRepository(db)

    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        records = await self.attendance_repo.get_by_student_and_course(student_id, course_id)

        if enrollment and getattr(enrollment, "total_lessons_count", 0) > 0:
            present = getattr(enrollment, "attended_lessons_count", 0)
            total_lessons = getattr(enrollment, "total_lessons_count", 10)
            late, absent, excused = 0, max(0, total_lessons - present), 0
            effective_present = present
            base_rate = (present / total_lessons * 100) if total_lessons > 0 else 0
        elif records:
            total_lessons = await self.lesson_repo.count_by_course(course_id) or len(records)
            present = sum(1 for r in records if r.status == "present")
            late = sum(1 for r in records if r.status == "late")
            absent = sum(1 for r in records if r.status == "absent")
            excused = sum(1 for r in records if r.status == "excused")
            effective_present = present + (late * 0.7)
            countable = total_lessons - excused
            base_rate = (effective_present / countable * 100) if countable > 0 else 0
        else:
            present, late, absent, excused, effective_present, base_rate, total_lessons = 0, 0, 0, 0, 0, 0, 10

        adjustments = []
        bonus = 0
        if base_rate >= 95:
            bonus += 5
            adjustments.append("+5 perfect attendance bonus")
        elif base_rate < 50:
            bonus -= 10
            adjustments.append("-10 severe absenteeism penalty")

        final = clamp(base_rate + bonus)

        return ScoreResult(
            score_type="attendance",
            score_value=round(final, 1),
            breakdown={
                "present": present, "late": late, "absent": absent, "excused": excused,
                "total_lessons": total_lessons, "effective_present": round(effective_present, 1),
                "base_rate": round(base_rate, 1), "adjustments": adjustments,
            },
        )

    def get_score_type(self) -> str:
        return "attendance"

    def get_version(self) -> str:
        return "rule_v1.0"


class QuizScorer(ScorerInterface):
    """Quiz Score: measures knowledge retention."""

    def __init__(self, db: AsyncSession):
        self.quiz_repo = QuizRepository(db)
        self.attempt_repo = QuizAttemptRepository(db)

    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        total_quizzes = await self.quiz_repo.count_by_course(course_id)
        best_attempts = await self.attempt_repo.get_best_attempts(student_id, course_id)

        if total_quizzes == 0:
            return ScoreResult(score_type="quiz", score_value=0, breakdown={"reason": "no_quizzes"})

        percentages = [a.percentage for a in best_attempts]
        quiz_avg = sum(percentages) / len(percentages) if percentages else 0

        adjustments = []
        bonus = 0

        # Participation bonus
        if len(best_attempts) == total_quizzes and total_quizzes > 0:
            bonus += 5
            adjustments.append("+5 all quizzes attempted")

        # Penalty for low participation
        if len(best_attempts) == 1 and total_quizzes >= 5:
            bonus -= quiz_avg * 0.5
            adjustments.append(f"-{round(quiz_avg * 0.5, 1)} low participation penalty")

        # Consistency bonus
        if len(percentages) >= 3:
            import statistics
            std_dev = statistics.stdev(percentages)
            if std_dev < 10:
                bonus += 3
                adjustments.append("+3 consistency bonus")

        final = clamp(quiz_avg + bonus)

        return ScoreResult(
            score_type="quiz",
            score_value=round(final, 1),
            breakdown={
                "total_quizzes": total_quizzes, "attempted": len(best_attempts),
                "avg_percentage": round(quiz_avg, 1), "scores": [round(p, 1) for p in percentages],
                "adjustments": adjustments,
            },
        )

    def get_score_type(self) -> str:
        return "quiz"

    def get_version(self) -> str:
        return "rule_v1.0"


class AssignmentScorer(ScorerInterface):
    """Assignment Score: measures applied knowledge."""

    def __init__(self, db: AsyncSession):
        self.assignment_repo = AssignmentRepository(db)
        self.submission_repo = AssignmentSubmissionRepository(db)
        self.enrollment_repo = EnrollmentRepository(db)

    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        submissions = await self.submission_repo.get_by_student_and_course(student_id, course_id)

        if enrollment and getattr(enrollment, "total_tasks_count", 0) > 0:
            completed_tasks = getattr(enrollment, "completed_tasks_count", 0)
            total_assignments = getattr(enrollment, "total_tasks_count", 12)
            unsubmitted = max(0, total_assignments - completed_tasks)
            assignment_avg = (completed_tasks / total_assignments * 100) if total_assignments > 0 else 0
            submitted_count = completed_tasks
            graded_count = completed_tasks
        elif submissions:
            total_assignments = await self.assignment_repo.count_by_course(course_id) or len(submissions)
            graded = [s for s in submissions if s.status == "graded" and s.score is not None]
            graded_percentages = []
            for s in graded:
                assignment = await self.assignment_repo.get_by_id(s.assignment_id)
                if assignment and assignment.total_marks > 0:
                    graded_percentages.append(s.score / assignment.total_marks * 100)
            unsubmitted = max(0, total_assignments - len(submissions))
            all_percentages = graded_percentages + [0] * unsubmitted
            assignment_avg = sum(all_percentages) / len(all_percentages) if all_percentages else 0
            submitted_count = len(submissions)
            graded_count = len(graded)
        else:
            total_assignments = 12
            submitted_count, graded_count, unsubmitted, assignment_avg = 0, 0, 12, 0

        adjustments = []
        bonus = 0

        if submitted_count == total_assignments and total_assignments > 0:
            bonus += 5
            adjustments.append("+5 all assignments submitted")

        final = clamp(assignment_avg + bonus)

        return ScoreResult(
            score_type="assignment",
            score_value=round(final, 1),
            breakdown={
                "total_assignments": total_assignments, "submitted": submitted_count,
                "graded": graded_count, "unsubmitted": unsubmitted,
                "avg_percentage": round(assignment_avg, 1), "adjustments": adjustments,
            },
        )

    def get_score_type(self) -> str:
        return "assignment"

    def get_version(self) -> str:
        return "rule_v1.0"


class ProjectScorer(ScorerInterface):
    """Project Score: measures synthesis ability."""

    def __init__(self, db: AsyncSession):
        self.project_repo = ProjectRepository(db)
        self.submission_repo = ProjectSubmissionRepository(db)

    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        total_projects = await self.project_repo.count_by_course(course_id)

        if total_projects == 0:
            return ScoreResult(
                score_type="project", score_value=-1,  # -1 = N/A, triggers weight redistribution
                breakdown={"reason": "no_projects_in_course"},
            )

        graded = await self.submission_repo.get_graded_by_student(student_id, course_id)

        if not graded:
            submissions = await self.submission_repo.get_by_student_and_course(student_id, course_id)
            if not submissions:
                return ScoreResult(score_type="project", score_value=0, breakdown={"reason": "not_submitted"})
            return ScoreResult(score_type="project", score_value=0, breakdown={"reason": "not_graded_yet"})

        scores = []
        for s in graded:
            project = await self.project_repo.get_by_id(s.project_id)
            if project and project.total_marks > 0:
                scores.append(s.score / project.total_marks * 100)

        project_score = sum(scores) / len(scores) if scores else 0

        adjustments = []
        bonus = 0
        late_subs = await self.submission_repo.get_by_student_and_course(student_id, course_id)
        for s in late_subs:
            if s.status == "late":
                bonus -= 10
                adjustments.append("-10 late project submission")

        final = clamp(project_score + bonus)

        return ScoreResult(
            score_type="project",
            score_value=round(final, 1),
            breakdown={
                "total_projects": total_projects, "graded": len(graded),
                "avg_score": round(project_score, 1), "adjustments": adjustments,
            },
        )

    def get_score_type(self) -> str:
        return "project"

    def get_version(self) -> str:
        return "rule_v1.0"


class EngagementScorer(ScorerInterface):
    """Engagement Score: measures content interaction depth."""

    def __init__(self, db: AsyncSession):
        self.video_repo = VideoProgressRepository(db)
        self.lesson_repo = LessonRepository(db)

    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        lessons = await self.lesson_repo.get_by_course(course_id)
        video_lessons = [l for l in lessons if l.video_url]
        total_videos = len(video_lessons)

        if total_videos == 0:
            return ScoreResult(score_type="engagement", score_value=50, breakdown={"reason": "no_videos", "default": True})

        progress = await self.video_repo.get_by_student_and_course(student_id, course_id)
        completed = sum(1 for p in progress if p.completed)
        watched_percentages = [p.watched_percentage for p in progress]
        avg_watch = sum(watched_percentages) / len(watched_percentages) if watched_percentages else 0

        video_completion_rate = (completed / total_videos) * 100
        engagement_base = (video_completion_rate * 0.6) + (avg_watch * 0.4)

        adjustments = []
        bonus = 0
        if avg_watch > 90:
            bonus += 5
            adjustments.append("+5 thorough watching bonus")
        if avg_watch < 30 and len(watched_percentages) > 0:
            bonus -= 10
            adjustments.append("-10 skimming penalty")

        final = clamp(engagement_base + bonus)

        return ScoreResult(
            score_type="engagement",
            score_value=round(final, 1),
            breakdown={
                "total_videos": total_videos, "completed": completed,
                "avg_watch_percentage": round(avg_watch, 1),
                "video_completion_rate": round(video_completion_rate, 1),
                "adjustments": adjustments,
            },
        )

    def get_score_type(self) -> str:
        return "engagement"

    def get_version(self) -> str:
        return "rule_v1.0"


class ConsistencyScorer(ScorerInterface):
    """Consistency Score: measures learning regularity."""

    def __init__(self, db: AsyncSession):
        self.activity_repo = ActivityLogRepository(db)
        self.attempt_repo = QuizAttemptRepository(db)

    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        from app.repositories.course_repository import EnrollmentRepository

        # Get enrollment date to calculate total weeks
        now = datetime.now(timezone.utc)
        # Simple: assume 8 weeks if we can't determine
        total_weeks = 8

        active_weeks = await self.activity_repo.get_active_weeks(student_id, now - timedelta(weeks=total_weeks))
        consistency_rate = (active_weeks / total_weeks * 100) if total_weeks > 0 else 0

        # Quiz consistency
        best_attempts = await self.attempt_repo.get_best_attempts(student_id, course_id)
        percentages = [a.percentage for a in best_attempts]

        quiz_consistency = 50  # default
        if len(percentages) >= 2:
            import statistics
            std_dev = statistics.stdev(percentages)
            quiz_consistency = max(0, 100 - (std_dev * 2))

        consistency_base = (consistency_rate * 0.6) + (quiz_consistency * 0.4)

        adjustments = []
        bonus = 0
        if active_weeks == total_weeks:
            bonus += 5
            adjustments.append("+5 every week active")

        # Check for long gaps
        active_days = await self.activity_repo.get_active_days_in_range(student_id, total_weeks * 7)
        if active_days == 0:
            bonus -= 20
            adjustments.append("-20 no activity at all")

        final = clamp(consistency_base + bonus)

        return ScoreResult(
            score_type="consistency",
            score_value=round(final, 1),
            breakdown={
                "active_weeks": active_weeks, "total_weeks": total_weeks,
                "consistency_rate": round(consistency_rate, 1),
                "quiz_consistency": round(quiz_consistency, 1),
                "adjustments": adjustments,
            },
        )

    def get_score_type(self) -> str:
        return "consistency"

    def get_version(self) -> str:
        return "rule_v1.0"


class ActivityScorer(ScorerInterface):
    """Activity Score: measures recency and platform usage."""

    def __init__(self, db: AsyncSession):
        self.activity_repo = ActivityLogRepository(db)

    async def calculate(self, student_id: UUID, enrollment_id: UUID, course_id: UUID) -> ScoreResult:
        last_activity = await self.activity_repo.get_last_activity(student_id)
        active_days_30 = await self.activity_repo.get_active_days_in_range(student_id, 30)

        now = datetime.now(timezone.utc)
        if last_activity:
            days_since = (now - last_activity).days
        else:
            days_since = 999

        # Recency scoring
        if days_since <= 1:
            activity_recency = 100
        elif days_since <= 3:
            activity_recency = 90
        elif days_since <= 7:
            activity_recency = 70
        elif days_since <= 14:
            activity_recency = 40
        elif days_since <= 30:
            activity_recency = 10
        else:
            activity_recency = 0

        active_days_ratio = (active_days_30 / 30) * 100

        activity_base = (activity_recency * 0.5) + (active_days_ratio * 0.5)
        final = clamp(activity_base)

        return ScoreResult(
            score_type="activity",
            score_value=round(final, 1),
            breakdown={
                "days_since_last_activity": days_since,
                "activity_recency": activity_recency,
                "active_days_last_30": active_days_30,
                "active_days_ratio": round(active_days_ratio, 1),
            },
        )

    def get_score_type(self) -> str:
        return "activity"

    def get_version(self) -> str:
        return "rule_v1.0"
