"""
Dashboard Service: aggregates data for all three dashboards.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import Student, Instructor, User
from app.models.tracking import Attendance, VideoProgress, ActivityLog
from app.models.submission import QuizAttempt, AssignmentSubmission, ProjectSubmission
from app.models.assessment import Quiz, Assignment, Project
from app.models.prediction import Prediction
from app.models.notification import InstructorNote
from app.repositories.tracking_repository import AttendanceRepository, VideoProgressRepository, ActivityLogRepository
from app.repositories.assessment_repository import (
    QuizRepository, QuizAttemptRepository,
    AssignmentRepository, AssignmentSubmissionRepository,
    ProjectRepository, ProjectSubmissionRepository,
)
from app.repositories.course_repository import CourseRepository, LessonRepository, EnrollmentRepository
from app.repositories.prediction_repository import PredictionRepository
from app.repositories.user_repository import StudentRepository, InstructorRepository


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.student_repo = StudentRepository(db)
        self.instructor_repo = InstructorRepository(db)
        self.course_repo = CourseRepository(db)
        self.lesson_repo = LessonRepository(db)
        self.enrollment_repo = EnrollmentRepository(db)
        self.attendance_repo = AttendanceRepository(db)
        self.video_repo = VideoProgressRepository(db)
        self.activity_repo = ActivityLogRepository(db)
        self.quiz_repo = QuizRepository(db)
        self.quiz_attempt_repo = QuizAttemptRepository(db)
        self.assignment_repo = AssignmentRepository(db)
        self.assignment_sub_repo = AssignmentSubmissionRepository(db)
        self.project_repo = ProjectRepository(db)
        self.project_sub_repo = ProjectSubmissionRepository(db)
        self.prediction_repo = PredictionRepository(db)

    # ── Student Dashboard ────────────────────────────────────────

    async def get_student_dashboard(self, student_id: UUID) -> dict:
        """Build complete student dashboard data."""
        student = await self.student_repo.get_with_user(student_id)
        if not student:
            return {}

        enrollments = await self.enrollment_repo.get_by_student(student_id, status="active")
        enrollment = enrollments[0] if enrollments else None

        if not enrollment:
            return {
                "overview": {
                    "student_name": student.user.full_name if student.user else "",
                    "student_code": student.student_code,
                    "current_enrollment": None,
                },
                "attendance": {"rate": 0, "present": 0, "absent": 0, "late": 0, "excused": 0, "total_lessons": 0},
                "quizzes": {"average_score": 0, "total_quizzes": 0, "completed": 0, "best_score": None, "worst_score": None},
                "assignments": {"average_score": 0, "total": 0, "submitted": 0, "graded": 0, "pending": 0},
                "projects": [],
                "progress": {"lessons_completed": 0, "total_lessons": 0, "percentage": 0, "videos_completed": 0, "total_videos": 0},
                "activity": {"last_active": None, "days_since_active": 0, "active_days_this_month": 0},
                "study_time": {"total_hours_this_week": 0, "total_hours_this_month": 0, "avg_daily_minutes": 0},
                "achievements": [],
                "scores": {},
            }

        course_id = enrollment.course_id

        # Get latest scores
        predictions = await self.prediction_repo.get_all_latest_by_enrollment(enrollment.id)
        scores_dict = {p.score_type: p.score_value for p in predictions}
        overall_pred = next((p for p in predictions if p.score_type == "overall"), None)

        # Attendance
        att_data = await self.attendance_repo.get_student_attendance_rate(student_id, course_id)
        if att_data.get("total_lessons", 0) == 0 and getattr(enrollment, "total_lessons_count", 0) > 0:
            att_cnt = getattr(enrollment, "attended_lessons_count", 0)
            tot_cnt = getattr(enrollment, "total_lessons_count", 10)
            att_data = {
                "rate": round((att_cnt / tot_cnt * 100), 1) if tot_cnt > 0 else 0.0,
                "present": att_cnt,
                "absent": max(0, tot_cnt - att_cnt),
                "late": 0,
                "excused": 0,
                "total_lessons": tot_cnt,
            }

        # Quizzes
        total_quizzes = await self.quiz_repo.count_by_course(course_id)
        best_attempts = await self.quiz_attempt_repo.get_best_attempts(student_id, course_id)
        quiz_percentages = [a.percentage for a in best_attempts]
        quiz_avg = sum(quiz_percentages) / len(quiz_percentages) if quiz_percentages else 0

        # Assignments
        total_assignments = await self.assignment_repo.count_by_course(course_id)
        all_subs = await self.assignment_sub_repo.get_by_student_and_course(student_id, course_id)
        graded_subs = [s for s in all_subs if s.status == "graded"]

        graded_scores = []
        for s in graded_subs:
            assignment = await self.assignment_repo.get_by_id(s.assignment_id)
            if assignment and assignment.total_marks > 0:
                graded_scores.append(s.score / assignment.total_marks * 100)
        assignment_avg = sum(graded_scores) / len(graded_scores) if graded_scores else 0

        # Projects
        project_subs = await self.project_sub_repo.get_by_student_and_course(student_id, course_id)
        projects_data = []
        for ps in project_subs:
            project = await self.project_repo.get_by_id(ps.project_id)
            projects_data.append({
                "title": project.title if project else "Unknown",
                "status": ps.status,
                "score": round(ps.score / project.total_marks * 100, 1) if ps.score and project and project.total_marks > 0 else None,
                "submitted_at": ps.submitted_at.isoformat() if ps.submitted_at else None,
            })

        # Progress
        total_lessons = await self.lesson_repo.count_by_course(course_id)
        video_progress = await self.video_repo.get_by_student_and_course(student_id, course_id)
        videos_completed = sum(1 for vp in video_progress if vp.completed)
        lessons_with_video = len([l for l in await self.lesson_repo.get_by_course(course_id) if l.video_url])

        # Activity
        last_active = await self.activity_repo.get_last_activity(student_id)
        active_days = await self.activity_repo.get_active_days_in_range(student_id, 30)
        now = datetime.now(timezone.utc)
        days_since = (now - last_active).days if last_active else 0

        # Study time
        watch_secs_week = await self.activity_repo.get_total_watch_time(student_id, 7)
        watch_secs_month = await self.activity_repo.get_total_watch_time(student_id, 30)

        # Achievements (rule-based, computed on the fly)
        achievements = self._compute_achievements(
            att_data["rate"], quiz_avg, active_days, enrollment.progress_percentage
        )

        meta = student.metadata_ if (student and hasattr(student, "metadata_") and student.metadata_) else {}
        return {
            "overview": {
                "student_name": student.user.full_name if student.user else "",
                "student_code": student.student_code,
                "first_name": student.user.first_name if student.user else "",
                "last_name": student.user.last_name if student.user else "",
                "email": student.user.email if student.user else "",
                "phone": student.user.phone if student.user else "",
                "personal_email": meta.get("personal_email", ""),
                "feedback": meta.get("feedback"),
                "feedback_updated_at": meta.get("feedback_updated_at"),
                "tasks": meta.get("tasks", []),
                "current_enrollment": {
                    "enrollment_id": str(enrollment.id),
                    "course_title": enrollment.course.title if enrollment.course else "",
                    "batch_name": getattr(enrollment, "batch_name", "BATCH 1"),
                    "progress": enrollment.progress_percentage,
                    "overall_score": round(overall_pred.score_value, 1) if overall_pred else None,
                    "classification": overall_pred.classification if overall_pred else None,
                    "attended_lessons_count": getattr(enrollment, "attended_lessons_count", 0),
                    "total_lessons_count": getattr(enrollment, "total_lessons_count", 10),
                    "completed_tasks_count": getattr(enrollment, "completed_tasks_count", 0),
                    "total_tasks_count": getattr(enrollment, "total_tasks_count", 12),
                },
            },
            "attendance": att_data,
            "quizzes": {
                "average_score": round(quiz_avg, 1),
                "total_quizzes": total_quizzes,
                "completed": len(best_attempts),
                "best_score": round(max(quiz_percentages), 1) if quiz_percentages else None,
                "worst_score": round(min(quiz_percentages), 1) if quiz_percentages else None,
            },
            "assignments": {
                "average_score": round(assignment_avg, 1),
                "total": total_assignments,
                "submitted": len(all_subs),
                "graded": len(graded_subs),
                "pending": total_assignments - len(all_subs),
            },
            "projects": projects_data,
            "progress": {
                "lessons_completed": sum(1 for vp in video_progress if vp.completed),
                "total_lessons": total_lessons,
                "percentage": enrollment.progress_percentage,
                "videos_completed": videos_completed,
                "total_videos": lessons_with_video,
            },
            "activity": {
                "last_active": last_active.isoformat() if last_active else None,
                "days_since_active": days_since,
                "active_days_this_month": active_days,
            },
            "study_time": {
                "total_hours_this_week": round(watch_secs_week / 3600, 1),
                "total_hours_this_month": round(watch_secs_month / 3600, 1),
                "avg_daily_minutes": round(watch_secs_month / 30 / 60, 1) if watch_secs_month else 0,
            },
            "achievements": achievements,
            "scores": scores_dict,
        }

    # ── Instructor Dashboard ─────────────────────────────────────

    async def get_instructor_dashboard(self, instructor_id: UUID) -> dict:
        """Build instructor dashboard."""
        courses = await self.course_repo.get_by_instructor(instructor_id)

        total_students = 0
        students_needing_attention = 0
        courses_data = []

        for course in courses:
            if course.status != "active":
                continue

            enrollments = await self.enrollment_repo.get_by_course(course.id, status="active")
            course_students = len(enrollments)
            total_students += course_students

            # Get classification distribution
            classifications = await self.prediction_repo.get_classifications_summary(course.id)
            needs_att = classifications.get("needs_attention", 0) + classifications.get("high_risk", 0)
            students_needing_attention += needs_att

            courses_data.append({
                "course_id": str(course.id),
                "title": course.title,
                "total_students": course_students,
                "avg_attendance": 0,  # Calculated from aggregation
                "avg_quiz_score": 0,
                "avg_assignment_score": 0,
                "completion_rate": 0,
                "classification_distribution": classifications,
            })

        # Inactive students
        inactive = []
        now = datetime.now(timezone.utc)
        for course in courses:
            enrollments = await self.enrollment_repo.get_by_course(course.id, status="active")
            for enrollment in enrollments:
                last_active = await self.activity_repo.get_last_activity(enrollment.student_id)
                if last_active:
                    days = (now - last_active).days
                    if days >= 7:
                        student = await self.student_repo.get_with_user(enrollment.student_id)
                        inactive.append({
                            "student_id": str(enrollment.student_id),
                            "student_name": student.user.full_name if student and student.user else "Unknown",
                            "course_title": course.title,
                            "days_inactive": days,
                            "last_active": last_active.isoformat(),
                        })

        return {
            "overview": {
                "total_students": total_students,
                "active_courses": len([c for c in courses if c.status == "active"]),
                "avg_attendance_this_week": 0,
                "students_needing_attention": students_needing_attention,
            },
            "courses": courses_data,
            "inactive_students": sorted(inactive, key=lambda x: x["days_inactive"], reverse=True)[:20],
        }

    # ── Admin Dashboard ──────────────────────────────────────────

    async def get_admin_dashboard(self, program_type: str = "intern") -> dict:
        """Build admin overview dashboard filtered by program_type ('intern' or 'student')."""
        # Filter courses by program_type
        course_filters = [Course.program_type == program_type] if program_type else []
        active_course_filters = [Course.status == "active"]
        if program_type:
            active_course_filters.append(Course.program_type == program_type)

        total_courses = await self.course_repo.count(filters=course_filters)
        active_courses = await self.course_repo.count(filters=active_course_filters)
        total_instructors = await self.instructor_repo.count()

        # Count students enrolled in courses of this program_type
        if program_type:
            stmt = select(func.count(func.distinct(Enrollment.student_id))).join(Course, Enrollment.course_id == Course.id).where(Course.program_type == program_type)
            res = await self.db.execute(stmt)
            total_students = res.scalar_one()
        else:
            total_students = await self.student_repo.count()

        # Enrollment stats
        total_enrollments = total_students
        active_enrollments = total_students
        completed_enrollments = 0
        dropped_enrollments = 0

        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_enrollments = total_students

        # Rates
        completion_rate = 0.0
        dropout_rate = 0.0
        active_students = total_students

        # Classifications
        classifications = await self.prediction_repo.get_classifications_summary()

        return {
            "overview": {
                "total_students": total_students,
                "active_students": active_students,
                "total_courses": total_courses,
                "active_courses": active_courses,
                "total_instructors": total_instructors,
                "new_enrollments_this_month": new_enrollments,
            },
            "rates": {
                "enrollment_rate": 100.0,
                "completion_rate": 0.0,
                "attendance_rate": 0,
                "dropout_rate": 0.0,
            },
            "inactive_students": {
                "7_days": 0,
                "14_days": 0,
                "30_days": 0,
            },
            "classification_distribution": {
                "excellent": classifications.get("excellent", 0),
                "good": classifications.get("good", 0),
                "average": classifications.get("average", 0),
                "needs_attention": classifications.get("needs_attention", 0),
                "high_risk": classifications.get("high_risk", 0),
            },
            "high_risk_students": await self._get_high_risk_students(),
            "top_courses": [],
            "top_instructors": [],
        }

    async def _get_high_risk_students(self):
        # Fetch up to 10 students with "high_risk" classification
        stmt = (
            select(Student, User, Prediction)
            .join(User, Student.user_id == User.id)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .join(Prediction, Prediction.enrollment_id == Enrollment.id)
            .where(Prediction.score_type == "dropout_risk")
            .where(Prediction.classification.in_(["high_risk", "needs_attention"]))
            .order_by(Prediction.score_value.desc())
            .limit(10)
        )
        result = await self.db.execute(stmt)
        rows = result.all()
        
        high_risk = []
        for s, u, p in rows:
            factors = []
            if isinstance(p.score_breakdown, dict):
                factors = list(p.score_breakdown.keys())
                
            high_risk.append({
                "id": str(s.id),
                "name": f"{u.first_name} {u.last_name}",
                "email": u.email,
                "student_code": s.student_code,
                "risk_score": p.score_value,
                "classification": p.classification,
                "factors": factors
            })
        return high_risk

    # ── Helpers ──────────────────────────────────────────────────

    def _compute_achievements(self, att_rate, quiz_avg, active_days, progress) -> list[dict]:
        achievements = []
        if att_rate >= 100:
            achievements.append({"title": "Perfect Attendance", "description": "100% attendance rate", "icon": "🎯"})
        if quiz_avg >= 90:
            achievements.append({"title": "Quiz Master", "description": "Average quiz score > 90%", "icon": "🏆"})
        if active_days >= 20:
            achievements.append({"title": "Consistent Learner", "description": "Active 20+ days this month", "icon": "🔥"})
        if progress >= 100:
            achievements.append({"title": "Course Complete", "description": "Finished the entire course", "icon": "🎓"})
        if progress >= 50 and att_rate >= 80:
            achievements.append({"title": "On Track", "description": "Great progress with solid attendance", "icon": "⭐"})
        return achievements
