"""Add intern batch grouping to enrollments.

Revision ID: b7d2e1a4f9c8
Revises: 8c0f4e9f2a11
"""

from alembic import op
import sqlalchemy as sa


revision = "b7d2e1a4f9c8"
down_revision = "8c0f4e9f2a11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("enrollments")}
    if "batch_name" not in columns:
        op.add_column(
            "enrollments",
            sa.Column("batch_name", sa.String(length=20), nullable=False, server_default="BATCH 1"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("enrollments")}
    if "batch_name" in columns:
        op.drop_column("enrollments", "batch_name")
