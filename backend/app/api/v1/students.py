"""
Student API routes.
"""

import re
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.core.constants import RoleName
from app.core.dependencies import CurrentUser, DBSession, require_roles
from app.core.exceptions import NotFoundException
from app.core.security import hash_password
from app.models.enrollment import Enrollment
from app.models.user import Student, User
from app.repositories.course_repository import CourseRepository, EnrollmentRepository
from app.repositories.user_repository import StudentRepository, UserRepository
from app.schemas.common import DataResponse
from app.schemas.user import QuickAddStudentRequest

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("")
async def list_students(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000),
    search: str = None,
    program_type: str = None,
):
    """List all students (paginated). Filter by program_type: 'intern' or 'student'."""
    repo = StudentRepository(db)
    students = await repo.get_all_with_users(offset=(page - 1) * page_size, limit=page_size)
    total = await repo.count()

    items = []
    for s in students:
        if search and search.lower() not in (s.user.full_name.lower() if s.user else ""):
            continue
        
        # Find the enrollment matching program_type filter
        enrollment = None
        track_name = ""
        if s.enrollments:
            for enr in s.enrollments:
                if enr.course:
                    if program_type and enr.course.program_type != program_type:
                        continue
                    enrollment = enr
                    track_name = enr.course.title
                    break
            if not enrollment and program_type:
                # This student has no enrollment matching the requested program_type
                continue
            if not enrollment and s.enrollments:
                enrollment = s.enrollments[0]
                track_name = enrollment.course.title if enrollment.course else ""

        feedback = (s.metadata_ or {}).get("feedback") if hasattr(s, "metadata_") and s.metadata_ else None
        items.append({
            "id": str(s.id), "student_code": s.student_code,
            "full_name": s.user.full_name if s.user else "",
            "email": s.user.email if s.user else "",
            "status": s.user.status if s.user else "",
            "track_name": track_name,
            "education_level": s.education_level,
            "attended_lessons_count": enrollment.attended_lessons_count if enrollment else 0,
            "total_lessons_count": enrollment.total_lessons_count if enrollment else 10,
            "completed_tasks_count": enrollment.completed_tasks_count if enrollment else 0,
            "total_tasks_count": enrollment.total_tasks_count if enrollment else 12,
            "progress_percentage": enrollment.progress_percentage if enrollment else 0,
            "feedback": feedback,
            "tasks": (s.metadata_ or {}).get("tasks", []) if hasattr(s, "metadata_") and s.metadata_ else [],
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })

    filtered_total = len(items)
    return {
        "data": items,
        "meta": {"page": page, "page_size": page_size, "total": filtered_total, "total_pages": max(1, -(-filtered_total // page_size))},
    }


@router.get("/{student_id}")
async def get_student(student_id: UUID, db: DBSession, current_user: CurrentUser):
    """Get student details."""
    repo = StudentRepository(db)
    student = await repo.get_with_user(student_id)
    if not student:
        raise NotFoundException("Student")

    return DataResponse(data={
        "id": str(student.id), "user_id": str(student.user_id),
        "student_code": student.student_code,
        "full_name": student.user.full_name if student.user else "",
        "email": student.user.email if student.user else "",
        "phone": student.user.phone if student.user else None,
        "education_level": student.education_level,
        "date_of_birth": student.date_of_birth.isoformat() if student.date_of_birth else None,
        "status": student.user.status if student.user else "",
        "created_at": student.created_at.isoformat() if student.created_at else None,
    })


from app.schemas.enrollment import StudentProgressUpdate
from app.services.scoring.engine import ScoreManager


@router.put("/{student_id}/progress")
async def update_student_progress(
    student_id: UUID,
    data: StudentProgressUpdate,
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.INSTRUCTOR)),
):
    """Directly update student progress (attended lectures, completed tasks) and trigger real-time score recalculation."""
    enrollment_repo = EnrollmentRepository(db)
    enrollments = await enrollment_repo.get_by_student(student_id, status="active")
    if not enrollments:
        raise NotFoundException("Active enrollment for student")

    enrollment = enrollments[0]
    enrollment.attended_lessons_count = data.attended_lessons_count
    enrollment.total_lessons_count = data.total_lessons_count
    enrollment.completed_tasks_count = data.completed_tasks_count
    enrollment.total_tasks_count = data.total_tasks_count

    # Calculate overall progress percentage
    attendance_pct = (data.attended_lessons_count / data.total_lessons_count * 100) if data.total_lessons_count > 0 else 0
    task_pct = (data.completed_tasks_count / data.total_tasks_count * 100) if data.total_tasks_count > 0 else 0
    enrollment.progress_percentage = round((attendance_pct + task_pct) / 2.0, 1)

    student_repo = StudentRepository(db)
    student = await student_repo.get_with_user(student_id)
    if student:
        # Update user personal info if provided
        if student.user:
            if data.first_name is not None and data.first_name.strip():
                student.user.first_name = data.first_name.strip()
            if data.last_name is not None and data.last_name.strip():
                student.user.last_name = data.last_name.strip()
            if data.phone is not None:
                student.user.phone = data.phone.strip() if data.phone else None
            if data.email is not None and data.email.strip():
                student.user.email = data.email.strip()

        meta = dict(student.metadata_ or {})
        if data.personal_email is not None:
            meta["personal_email"] = data.personal_email.strip() if data.personal_email else ""
        if data.feedback is not None:
            meta["feedback"] = data.feedback
            meta["feedback_updated_at"] = datetime.now(timezone.utc).isoformat()
        if data.tasks is not None:
            meta["tasks"] = [t.model_dump() if hasattr(t, "model_dump") else t.dict() for t in data.tasks]
            enrollment.completed_tasks_count = len(data.tasks)
            # Recompute task percentage
            task_pct = (enrollment.completed_tasks_count / enrollment.total_tasks_count * 100) if enrollment.total_tasks_count > 0 else 0
            enrollment.progress_percentage = round((attendance_pct + task_pct) / 2.0, 1)
        student.metadata_ = meta

    await db.flush()

    # Recalculate scores and predictions using ScoreManager
    score_manager = ScoreManager(db)
    res = await score_manager.calculate_all_scores(
        student_id=student_id,
        enrollment_id=enrollment.id,
        course_id=enrollment.course_id,
    )

    await db.commit()

    return DataResponse(data={
        "student_id": str(student_id),
        "enrollment_id": str(enrollment.id),
        "attended_lessons_count": enrollment.attended_lessons_count,
        "total_lessons_count": enrollment.total_lessons_count,
        "completed_tasks_count": enrollment.completed_tasks_count,
        "total_tasks_count": enrollment.total_tasks_count,
        "progress_percentage": enrollment.progress_percentage,
        "feedback": (student.metadata_ or {}).get("feedback") if student else data.feedback,
        "tasks": (student.metadata_ or {}).get("tasks", []) if student else (data.tasks or []),
        "scoring": res,
    })


@router.post("/quick-add")
async def quick_add_student(
    data: QuickAddStudentRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """Quickly add a new student to a track.
    
    Creates a User, Student profile, assigns the student role,
    and enrolls them in the specified course — all in one step.
    """
    # Verify the course exists
    course_repo = CourseRepository(db)
    course = await course_repo.get_by_id(data.course_id)
    if not course:
        raise NotFoundException("Course")

    # Generate a unique email from the name
    base_email = f"{data.first_name.lower()}.{data.last_name.lower()}"
    base_email = re.sub(r"[^a-z0-9.]", "", base_email)  # sanitize
    email = f"{base_email}@innovera-intern.com"

    # Check if email already exists, append a number if so
    user_repo = UserRepository(db)
    existing = await user_repo.get_by_email(email)
    counter = 1
    while existing:
        email = f"{base_email}{counter}@innovera-intern.com"
        existing = await user_repo.get_by_email(email)
        counter += 1

    # Create User with optional phone
    user = User(
        email=email,
        password_hash=hash_password("Innovera@2026"),
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone if data.phone else None,
        status="active",
    )
    db.add(user)
    await db.flush()

    # Assign student role
    await user_repo.assign_role(user.id, RoleName.STUDENT.value)

    # Create Student profile with optional personal_email in metadata
    student_repo = StudentRepository(db)
    student_code = await student_repo.generate_student_code()
    student_metadata = {}
    if data.personal_email:
        student_metadata["personal_email"] = data.personal_email
    student = Student(
        user_id=user.id,
        student_code=student_code,
        metadata_=student_metadata if student_metadata else {},
    )
    db.add(student)
    await db.flush()

    # Enroll in the course
    enrollment = Enrollment(
        student_id=student.id,
        course_id=data.course_id,
        status="active",
    )
    db.add(enrollment)
    await db.commit()

    return DataResponse(data={
        "id": str(student.id),
        "user_id": str(user.id),
        "student_code": student_code,
        "full_name": f"{data.first_name} {data.last_name}",
        "email": email,
        "personal_email": data.personal_email,
        "phone": data.phone,
        "track_name": course.title,
        "message": "Student added successfully",
    })


@router.delete("/{student_id}")
async def delete_student(
    student_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """Delete a student and their associated user account cleanly."""
    student_repo = StudentRepository(db)
    student = await student_repo.get_with_user(student_id)
    if not student:
        raise NotFoundException("Student")

    user_id = student.user_id

    # Clean cascade deletion in reverse dependency order
    from sqlalchemy import text
    await db.execute(text("DELETE FROM user_roles WHERE user_id = :uid"), {"uid": str(user_id)})
    await db.execute(text("DELETE FROM enrollments WHERE student_id = :sid"), {"sid": str(student_id)})
    await db.execute(text("DELETE FROM students WHERE id = :sid"), {"sid": str(student_id)})
    await db.execute(text("DELETE FROM users WHERE id = :uid"), {"uid": str(user_id)})
    await db.commit()

    return DataResponse(data={"message": "Student removed successfully", "id": str(student_id)})
