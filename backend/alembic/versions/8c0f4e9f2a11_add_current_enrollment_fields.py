"""Add fields introduced after the initial schema.

Revision ID: 8c0f4e9f2a11
Revises: 37a70c0b9f2f
"""

from alembic import op
import sqlalchemy as sa


revision = "8c0f4e9f2a11"
down_revision = "37a70c0b9f2f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Bring the deployed schema in line with the current SQLAlchemy models."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    course_columns = {column["name"] for column in inspector.get_columns("courses")}
    enrollment_columns = {column["name"] for column in inspector.get_columns("enrollments")}

    if "program_type" not in course_columns:
        op.add_column(
            "courses",
            sa.Column("program_type", sa.String(length=20), nullable=False, server_default="intern"),
        )

    enrollment_fields = (
        ("attended_lessons_count", sa.Integer(), "0"),
        ("total_lessons_count", sa.Integer(), "10"),
        ("completed_tasks_count", sa.Integer(), "0"),
        ("total_tasks_count", sa.Integer(), "12"),
    )
    for name, column_type, default in enrollment_fields:
        if name not in enrollment_columns:
            op.add_column(
                "enrollments",
                sa.Column(name, column_type, nullable=False, server_default=default),
            )


def downgrade() -> None:
    """Remove only the fields introduced by this revision."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    enrollment_columns = {column["name"] for column in inspector.get_columns("enrollments")}
    for name in ("total_tasks_count", "completed_tasks_count", "total_lessons_count", "attended_lessons_count"):
        if name in enrollment_columns:
            op.drop_column("enrollments", name)

    course_columns = {column["name"] for column in inspector.get_columns("courses")}
    if "program_type" in course_columns:
        op.drop_column("courses", "program_type")
