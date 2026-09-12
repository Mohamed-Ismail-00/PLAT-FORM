"""Read-only partner APIs backed by the canonical platform records.

The partner workspace is a scoped view over the core Student/Enrollment data.
It deliberately does not maintain a second copy of students or evaluations.
"""

from datetime import datetime, timezone
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Header, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy import or_, select, update
from sqlalchemy.orm import selectinload

from app.core.constants import RoleName
from app.core.exceptions import ForbiddenException, NotFoundException, UnauthorizedException, ValidationException
from app.core.security import create_access_token, decode_token, verify_password
from app.core.dependencies import DBSession, require_roles
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.organization import Organization
from app.models.partner import PartnerDocument, PartnerUser
from app.models.user import Student, User
from app.schemas.common import DataResponse
from app.schemas.partner import PartnerLoginRequest


router = APIRouter(prefix="/partners/elswedy", tags=["El Sewedy Partner Workspace"])
PARTNER_SLUG = "elswedy"
ALLOWED_TRACKS = {"Software Engineering", "Artificial Intelligence"}
TRACK_TITLE_ALIASES = {
    "Software Engineering": {"Software Engineering", "Software Engineering Track", "Software"},
    "Artificial Intelligence": {"Artificial Intelligence", "Artificial Intelligence Track", "AI"},
}
ALLOWED_TRACK_TITLES = set().union(*TRACK_TITLE_ALIASES.values())
PARTNER_DOCUMENT_TYPES = {"certificate", "report"}
MAX_PARTNER_DOCUMENT_SIZE = 15 * 1024 * 1024


def _canonical_track_name(title: str) -> str:
    normalized = title.strip().lower()
    for canonical, aliases in TRACK_TITLE_ALIASES.items():
        if normalized in {alias.lower() for alias in aliases}:
            return canonical
    return title


