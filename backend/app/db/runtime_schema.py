"""Small compatibility migrations needed by serverless deployments.

The Render service runs Alembic before startup, while the Vercel function
loads the FastAPI app directly. These idempotent guards keep both runtimes
compatible when a new database column is introduced.
"""

from uuid import uuid4

from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.session import engine
from app.models.organization import Organization
from app.models.partner import PartnerDocument, PartnerStudent, PartnerUser


async def ensure_runtime_schema() -> None:
    """Ensure columns required by the currently deployed API exist."""
    async with engine.begin() as connection:
        # Vercel loads the app without running Alembic. The organization table
        # and partner tables are safe additive objects. SQLite is used only
        # for local demos, so it can create the complete model graph to make
        # the local admin-to-partner flow testable end to end.
        tables = [
            Organization.__table__,
            PartnerUser.__table__,
            PartnerStudent.__table__,
            PartnerDocument.__table__,
        ]
        if connection.dialect.name == "sqlite":
            tables = list(Base.metadata.sorted_tables)
        await connection.run_sync(
            lambda sync_connection: Base.metadata.create_all(
                sync_connection,
                tables=tables,
            )
        )

        def table_columns(sync_connection, table_name: str) -> set[str]:
            table_names = inspect(sync_connection).get_table_names()
            if table_name not in table_names:
                return set()
            return {column["name"] for column in inspect(sync_connection).get_columns(table_name)}

        partner_user_columns = await connection.run_sync(
            lambda sync_connection: table_columns(sync_connection, "partner_users")
        )
        if "organization_id" not in partner_user_columns:
            column_type = "CHAR(32)" if connection.dialect.name == "sqlite" else "UUID"
            await connection.execute(text(f"ALTER TABLE partner_users ADD COLUMN organization_id {column_type}"))

        enrollment_columns = await connection.run_sync(
            lambda sync_connection: table_columns(sync_connection, "enrollments")
        )
        if enrollment_columns and "organization_id" not in enrollment_columns:
            column_type = "CHAR(32)" if connection.dialect.name == "sqlite" else "UUID"
            await connection.execute(text(f"ALTER TABLE enrollments ADD COLUMN organization_id {column_type}"))
            if connection.dialect.name == "sqlite":
                await connection.execute(
                    text("CREATE INDEX IF NOT EXISTS idx_enrollments_organization_id ON enrollments (organization_id)")
                )
            else:
                await connection.execute(
                    text("CREATE INDEX IF NOT EXISTS idx_enrollments_organization_id ON enrollments (organization_id)")
                )

        organization_row = (await connection.execute(
            text("SELECT id FROM organizations WHERE slug = 'elswedy'")
        )).first()
        organization_id = organization_row[0] if organization_row else uuid4().hex
        if organization_row is None:
            await connection.execute(
                text(
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
        await connection.execute(
            text(
                "UPDATE partner_users SET organization_id = :organization_id "
                "WHERE workspace_slug = 'elswedy' AND organization_id IS NULL"
            ),
            {"organization_id": organization_id},
        )

        if connection.dialect.name == "sqlite":
            def has_batch_column(sync_connection) -> bool:
                table_names = inspect(sync_connection).get_table_names()
                if "enrollments" not in table_names:
                    return True
                columns = inspect(sync_connection).get_columns("enrollments")
                return any(column["name"] == "batch_name" for column in columns)

            if not await connection.run_sync(has_batch_column):
                await connection.execute(
                    text(
                        "ALTER TABLE enrollments ADD COLUMN batch_name VARCHAR(20) "
                        "NOT NULL DEFAULT 'BATCH 1'"
                    )
                )
        else:
            await connection.execute(
                text(
                    "ALTER TABLE enrollments "
                    "ADD COLUMN IF NOT EXISTS batch_name VARCHAR(20) "
                    "NOT NULL DEFAULT 'BATCH 1'"
                )
            )
