"""
Generic base repository with common CRUD operations.
"""

from typing import Any, Generic, Optional, Type, TypeVar
from uuid import UUID

from sqlalchemy import func, select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic async repository with CRUD operations."""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID) -> Optional[ModelType]:
        """Get a single record by ID."""
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        offset: int = 0,
        limit: int = 20,
        filters: Optional[list] = None,
        order_by: Optional[Any] = None,
    ) -> list[ModelType]:
        """Get paginated list of records with optional filters."""
        query = select(self.model)

        if filters:
            for f in filters:
                query = query.where(f)

        if order_by is not None:
            query = query.order_by(order_by)
        elif hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())

        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count(self, filters: Optional[list] = None) -> int:
        """Count records with optional filters."""
        query = select(func.count()).select_from(self.model)
        if filters:
            for f in filters:
                query = query.where(f)
        result = await self.db.execute(query)
        return result.scalar_one()

    async def create(self, obj: ModelType) -> ModelType:
        """Create a new record."""
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update_by_id(self, id: UUID, data: dict) -> Optional[ModelType]:
        """Update a record by ID."""
        # Remove None values
        update_data = {k: v for k, v in data.items() if v is not None}
        if not update_data:
            return await self.get_by_id(id)

        await self.db.execute(
            update(self.model).where(self.model.id == id).values(**update_data)
        )
        await self.db.flush()
        return await self.get_by_id(id)

    async def delete_by_id(self, id: UUID) -> bool:
        """Delete a record by ID."""
        result = await self.db.execute(
            delete(self.model).where(self.model.id == id)
        )
        await self.db.flush()
        return result.rowcount > 0
