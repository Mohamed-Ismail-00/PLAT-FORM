"""Safe parsing and deterministic scoring for exported Microsoft Forms responses."""

import csv
import hashlib
import io
import math
import re
from datetime import datetime, timezone
from typing import Any

from dateutil import parser as date_parser
from openpyxl import load_workbook

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_DATA_ROWS = 10_000
_TEXT_SCORES = {
    "excellent": 5, "outstanding": 5, "very good": 4, "good": 3, "fair": 2, "poor": 1,
    "ممتاز": 5, "جيد جدا": 4, "جيد جداً": 4, "جيد": 3, "مقبول": 2, "ضعيف": 1,
}
_FILLED_STAR_CHARS = ("★", "⭐", "🌟")
_NON_RATING_TERMS = ("id", "email", "mail", "phone", "timestamp", "time", "date", "name", "code")


class FeedbackImportError(ValueError):
    """A client-safe, actionable spreadsheet validation error."""


def parse_spreadsheet(filename: str, content: bytes) -> tuple[list[str], list[dict[str, str]], str | None, str]:
    """Return clean headers and rows from a CSV or first XLSX sheet without persisting the file."""
    if not content:
        raise FeedbackImportError("The uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise FeedbackImportError("The uploaded file exceeds the 5 MB limit")
    lower_name = filename.lower()
    if lower_name.endswith(".csv"):
        try:
            rows = list(csv.reader(io.StringIO(content.decode("utf-8-sig"))))
        except UnicodeDecodeError as error:
            raise FeedbackImportError("CSV files must be UTF-8 encoded") from error
        worksheet_name, source_format = None, "csv"
    elif lower_name.endswith(".xlsx"):
        try:
            workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
            sheet = workbook.active
            worksheet_name = sheet.title
            rows = list(sheet.iter_rows(values_only=True))
            workbook.close()
        except Exception as error:  # openpyxl exceptions vary by corrupt source file.
            raise FeedbackImportError("The Excel workbook could not be read") from error
        source_format = "xlsx"
    else:
        raise FeedbackImportError("Upload a Microsoft Forms Excel export (.xlsx) or UTF-8 CSV file")

    if not rows:
        raise FeedbackImportError("The file does not contain any rows")
    headers = _deduplicate_headers(rows[0])
    data_rows: list[dict[str, str]] = []
    for values in rows[1: MAX_DATA_ROWS + 1]:
        entry = {headers[index]: _as_text(value) for index, value in enumerate(values[:len(headers)])}
        if any(entry.values()):
            data_rows.append(entry)
    if not data_rows:
        raise FeedbackImportError("The file contains headers but no response data")
    if len(rows) - 1 > MAX_DATA_ROWS:
        raise FeedbackImportError(f"The file has more than {MAX_DATA_ROWS:,} response rows")
    return headers, data_rows, worksheet_name, source_format


def build_preview(filename: str, content: bytes) -> dict[str, Any]:
    headers, rows, worksheet_name, source_format = parse_spreadsheet(filename, content)
    return {
        "filename": filename,
        "source_format": source_format,
        "worksheet_name": worksheet_name,
        "headers": headers,
        "row_count": len(rows),
        "sample_rows": [{header: row.get(header, "") for header in headers} for row in rows[:5]],
        "suggested_mapping": suggest_mapping(headers, rows),
    }


def suggest_mapping(headers: list[str], rows: list[dict[str, str]]) -> dict[str, Any]:
    """Suggest a mapping only; the admin always confirms it before any import."""
    lowered = {header: header.casefold() for header in headers}
    trainer = next((header for header in headers if any(term in lowered[header] for term in ("trainer", "instructor", "coach", "مدرب", "المحاضر"))), None)
    submitted_at = next((header for header in headers if any(term in lowered[header] for term in ("timestamp", "submitted", "response time", "وقت", "تاريخ"))), None)
    feedback = next((header for header in headers if any(term in lowered[header] for term in ("feedback", "comment", "suggestion", "ملاحظ", "تعليق", "اقتراح"))), None)
    ratings = [header for header in headers if _looks_like_rating(header, rows)]
    return {
        "trainer_column": trainer,
        "submitted_at_column": submitted_at,
        "feedback_column": feedback,
        "rating_columns": [{"column": header, "max_score": infer_max_score([row.get(header, "") for row in rows])} for header in ratings],
    }


def normalize_rows(rows: list[dict[str, str]], mapping: dict[str, Any]) -> tuple[list[dict[str, Any]], int]:
    trainer_column = mapping["trainer_column"]
    submitted_at_column = mapping.get("submitted_at_column")
    feedback_column = mapping.get("feedback_column")
    rating_columns = mapping["rating_columns"]
    normalized: list[dict[str, Any]] = []
    skipped = 0
    for offset, row in enumerate(rows, start=2):
        trainer_name = row.get(trainer_column, "").strip()
        if not trainer_name:
            skipped += 1
            continue
        scores: dict[str, float] = {}
        for rating in rating_columns:
            column = rating["column"]
            score = normalize_score(row.get(column, ""), rating.get("max_score"))
            if score is not None:
                scores[column] = score
        normalized.append({
            "source_row_number": offset,
            "trainer_name": trainer_name,
            "submitted_at": parse_datetime(row.get(submitted_at_column, "")) if submitted_at_column else None,
            "normalized_ratings": scores,
            "overall_score": round(sum(scores.values()) / len(scores), 2) if scores else None,
            "feedback_text": row.get(feedback_column, "").strip() or None if feedback_column else None,
            "raw_data": row,
        })
    return normalized, skipped


def infer_max_score(values: list[str]) -> int | None:
    numeric = [parsed for value in values if (parsed := _numeric_or_text_score(value)) is not None]
    if not numeric:
        return None
    maximum = max(numeric)
    if maximum <= 5:
        return 5
    if maximum <= 10:
        return 10
    if maximum <= 100:
        return 100
    return None


def normalize_score(value: str, max_score: int | None) -> float | None:
    numeric = _numeric_or_text_score(value)
    if numeric is None:
        return None
    scale = max_score or infer_max_score([value])
    if scale is None or scale <= 0 or numeric < 0 or numeric > scale:
        return None
    return round((numeric / scale) * 100, 2)


def parse_datetime(value: str) -> datetime | None:
    if not value.strip():
        return None
    try:
        parsed = date_parser.parse(value)
        return parsed.replace(tzinfo=parsed.tzinfo or timezone.utc)
    except (ValueError, OverflowError):
        return None


def file_digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _looks_like_rating(header: str, rows: list[dict[str, str]]) -> bool:
    lowered = header.casefold()
    if any(term in lowered for term in _NON_RATING_TERMS):
        return False
    values = [_numeric_or_text_score(row.get(header, "")) for row in rows[:100]]
    count = sum(value is not None for value in values)
    return count >= max(2, math.ceil(len(rows[:100]) * 0.5))


def _numeric_or_text_score(value: str) -> float | None:
    clean = value.strip().casefold()
    if not clean:
        return None
    if clean in _TEXT_SCORES:
        return float(_TEXT_SCORES[clean])
    match = re.match(r"^\s*(\d+(?:\.\d+)?)\b", clean)
    if match:
        return float(match.group(1))

    # Microsoft Forms can export Rating questions as literal star glyphs,
    # e.g. "★★★★★" or "★★★★☆", instead of a numeric value. Restrict the
    # accepted characters to star glyphs and whitespace so prose containing a
    # decorative star is never interpreted as a score.
    if re.fullmatch(r"[\s★⭐🌟☆]+", clean):
        stars = sum(clean.count(character) for character in _FILLED_STAR_CHARS)
        return float(stars) if 1 <= stars <= 5 else None
    return None


def _deduplicate_headers(raw_headers: Any) -> list[str]:
    seen: dict[str, int] = {}
    headers: list[str] = []
    for index, value in enumerate(raw_headers, start=1):
        base = _as_text(value).strip() or f"Column {index}"
        count = seen.get(base, 0) + 1
        seen[base] = count
        headers.append(base if count == 1 else f"{base} ({count})")
    return headers


def _as_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value).strip()
