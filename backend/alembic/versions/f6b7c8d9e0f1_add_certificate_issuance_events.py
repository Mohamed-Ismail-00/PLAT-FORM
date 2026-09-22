"""Add immutable certificate issuance audit records.

Revision ID: f6b7c8d9e0f1
Revises: e4f6a8b2c1d0
"""

from alembic import op
import sqlalchemy as sa


revision = "f6b7c8d9e0f1"
down_revision = "e4f6a8b2c1d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "certificate_issuance_events",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("enrollment_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("issued_by_user_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("program_type", sa.String(length=20), nullable=False),
        sa.Column("certificate_type", sa.String(length=20), nullable=False),
        sa.Column("event_type", sa.String(length=40), server_default="download_initiated", nullable=False),
        sa.Column("file_format", sa.String(length=10), nullable=False),
        sa.Column("source", sa.String(length=40), server_default="admin_dashboard", nullable=False),
        sa.Column("student_name_snapshot", sa.String(length=220), nullable=False),
        sa.Column("student_code_snapshot", sa.String(length=40), nullable=False),
        sa.Column("program_title_snapshot", sa.String(length=255), nullable=False),
        sa.Column("training_period_snapshot", sa.String(length=160), nullable=True),
        sa.Column("course_hours_snapshot", sa.Integer(), nullable=True),
        sa.Column("issued_by_name_snapshot", sa.String(length=220), nullable=False),
        sa.Column("issued_by_email_snapshot", sa.String(length=255), nullable=True),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("program_type IN ('intern', 'student')", name="ck_certificate_events_program_type"),
        sa.CheckConstraint(
            "certificate_type IN ('internship', 'course')",
            name="ck_certificate_events_certificate_type",
        ),
        sa.CheckConstraint("file_format IN ('pdf', 'png')", name="ck_certificate_events_file_format"),
        sa.CheckConstraint(
            "(program_type = 'intern' AND certificate_type = 'internship') "
            "OR (program_type = 'student' AND certificate_type = 'course')",
            name="ck_certificate_events_program_certificate_match",
        ),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["issued_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_certificate_events_student_issued_at",
        "certificate_issuance_events",
        ["student_id", "issued_at"],
    )
    op.create_index(
        "idx_certificate_events_enrollment_issued_at",
        "certificate_issuance_events",
        ["enrollment_id", "issued_at"],
    )
    op.create_index(
        "idx_certificate_events_program_issued_at",
        "certificate_issuance_events",
        ["program_type", "issued_at"],
    )
    op.create_index(
        "idx_certificate_events_organization_issued_at",
        "certificate_issuance_events",
        ["organization_id", "issued_at"],
    )


def downgrade() -> None:
    op.drop_index("idx_certificate_events_organization_issued_at", table_name="certificate_issuance_events")
    op.drop_index("idx_certificate_events_program_issued_at", table_name="certificate_issuance_events")
    op.drop_index("idx_certificate_events_enrollment_issued_at", table_name="certificate_issuance_events")
    op.drop_index("idx_certificate_events_student_issued_at", table_name="certificate_issuance_events")
    op.drop_table("certificate_issuance_events")
