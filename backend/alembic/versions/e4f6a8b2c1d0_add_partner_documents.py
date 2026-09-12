"""Add issued documents shared with scoped partner workspaces.

Revision ID: e4f6a8b2c1d0
Revises: d7e4a1c9b6f2
"""

from alembic import op
import sqlalchemy as sa


revision = "e4f6a8b2c1d0"
down_revision = "d7e4a1c9b6f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "partner_documents",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("enrollment_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("document_type", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("is_current", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_by", sa.Uuid(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["enrollment_id"], ["enrollments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_partner_documents_scope",
        "partner_documents",
        ["organization_id", "document_type", "is_current"],
    )
    op.create_index(
        "idx_partner_documents_student",
        "partner_documents",
        ["student_id", "document_type", "is_current"],
    )


def downgrade() -> None:
    op.drop_index("idx_partner_documents_student", table_name="partner_documents")
    op.drop_index("idx_partner_documents_scope", table_name="partner_documents")
    op.drop_table("partner_documents")
