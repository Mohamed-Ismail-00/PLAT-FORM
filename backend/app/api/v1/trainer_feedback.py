"""Admin-only Microsoft Forms feedback import and trainer performance analytics."""

from collections import defaultdict
from datetime import datetime
from statistics import mean
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import ValidationError
from sqlalchemy import select

from app.core.constants import RoleName
from app.core.dependencies import DBSession, require_roles
from app.core.exceptions import ValidationException
from app.models.trainer_feedback import TrainerFeedbackImport, TrainerFeedbackResponse
from app.schemas.common import DataResponse
from app.schemas.trainer_feedback import (
    TrainerAxisScore,
    TrainerFeedbackImportResult,
    TrainerFeedbackMapping,
    TrainerFeedbackPreview,
    TrainerPerformanceAnalytics,
    TrainerPerformanceItem,
)
from app.services.trainer_feedback_import import (
    FeedbackImportError,
    build_preview,
    file_digest,
    normalize_rows,
    parse_spreadsheet,
)


router = APIRouter(prefix="/trainer-feedback", tags=["Trainer Feedback"])


async def _read_upload(file: UploadFile) -> tuple[str, bytes]:
    filename = file.filename or "trainer-feedback.xlsx"
    content = await file.read()
    await file.close()
    return filename, content


@router.post("/preview", response_model=DataResponse[TrainerFeedbackPreview])
async def preview_trainer_feedback_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Read an upload in memory and return a preview; no response data is saved yet."""
    del current_user
    filename, content = await _read_upload(file)
    try:
        preview = build_preview(filename, content)
        return DataResponse(data=TrainerFeedbackPreview.model_validate(preview))
    except FeedbackImportError as error:
        raise ValidationException(str(error)) from error


@router.post("/imports", response_model=DataResponse[TrainerFeedbackImportResult])
async def import_trainer_feedback_file(
    db: DBSession,
    file: UploadFile = File(...),
    mapping_json: str = Form(...),
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Import confirmed field mapping and normalized score data as an immutable source batch."""
    filename, content = await _read_upload(file)
    try:
        mapping = TrainerFeedbackMapping.model_validate_json(mapping_json)
        headers, rows, worksheet_name, source_format = parse_spreadsheet(filename, content)
    except (FeedbackImportError, ValidationError) as error:
        raise ValidationException(str(error)) from error

    selected_headers = [mapping.trainer_column, *[item.column for item in mapping.rating_columns]]
    if mapping.submitted_at_column:
        selected_headers.append(mapping.submitted_at_column)
    if mapping.feedback_column:
        selected_headers.append(mapping.feedback_column)
    missing = [header for header in selected_headers if header not in headers]
    if missing:
        raise ValidationException(f"Selected columns are not present in the uploaded file: {', '.join(missing)}")

    digest = file_digest(content)
    existing = (await db.execute(
        select(TrainerFeedbackImport).where(TrainerFeedbackImport.file_sha256 == digest)
    )).scalars().first()
    if existing:
        return DataResponse(data=TrainerFeedbackImportResult(
            import_id=existing.id,
            imported_rows=existing.imported_rows,
            skipped_rows=existing.skipped_rows,
            duplicate=True,
        ))

    normalized, skipped_rows = normalize_rows(rows, mapping.model_dump())
    if not normalized:
        raise ValidationException("No response rows contain a trainer name using the selected trainer column")

    feedback_import = TrainerFeedbackImport(
        original_filename=filename[:255],
        file_sha256=digest,
        source_format=source_format,
        worksheet_name=worksheet_name,
        column_mapping=mapping.model_dump(mode="json"),
        imported_rows=len(normalized),
        skipped_rows=skipped_rows,
        imported_by_user_id=UUID(current_user["user_id"]),
    )
    db.add(feedback_import)
    await db.flush()
    db.add_all([
        TrainerFeedbackResponse(import_id=feedback_import.id, **row)
        for row in normalized
    ])
    await db.flush()
    return DataResponse(data=TrainerFeedbackImportResult(
        import_id=feedback_import.id,
        imported_rows=len(normalized),
        skipped_rows=skipped_rows,
    ))


@router.get("/analytics", response_model=DataResponse[TrainerPerformanceAnalytics])
async def get_trainer_feedback_analytics(
    db: DBSession,
    current_user: dict = Depends(require_roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)),
):
    """Return deterministic, response-weighted trainer rankings across all approved imports."""
    del current_user
    responses = (await db.execute(
        select(TrainerFeedbackResponse).order_by(TrainerFeedbackResponse.created_at.desc())
    )).scalars().all()
    imports = (await db.execute(
        select(TrainerFeedbackImport.imported_at).order_by(TrainerFeedbackImport.imported_at.desc()).limit(1)
    )).scalars().all()
    grouped: dict[str, list[TrainerFeedbackResponse]] = defaultdict(list)
    for response in responses:
        grouped[response.trainer_name.strip()].append(response)

    ranked: list[dict[str, Any]] = []
    all_scores: list[float] = []
    for trainer_name, trainer_responses in grouped.items():
        response_scores = [item.overall_score for item in trainer_responses if item.overall_score is not None]
        all_scores.extend(response_scores)
        axes: dict[str, list[float]] = defaultdict(list)
        for item in trainer_responses:
            for axis_name, score in item.normalized_ratings.items():
                axes[axis_name].append(float(score))
        axis_scores = [
            TrainerAxisScore(name=name, score=round(mean(values), 2), response_count=len(values))
            for name, values in sorted(axes.items(), key=lambda entry: entry[0].casefold())
        ]
        score = round(mean(response_scores), 2) if response_scores else None
        count = len(trainer_responses)
        ranked.append({
            "trainer_name": trainer_name,
            "response_count": count,
            "overall_score": score,
            "confidence": _confidence_for(count),
            "status": _status_for(score),
            "axis_scores": axis_scores,
            "feedback_count": sum(1 for item in trainer_responses if item.feedback_text),
            "recent_feedback": [item.feedback_text for item in trainer_responses if item.feedback_text][:3],
        })

    ranked.sort(key=lambda item: (
        item["overall_score"] is None,
        -(item["overall_score"] or 0),
        -item["response_count"],
        item["trainer_name"].casefold(),
    ))
    trainers = [TrainerPerformanceItem(rank=index, **item) for index, item in enumerate(ranked, start=1)]
    return DataResponse(data=TrainerPerformanceAnalytics(
        total_trainers=len(trainers),
        total_responses=len(responses),
        overall_score=round(mean(all_scores), 2) if all_scores else None,
        latest_import_at=imports[0] if imports else None,
        trainers=trainers,
    ))


def _confidence_for(response_count: int) -> str:
    if response_count < 3:
        return "Limited data"
    if response_count < 8:
        return "Emerging evidence"
    return "Reliable"


def _status_for(score: float | None) -> str:
    if score is None:
        return "No valid ratings"
    if score >= 90:
        return "Exceptional"
    if score >= 80:
        return "Strong"
    if score >= 70:
        return "Satisfactory"
    return "Needs attention"
