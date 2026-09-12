"""Add isolated partner workspace tables.

Revision ID: c2f1a8e4d7b9
Revises: b7d2e1a4f9c8
"""

from alembic import op
import sqlalchemy as sa


revision = "c2f1a8e4d7b9"
down_revision = "b7d2e1a4f9c8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "partner_users",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_slug", sa.String(length=80), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("idx_partner_users_workspace", "partner_users", ["workspace_slug"])
    op.create_index("ix_partner_users_email", "partner_users", ["email"], unique=False)

    op.create_table(
        "partner_students",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("workspace_slug", sa.String(length=80), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("university_id", sa.String(length=80), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=30), nullable=True),
        sa.Column("track_name", sa.String(length=80), nullable=False),
        sa.Column("batch_name", sa.String(length=20), nullable=False),
        sa.Column("student_code", sa.String(length=40), nullable=False),
        sa.Column("attended_days", sa.Integer(), nullable=False),
        sa.Column("total_days", sa.Integer(), nullable=False),
        sa.Column("completed_tasks", sa.Integer(), nullable=False),
        sa.Column("total_tasks", sa.Integer(), nullable=False),
        sa.Column("progress_percentage", sa.Float(), nullable=False),
        sa.Column("overall_rating", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("report_status", sa.String(length=30), nullable=False),
        sa.Column("certificate_status", sa.String(length=30), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_slug", "student_code", name="uq_partner_student_workspace_code"),
    )
    op.create_index("idx_partner_students_workspace", "partner_students", ["workspace_slug"])
    op.create_index(
        "idx_partner_students_track_batch",
        "partner_students",
        ["workspace_slug", "track_name", "batch_name"],
    )


def downgrade() -> None:
    op.drop_index("idx_partner_students_track_batch", table_name="partner_students")
    op.drop_index("idx_partner_students_workspace", table_name="partner_students")
    op.drop_table("partner_students")
    op.drop_index("ix_partner_users_email", table_name="partner_users")
    op.drop_index("idx_partner_users_workspace", table_name="partner_users")
    op.drop_table("partner_users")