async def get_partner_user(
    db: DBSession,
    authorization: Optional[str] = Header(None),
) -> dict:
    """Authenticate a partner token and resolve its organization scope."""
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedException("Partner authentication is required")

    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    if (
        not payload
        or payload.get("type") != "access"
        or payload.get("partner_slug") != PARTNER_SLUG
        or not payload.get("sub")
    ):
        raise UnauthorizedException("Invalid partner access token")

    try:
        partner_user_id = UUID(str(payload["sub"]))
    except (TypeError, ValueError):
        raise UnauthorizedException("Invalid partner access token") from None

    result = await db.execute(
        select(PartnerUser)
        .options(selectinload(PartnerUser.organization))
        .where(
            PartnerUser.id == partner_user_id,
            PartnerUser.workspace_slug == PARTNER_SLUG,
            PartnerUser.status == "active",
        )
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise UnauthorizedException("Partner account is not active")

    organization = user.organization
    if organization is None:
        organization = (await db.execute(
            select(Organization).where(Organization.slug == PARTNER_SLUG)
        )).scalar_one_or_none()
    if organization is None or organization.status != "active":
        raise UnauthorizedException("Partner organization is not active")

    return {
        "user_id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "partner_slug": PARTNER_SLUG,
        "partner_role": user.role,
        "organization_id": str(organization.id),
        "organization_name": organization.name,
    }


PartnerUserContext = Annotated[dict, Depends(get_partner_user)]


def _safe_tasks(metadata: dict) -> list[dict]:
    """Expose task evidence without leaking unrelated metadata keys."""
    allowed_fields = (
        "id", "title", "submission_link", "note", "rating_scale",
        "communication_rating", "quality_rating", "teamwork_rating", "created_at",
    )
    tasks = metadata.get("tasks", [])
    if not isinstance(tasks, list):
        return []
    safe_tasks = []
    for task in tasks:
        if not isinstance(task, dict) or not task.get("title"):
            continue
        scale = task.get("rating_scale")
        multiplier = 1 if scale == 10 else 2
        safe_task = {field: task.get(field) for field in allowed_fields if field in task}
        for field in ("communication_rating", "quality_rating", "teamwork_rating"):
            if field in safe_task:
                safe_task[field] = min(10.0, max(0.0, float(safe_task[field] or 0) * multiplier))
        safe_task["rating_scale"] = 10
        safe_tasks.append(safe_task)
    return safe_tasks


def _average_task_rating(tasks: list[dict]) -> float:
    if not tasks:
        return 0.0
    scores = []
    for task in tasks:
        ratings = [
            float(task.get("communication_rating") or 0),
            float(task.get("quality_rating") or 0),
            float(task.get("teamwork_rating") or 0),
        ]
        scores.append(sum(ratings) / len(ratings))
    return round(sum(scores) / len(scores), 1)


def serialize_enrollment(enrollment: Enrollment) -> dict:
    """Convert one canonical enrollment into the partner-safe DTO."""
    student = enrollment.student
    user = student.user
    metadata = student.metadata_ or {}
    tasks = _safe_tasks(metadata)
    total_days = enrollment.total_lessons_count or 0
    total_tasks = enrollment.total_tasks_count or 0
    return {
        "id": str(student.id),
        "enrollment_id": str(enrollment.id),
        "student_code": student.student_code,
        "first_name": user.first_name if user else "",
        "last_name": user.last_name if user else "",
        "full_name": user.full_name if user else "",
        "email": metadata.get("personal_email") or (user.email if user else None),
        "phone": user.phone if user else None,
        "track_name": _canonical_track_name(enrollment.course.title) if enrollment.course else "",
        "attended_days": enrollment.attended_lessons_count or 0,
        "total_days": total_days,
        "attendance_percentage": round(
            ((enrollment.attended_lessons_count or 0) / total_days) * 100, 1
        ) if total_days else 0,
        "completed_tasks": enrollment.completed_tasks_count or 0,
        "total_tasks": total_tasks,
        "progress_percentage": round(enrollment.progress_percentage or 0, 1),
        "overall_rating": _average_task_rating(tasks),
        "status": "completed" if enrollment.status == "completed" else "active",
        "report_status": metadata.get("report_status", "not_started"),
        "certificate_status": metadata.get("certificate_status", "not_issued"),
        "feedback": metadata.get("feedback"),
        "tasks": tasks,
        "organization_id": str(enrollment.organization_id),
        "organization_name": enrollment.organization.name if enrollment.organization else "El Sewedy University",
        "created_at": student.created_at.isoformat() if student.created_at else None,
        "updated_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
    }


def _serialize_document(
    document: PartnerDocument,
    student: Student,
    user: User,
    enrollment: Enrollment,
    course: Course,
) -> dict:
    """Return only partner-safe document metadata; bytes stay behind download auth."""
    return {
        "id": str(document.id),
        "document_type": document.document_type,
        "title": document.title,
        "filename": document.filename,
        "mime_type": document.mime_type,
        "file_size": document.file_size,
        "issued_at": document.issued_at.isoformat() if document.issued_at else None,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "student_id": str(student.id),
        "student_code": student.student_code,
        "student_name": user.full_name if user else "",
        "track_name": _canonical_track_name(course.title) if course else "",
        "enrollment_id": str(enrollment.id),
        "download_path": f"/partners/elswedy/documents/{document.id}",
    }


def _shared_enrollment_query(organization_id: UUID):
    return (
        select(Enrollment)
        .join(Student, Enrollment.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .options(
            selectinload(Enrollment.student).selectinload(Student.user),
            selectinload(Enrollment.course),
            selectinload(Enrollment.organization),
        )
        .where(
            Enrollment.organization_id == organization_id,
            Enrollment.status == "active",
            Course.program_type == "intern",
            Course.title.in_(ALLOWED_TRACK_TITLES),
        )
        .order_by(Enrollment.enrolled_at.desc())
    )


async def _load_partner_enrollments(
    db,
    organization_id: UUID,
    track_name: Optional[str] = None,
    search: Optional[str] = None,
) -> list[Enrollment]:
    query = _shared_enrollment_query(organization_id)
    if track_name:
        query = query.where(Course.title.in_(TRACK_TITLE_ALIASES[track_name]))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(
            User.first_name.ilike(term),
            User.last_name.ilike(term),
            User.email.ilike(term),
            Student.student_code.ilike(term),
        ))
    result = await db.execute(query)
    enrollments = result.scalars().all()

    # A student should be represented once in the partner directory. The
    # latest active enrollment wins if legacy data contains duplicates.
    unique: dict[UUID, Enrollment] = {}
    for enrollment in enrollments:
        unique.setdefault(enrollment.student_id, enrollment)
    return list(unique.values())


@router.post("/auth/login")
async def partner_login(data: PartnerLoginRequest, db: DBSession):
    """Login for partner users; never checks core platform users."""
    result = await db.execute(
        select(PartnerUser)
        .options(selectinload(PartnerUser.organization))
        .where(
            PartnerUser.workspace_slug == PARTNER_SLUG,
            PartnerUser.email == str(data.email).lower(),
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise UnauthorizedException("Invalid partner email or password")
    if user.status != "active":
        raise UnauthorizedException("Partner account is not active")

    organization = user.organization or (await db.execute(
        select(Organization).where(Organization.slug == PARTNER_SLUG)
    )).scalar_one_or_none()
    if organization is None or organization.status != "active":
        raise UnauthorizedException("Partner organization is not active")
    user.organization_id = organization.id
    user.last_login_at = datetime.now(timezone.utc)

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "partner_slug": PARTNER_SLUG,
        "partner_role": user.role,
        "organization_id": str(organization.id),
    })
    return DataResponse(data={
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "partner_slug": PARTNER_SLUG,
            "partner_role": user.role,
            "organization_id": str(organization.id),
            "organization_name": organization.name,
        },
    })


