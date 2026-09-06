"""Small compatibility migrations needed by serverless deployments.

The Render service runs Alembic before startup, while the Vercel function
loads the FastAPI app directly. These idempotent guards keep both runtimes
compatible when a new database column is introduced.
"""

from sqlalchemy import text

from app.db.session import engine


async def ensure_runtime_schema() -> None:
    """Ensure columns required by the currently deployed API exist."""
    async with engine.begin() as connection:
        await connection.execute(
            text(
                "ALTER TABLE enrollments "
                "ADD COLUMN IF NOT EXISTS batch_name VARCHAR(20) "
                "NOT NULL DEFAULT 'BATCH 1'"
            )
        )
