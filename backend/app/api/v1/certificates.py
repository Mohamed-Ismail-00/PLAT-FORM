"""Certificate download audit endpoints for internal dashboard users."""

from datetime import date, datetime, time, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.core.constants import ProgramType, RoleName
from app.core.dependencies import DBSession, require_roles
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.certificate import CertificateIssuanceEvent
from app.models.enrollment import Enrollment
from app.models.user import Student, User
from app.schemas.certificate import (
    CertificateActivitySummary,
    CertificateIssuanceCreate,
    CertificateIssuanceListItem,
    CertificateIssuanceResponse,
)
from app.schemas.common import DataResponse, PaginatedResponse, PaginationMeta


router = APIRouter(prefix="/certificates", tags=["Certificates"])


def _program_type_for_certificate(certificate_type: str) -> str:
    return ProgramType.STUDENT.value if certificate_type == "course" else ProgramType.INTERN.value


async def _get_verified_enrollment(
    db: DBSession,
    *,
    student_id: UUID,
    enrollment_id: UUID,
    expected_program_type: str,
) -> Enrollment:
    result = await db.execute(
        select(Enrollment)
        .options(joinedload(Enrollment.student).joinedload(Student.user), joinedload(Enrollment.course))
        .where(Enrollment.id == enrollment_id, Enrollment.student_id == student_id)
    )
    enrollment = result.scalars().first()
    if not enrollment:
        raise NotFoundException("Student enrollment")
    if not enrollment.course or enrollment.course.program_type != expected_program_type:
        raise ValidationException("Certificate type does not match the student's enrolled program")
    return enrollment


@router.post("/issuances", response_model=DataResponse[CertificateIssuanceResponse])
async def record_certificate_issuance(
    payload: CertificateIssuanceCreate,
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Persist one download event, safely accepting retries for the same event ID."""
    issuer_id = UUID(current_user["user_id"])
    existing = await db.get(CertificateIssuanceEvent, payload.event_id)
    if existing:
        if existing.issued_by_user_id != issuer_id:
            raise ConflictException("Certificate audit event ID is already in use")
        return DataResponse(data=CertificateIssuanceResponse(id=existing.id, issued_at=existing.issued_at))

    expected_program_type = _program_type_for_certificate(payload.certificate_type)
    enrollment = await _get_verified_enrollment(
        db,
        student_id=payload.student_id,
        enrollment_id=payload.enrollment_id,
        expected_program_type=expected_program_type,
    )
    issuer = await db.get(User, issuer_id)
    if not issuer:
        raise NotFoundException("Authenticated user")

    student = enrollment.student
    if not student or not student.user:
        raise NotFoundException("Student")

    event = CertificateIssuanceEvent(
        id=payload.event_id,
        student_id=student.id,
        enrollment_id=enrollment.id,
        organization_id=enrollment.organization_id,
        issued_by_user_id=issuer.id,
        program_type=expected_program_type,
        certificate_type=payload.certificate_type,
        file_format=payload.file_format,
        student_name_snapshot=student.user.full_name,
        student_code_snapshot=student.student_code,
        program_title_snapshot=payload.program_title.strip(),
        training_period_snapshot=(payload.training_period or "").strip() or None,
        course_hours_snapshot=payload.course_hours,
        issued_by_name_snapshot=issuer.full_name,
        issued_by_email_snapshot=issuer.email,
    )
    db.add(event)
    await db.flush()
    return DataResponse(data=CertificateIssuanceResponse(id=event.id, issued_at=event.issued_at))


@router.get(
    "/students/{student_id}/activity",
    response_model=DataResponse[CertificateActivitySummary],
)
async def get_certificate_activity(
    student_id: UUID,
    db: DBSession,
    program_type: str = Query(..., pattern="^(intern|student)$"),
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.INSTRUCTOR)),
):
    """Return compact issuance status for the card shown on a student dashboard."""
    count_result = await db.execute(
        select(func.count(CertificateIssuanceEvent.id)).where(
            CertificateIssuanceEvent.student_id == student_id,
            CertificateIssuanceEvent.program_type == program_type,
        )
    )
    total = int(count_result.scalar_one())
    if total == 0:
        return DataResponse(data=CertificateActivitySummary(issued=False, total_issuance_records=0))

    latest_result = await db.execute(
        select(CertificateIssuanceEvent)
        .where(
            CertificateIssuanceEvent.student_id == student_id,
            CertificateIssuanceEvent.program_type == program_type,
        )
        .order_by(CertificateIssuanceEvent.issued_at.desc(), CertificateIssuanceEvent.id.desc())
        .limit(1)
    )
    latest = latest_result.scalars().one()
    return DataResponse(
        data=CertificateActivitySummary(
            issued=True,
            total_issuance_records=total,
            last_issued_at=latest.issued_at,
            last_issued_by_name=latest.issued_by_name_snapshot,
        )
    )


@router.get("/issuances", response_model=PaginatedResponse[CertificateIssuanceListItem])
async def list_certificate_issuances(
    db: DBSession,
    program_type: str = Query(..., pattern="^(intern|student)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=120),
    issued_from: date | None = Query(None),
    issued_to: date | None = Query(None),
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """List immutable issuance records for the internal certificate registry."""
    filters = [CertificateIssuanceEvent.program_type == program_type]
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        filters.append(
            CertificateIssuanceEvent.student_name_snapshot.ilike(pattern)
            | CertificateIssuanceEvent.student_code_snapshot.ilike(pattern)
            | CertificateIssuanceEvent.program_title_snapshot.ilike(pattern)
        )
    if issued_from:
        filters.append(CertificateIssuanceEvent.issued_at >= datetime.combine(issued_from, time.min, tzinfo=timezone.utc))
    if issued_to:
        filters.append(CertificateIssuanceEvent.issued_at <= datetime.combine(issued_to, time.max, tzinfo=timezone.utc))

    total_result = await db.execute(select(func.count(CertificateIssuanceEvent.id)).where(*filters))
    total = int(total_result.scalar_one())
    result = await db.execute(
        select(CertificateIssuanceEvent)
        .where(*filters)
        .order_by(CertificateIssuanceEvent.issued_at.desc(), CertificateIssuanceEvent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    records = result.scalars().all()
    items = [
        CertificateIssuanceListItem(
            id=record.id,
            student_id=record.student_id,
            enrollment_id=record.enrollment_id,
            student_name=record.student_name_snapshot,
            student_code=record.student_code_snapshot,
            program_title=record.program_title_snapshot,
            training_period=record.training_period_snapshot,
            course_hours=record.course_hours_snapshot,
            certificate_type=record.certificate_type,
            file_format=record.file_format,
            issued_by_name=record.issued_by_name_snapshot,
            issued_at=record.issued_at,
        )
        for record in records
    ]
    return PaginatedResponse(
        data=items,
        meta=PaginationMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=max(1, -(-total // page_size)),
        ),
    )