@router.get("/auth/me")
async def partner_me(current_user: PartnerUserContext):
    return DataResponse(data=current_user)


@router.get("/overview")
async def partner_overview(current_user: PartnerUserContext, db: DBSession):
    enrollments = await _load_partner_enrollments(
        db, UUID(current_user["organization_id"])
    )
    students = [serialize_enrollment(enrollment) for enrollment in enrollments]
    attendance_values = [student["attendance_percentage"] for student in students if student["total_days"]]
    performance_values = [student["overall_rating"] for student in students if student["overall_rating"]]
    completion_values = [
        (student["completed_tasks"] / student["total_tasks"]) * 100
        for student in students if student["total_tasks"]
    ]
    return DataResponse(data={
        "organization_name": current_user["organization_name"],
        "program_name": "Innovera x El Sewedy University Internship Program",
        "program_period": "September – October 2026",
        "program_status": "Live performance view",
        "tracks": sorted(ALLOWED_TRACKS),
        "total_students": len(students),
        "total_tracks": len(ALLOWED_TRACKS),
        "attendance_percentage": round(sum(attendance_values) / len(attendance_values), 1) if attendance_values else 0,
        "task_completion_percentage": round(sum(completion_values) / len(completion_values), 1) if completion_values else 0,
        "average_performance": round(sum(performance_values) / len(performance_values), 1) if performance_values else 0,
        "reports_pending": sum(student["report_status"] not in {"issued", "approved"} for student in students),
        "certificates_issued": sum(student["certificate_status"] == "issued" for student in students),
        "last_updated": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/students")
async def partner_students(
    current_user: PartnerUserContext,
    db: DBSession,
    track_name: Optional[str] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
):
    """List only active intern enrollments owned by the partner organization."""
    if track_name and track_name not in ALLOWED_TRACKS:
        raise NotFoundException("Track")
    enrollments = await _load_partner_enrollments(
        db,
        UUID(current_user["organization_id"]),
        track_name=track_name,
        search=search,
    )
    return DataResponse(data={
        "students": [serialize_enrollment(enrollment) for enrollment in enrollments],
        "total": len(enrollments),
    })


@router.get("/students/{student_id}")
async def partner_student_detail(
    student_id: UUID,
    current_user: PartnerUserContext,
    db: DBSession,
):
    """Return a single partner-scoped student or an opaque 404."""
    enrollments = await _load_partner_enrollments(
        db, UUID(current_user["organization_id"])
    )
    enrollment = next((item for item in enrollments if item.student_id == student_id), None)
    if enrollment is None:
        raise NotFoundException("Student")
    return DataResponse(data=serialize_enrollment(enrollment))


@router.get("/documents")
async def partner_documents(
    current_user: PartnerUserContext,
    db: DBSession,
    document_type: Optional[str] = Query(None),
):
    """List current issued documents for the authenticated organization only."""
    if document_type and document_type not in PARTNER_DOCUMENT_TYPES:
        raise ValidationException("Document type must be certificate or report")

    query = (
        select(PartnerDocument, Student, User, Enrollment, Course)
        .join(Student, PartnerDocument.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .join(Enrollment, PartnerDocument.enrollment_id == Enrollment.id)
        .join(Course, Enrollment.course_id == Course.id)
        .where(
            PartnerDocument.organization_id == UUID(current_user["organization_id"]),
            PartnerDocument.is_current.is_(True),
            Course.program_type == "intern",
        )
        .order_by(PartnerDocument.issued_at.desc(), PartnerDocument.created_at.desc())
    )
    if document_type:
        query = query.where(PartnerDocument.document_type == document_type)

    rows = (await db.execute(query)).all()
    documents = [
        _serialize_document(document, student, user, enrollment, course)
        for document, student, user, enrollment, course in rows
    ]
    return DataResponse(data={"documents": documents, "total": len(documents)})


@router.post("/documents/register")
async def register_partner_document(
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.INSTRUCTOR)),
    student_code: str = Form(..., min_length=1, max_length=40),
    document_type: str = Form(...),
    title: str = Form(..., min_length=1, max_length=255),
    file: UploadFile = File(...),
):
    """Register a generated PDF/image without changing the main UI workflow."""
    if document_type not in PARTNER_DOCUMENT_TYPES:
        raise ValidationException("Document type must be certificate or report")

    organization = (await db.execute(
        select(Organization).where(
            Organization.slug == PARTNER_SLUG,
            Organization.status == "active",
        )
    )).scalar_one_or_none()
    if organization is None:
        raise NotFoundException("Partner organization")

    normalized_code = student_code.strip()
    enrollment = (await db.execute(
        select(Enrollment, Student, User, Course)
        .join(Student, Enrollment.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .where(
            Student.student_code == normalized_code,
            Enrollment.organization_id == organization.id,
            Enrollment.status == "active",
            Course.program_type == "intern",
            Course.title.in_(ALLOWED_TRACK_TITLES),
        )
        .order_by(Enrollment.enrolled_at.desc())
    )).first()
    if enrollment is None:
        raise NotFoundException("El Sewedy student enrollment")

    enrollment_record, student, user, course = enrollment
    content = await file.read(MAX_PARTNER_DOCUMENT_SIZE + 1)
    if not content:
        raise ValidationException("The document file is empty")
    if len(content) > MAX_PARTNER_DOCUMENT_SIZE:
        raise ValidationException("The document must be smaller than 15 MB")

    original_filename = (file.filename or f"{document_type}_{normalized_code}.pdf").replace("\\", "/")
    filename = original_filename.rsplit("/", 1)[-1].replace('"', "")[:255]
    mime_type = (file.content_type or "application/pdf").lower()
    allowed_mime_types = {"application/pdf", "image/png", "image/jpeg"}
    if mime_type not in allowed_mime_types:
        raise ValidationException("Only PDF, PNG, or JPEG documents are supported")

    await db.execute(
        update(PartnerDocument)
        .where(
            PartnerDocument.organization_id == organization.id,
            PartnerDocument.student_id == student.id,
            PartnerDocument.document_type == document_type,
            PartnerDocument.is_current.is_(True),
        )
        .values(is_current=False)
    )

    metadata = dict(student.metadata_ or {})
    metadata[f"{document_type}_status"] = "issued"
    student.metadata_ = metadata
    document = PartnerDocument(
        organization_id=organization.id,
        student_id=student.id,
        enrollment_id=enrollment_record.id,
        document_type=document_type,
        title=title.strip(),
        filename=filename,
        mime_type=mime_type,
        file_size=len(content),
        content=content,
        is_current=True,
        created_by=UUID(str(current_user["user_id"])),
    )
    db.add(document)
    await db.flush()

    return DataResponse(data={
        "id": str(document.id),
        "document_type": document.document_type,
        "student_id": str(student.id),
        "student_code": student.student_code,
        "student_name": user.full_name if user else "",
        "track_name": _canonical_track_name(course.title) if course else "",
        "status": "issued",
    })


@router.get("/documents/{document_id}")
async def download_partner_document(
    document_id: UUID,
    current_user: PartnerUserContext,
    db: DBSession,
):
    """Stream a document only after verifying its partner organization scope."""
    document = (await db.execute(
        select(PartnerDocument).where(
            PartnerDocument.id == document_id,
            PartnerDocument.organization_id == UUID(current_user["organization_id"]),
            PartnerDocument.is_current.is_(True),
        )
    )).scalar_one_or_none()
    if document is None:
        raise NotFoundException("Partner document")

    safe_filename = document.filename.replace('"', "")
    return Response(
        content=document.content,
        media_type=document.mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{safe_filename}"',
            "Cache-Control": "private, no-store",
        },
    )


@router.post("/students", include_in_schema=False)
async def create_partner_student_blocked(current_user: PartnerUserContext):
    raise ForbiddenException("Students must be added from the Innovera admin dashboard.")


@router.patch("/students/{student_id}", include_in_schema=False)
async def update_partner_student_blocked(student_id: UUID, current_user: PartnerUserContext):
    raise ForbiddenException("Student updates must be made from the Innovera admin dashboard.")


@router.delete("/students/{student_id}", include_in_schema=False)
async def delete_partner_student_blocked(student_id: UUID, current_user: PartnerUserContext):
    raise ForbiddenException("Student deletion is managed from the Innovera admin dashboard.")
