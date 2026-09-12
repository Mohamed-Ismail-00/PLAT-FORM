"""Add organization ownership to partner accounts and enrollments.

The migration is additive. Existing students and enrollments remain valid
with a NULL organization until an administrator assigns a partner.
"""

from uuid import uuid4

from alembic import op
import sqlalchemy as sa


revision = "d7e4a1c9b6f2"
down_revision = "c2f1a8e4d7b9"
branch_labels = None
depends_on = None


def _column_names(bind, table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(bind).get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    table_names = set(sa.inspect(bind).get_table_names())

    if "organizations" not in table_names:
        op.create_table(
            "organizations",
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("slug", sa.String(length=80), nullable=False),
            sa.Column("type", sa.String(length=40), nullable=False, server_default="university"),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
            sa.Column("logo_url", sa.String(length=500), nullable=True),
            sa.Column("branding_settings", sa.JSON(), nullable=False, server_default="{}"),
            sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("slug"),
        )
        op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)
        op.create_index("idx_organizations_status", "organizations", ["status"])

    organization_id = bind.execute(
        sa.text("SELECT id FROM organizations WHERE slug = :slug"),
        {"slug": "elswedy"},
    ).scalar_one_or_none()
    if organization_id is None:
        organization_id = uuid4()
        bind.execute(
            sa.text(
                "INSERT INTO organizations "
                "(id, name, slug, type, status, branding_settings) "
                "VALUES (:id, :name, :slug, :type, :status, :branding_settings)"
            ),
            {
                "id": organization_id,
                "name": "El Sewedy University",
                "slug": "elswedy",
                "type": "university",
                "status": "active",
                "branding_settings": "{}",
            },
        )

    enrollment_columns = _column_names(bind, "enrollments")
    if "organization_id" not in enrollment_columns:
        op.add_column(
            "enrollments",
            sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=True),
        )
        op.create_index("idx_enrollments_organization_id", "enrollments", ["organization_id"])

    partner_user_columns = _column_names(bind, "partner_users")
    if "organization_id" not in partner_user_columns:
        op.add_column(
            "partner_users",
            sa.Column("organization_id", sa.Uuid(as_uuid=True), nullable=True),
        )
        op.create_index("idx_partner_users_organization_id", "partner_users", ["organization_id"])

    bind.execute(
        sa.text(
            "UPDATE partner_users SET organization_id = :organization_id "
            "WHERE workspace_slug = :workspace_slug AND organization_id IS NULL"
        ),
        {"organization_id": organization_id, "workspace_slug": "elswedy"},
    )


def downgrade() -> None:
    bind = op.get_bind()
    partner_user_columns = _column_names(bind, "partner_users")
    if "organization_id" in partner_user_columns:
        op.drop_index("idx_partner_users_organization_id", table_name="partner_users")
        op.drop_column("partner_users", "organization_id")

    enrollment_columns = _column_names(bind, "enrollments")
    if "organization_id" in enrollment_columns:
        op.drop_index("idx_enrollments_organization_id", table_name="enrollments")
        op.drop_column("enrollments", "organization_id")

    if "organizations" in set(sa.inspect(bind).get_table_names()):
        op.drop_index("idx_organizations_status", table_name="organizations")
        op.drop_index("ix_organizations_slug", table_name="organizations")
        op.drop_table("organizations")
