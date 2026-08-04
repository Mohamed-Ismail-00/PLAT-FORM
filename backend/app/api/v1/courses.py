"""
Course API routes.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.constants import RoleName
from app.core.dependencies import CurrentUser, DBSession, require_roles
from app.core.exceptions import NotFoundException
from app.models.course import Course
from app.repositories.course_repository import CourseRepository, LessonRepository
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse, LessonCreate, LessonUpdate, LessonResponse
from app.schemas.common import DataResponse, PaginatedResponse, PaginationMeta

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.get("")
async def list_courses(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str = None,
):
    """List all courses (paginated)."""
    repo = CourseRepository(db)
    filters = []
    if status:
        filters.append(Course.status == status)

    courses = await repo.get_all(offset=(page - 1) * page_size, limit=page_size, filters=filters)
    total = await repo.count(filters=filters)

    items = []
    for c in courses:
        enrolled = await repo.get_enrolled_count(c.id)
        items.append({
            "id": str(c.id), "instructor_id": str(c.instructor_id),
            "title": c.title, "description": c.description,
            "total_lessons": c.total_lessons, "duration_weeks": c.duration_weeks,
            "status": c.status, "difficulty_level": c.difficulty_level,
            "start_date": c.start_date.isoformat() if c.start_date else None,
            "end_date": c.end_date.isoformat() if c.end_date else None,
            "enrolled_count": enrolled,
            "enrolled_students": enrolled,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {
        "data": items,
        "meta": {"page": page, "page_size": page_size, "total": total, "total_pages": -(-total // page_size)},
    }


@router.post("")
async def create_course(
    data: CourseCreate,
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Create a new course."""
    repo = CourseRepository(db)
    course = Course(**data.model_dump())
    course = await repo.create(course)
    return DataResponse(data={"id": str(course.id), "title": course.title, "status": course.status})


@router.get("/{course_id}")
async def get_course(course_id: UUID, db: DBSession, current_user: CurrentUser):
    """Get course details."""
    repo = CourseRepository(db)
    course = await repo.get_with_instructor(course_id)
    if not course:
        raise NotFoundException("Course")
    enrolled = await repo.get_enrolled_count(course_id)

    return DataResponse(data={
        "id": str(course.id), "instructor_id": str(course.instructor_id),
        "title": course.title, "description": course.description,
        "total_lessons": course.total_lessons, "duration_weeks": course.duration_weeks,
        "status": course.status, "difficulty_level": course.difficulty_level,
        "start_date": course.start_date.isoformat() if course.start_date else None,
        "end_date": course.end_date.isoformat() if course.end_date else None,
        "instructor_name": course.instructor.user.full_name if course.instructor and course.instructor.user else None,
        "enrolled_count": enrolled,
        "created_at": course.created_at.isoformat() if course.created_at else None,
    })


@router.put("/{course_id}")
async def update_course(
    course_id: UUID, data: CourseUpdate, db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.INSTRUCTOR)),
):
    """Update a course."""
    repo = CourseRepository(db)
    course = await repo.update_by_id(course_id, data.model_dump(exclude_unset=True))
    if not course:
        raise NotFoundException("Course")
    return DataResponse(data={"id": str(course.id), "title": course.title, "status": course.status})


@router.get("/{course_id}/lessons")
async def get_course_lessons(course_id: UUID, db: DBSession, current_user: CurrentUser):
    """Get all lessons for a course."""
    repo = LessonRepository(db)
    lessons = await repo.get_by_course(course_id)
    return DataResponse(data=[{
        "id": str(l.id), "course_id": str(l.course_id), "title": l.title,
        "order_number": l.order_number, "duration_minutes": l.duration_minutes,
        "video_url": l.video_url, "type": l.type,
        "scheduled_at": l.scheduled_at.isoformat() if l.scheduled_at else None,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in lessons])
