"""add trainer feedback imports

Revision ID: a1b2c3d4e5f6
Revises: f6b7c8d9e0f1
Create Date: 2026-09-22
"""

from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "f6b7c8d9e0f1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "trainer_feedback_imports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("file_sha256", sa.String(length=64), nullable=False),
        sa.Column("source_format", sa.String(length=10), nullable=False),
        sa.Column("worksheet_name", sa.String(length=160), nullable=True),
        sa.Column("column_mapping", sa.JSON(), nullable=False),
        sa.Column("imported_rows", sa.Integer(), nullable=False),
        sa.Column("skipped_rows", sa.Integer(), nullable=False),
        sa.Column("imported_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["imported_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_sha256"),
    )
    op.create_index("idx_trainer_feedback_imports_imported_at", "trainer_feedback_imports", ["imported_at"])
    op.create_table(
        "trainer_feedback_responses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("import_id", sa.Uuid(), nullable=False),
        sa.Column("source_row_number", sa.Integer(), nullable=False),
        sa.Column("trainer_name", sa.String(length=220), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("normalized_ratings", sa.JSON(), nullable=False),
        sa.Column("overall_score", sa.Float(), nullable=True),
        sa.Column("feedback_text", sa.Text(), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["import_id"], ["trainer_feedback_imports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("import_id", "source_row_number", name="uq_trainer_feedback_import_row"),
    )
    op.create_index("idx_trainer_feedback_responses_trainer", "trainer_feedback_responses", ["trainer_name"])
    op.create_index("idx_trainer_feedback_responses_import", "trainer_feedback_responses", ["import_id"])


def downgrade() -> None:
    op.drop_index("idx_trainer_feedback_responses_import", table_name="trainer_feedback_responses")
    op.drop_index("idx_trainer_feedback_responses_trainer", table_name="trainer_feedback_responses")
    op.drop_table("trainer_feedback_responses")
    op.drop_index("idx_trainer_feedback_imports_imported_at", table_name="trainer_feedback_imports")
    op.drop_table("trainer_feedback_imports")
