"""
Dashboard response schemas for Student, Instructor, and Admin dashboards.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# ── Student Dashboard ────────────────────────────────────────────

class StudentOverview(BaseModel):
    student_name: str
    student_code: str
    current_enrollment: Optional["EnrollmentOverview"] = None


class EnrollmentOverview(BaseModel):
    enrollment_id: UUID
    course_title: str
    progress: float
    overall_score: Optional[float] = None
    classification: Optional[str] = None


class AttendanceSummary(BaseModel):
    rate: float
    present: int
    absent: int
    late: int
    excused: int
    total_lessons: int


class QuizSummary(BaseModel):
    average_score: float
    total_quizzes: int
    completed: int
    best_score: Optional[float] = None
    worst_score: Optional[float] = None


class AssignmentSummary(BaseModel):
    average_score: float
    total: int
    submitted: int
    graded: int
    pending: int


class ProjectSummaryItem(BaseModel):
    title: str
    status: str
    score: Optional[float] = None
    submitted_at: Optional[datetime] = None


class ProgressSummary(BaseModel):
    lessons_completed: int
    total_lessons: int
    percentage: float
    videos_completed: int
    total_videos: int


class ActivitySummary(BaseModel):
    last_active: Optional[datetime] = None
    days_since_active: int
    active_days_this_month: int


class StudyTimeSummary(BaseModel):
    total_hours_this_week: float
    total_hours_this_month: float
    avg_daily_minutes: float


class Achievement(BaseModel):
    title: str
    description: str
    icon: str


class StudentDashboardResponse(BaseModel):
    overview: StudentOverview
    attendance: AttendanceSummary
    quizzes: QuizSummary
    assignments: AssignmentSummary
    projects: list[ProjectSummaryItem]
    progress: ProgressSummary
    activity: ActivitySummary
    study_time: StudyTimeSummary
    achievements: list[Achievement]
    scores: dict = {}


# ── Instructor Dashboard ────────────────────────────────────────

class InstructorOverview(BaseModel):
    total_students: int
    active_courses: int
    avg_attendance_this_week: float
    students_needing_attention: int


class CourseStudentItem(BaseModel):
    student_id: UUID
    student_name: str
    student_code: str
    course_progress: float
    attendance_rate: float
    quiz_average: float
    assignment_average: float
    project_score: Optional[float] = None
    last_active_date: Optional[datetime] = None
    days_since_active: int = 0
    overall_score: Optional[float] = None
    performance_status: Optional[str] = None
    instructor_notes: Optional[str] = None


class CourseSummary(BaseModel):
    course_id: UUID
    title: str
    total_students: int
    avg_attendance: float
    avg_quiz_score: float
    avg_assignment_score: float
    completion_rate: float
    classification_distribution: dict = {}


class InactiveStudent(BaseModel):
    student_id: UUID
    student_name: str
    course_title: str
    days_inactive: int
    last_active: Optional[datetime] = None


class InstructorDashboardResponse(BaseModel):
    overview: InstructorOverview
    courses: list[CourseSummary]
    inactive_students: list[InactiveStudent]


# ── Admin Dashboard ──────────────────────────────────────────────

class AdminOverview(BaseModel):
    total_students: int
    active_students: int
    total_courses: int
    active_courses: int
    total_instructors: int
    new_enrollments_this_month: int


class AdminRates(BaseModel):
    enrollment_rate: float
    completion_rate: float
    attendance_rate: float
    dropout_rate: float


class ClassificationDistribution(BaseModel):
    excellent: int = 0
    good: int = 0
    average: int = 0
    needs_attention: int = 0
    high_risk: int = 0


class TopCourse(BaseModel):
    title: str
    enrollment_count: int
    avg_score: float
    completion_rate: float


class TopInstructor(BaseModel):
    name: str
    avg_student_score: float
    total_students: int


class AdminDashboardResponse(BaseModel):
    overview: AdminOverview
    rates: AdminRates
    inactive_students: dict = {}
    classification_distribution: ClassificationDistribution
    top_courses: list[TopCourse]
    top_instructors: list[TopInstructor]


# Rebuild forward refs
StudentOverview.model_rebuild()
