"""
Authentication service.
"""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import RoleName
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.config import get_settings
from app.models.user import User, Student, Instructor
from app.repositories.user_repository import UserRepository, StudentRepository, InstructorRepository

settings = get_settings()


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.student_repo = StudentRepository(db)
        self.instructor_repo = InstructorRepository(db)

    async def register(self, data: dict) -> dict:
        """Register a new user with role-specific profile."""
        # Check duplicate
        existing = await self.user_repo.get_by_email(data["email"])
        if existing:
            raise ConflictException("Email already registered")

        # Create user
        user = User(
            email=data["email"],
            password_hash=hash_password(data["password"]),
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone=data.get("phone"),
        )
        user = await self.user_repo.create(user)

        # Assign role and create profile
        role = data.get("role", "student")
        await self.user_repo.assign_role(user.id, role)

        if role == "student":
            student_code = await self.student_repo.generate_student_code()
            student = Student(user_id=user.id, student_code=student_code)
            await self.student_repo.create(student)
        elif role == "instructor":
            instructor = Instructor(user_id=user.id)
            await self.instructor_repo.create(instructor)

        # Generate tokens
        roles = [role]
        tokens = self._generate_tokens(user, roles)

        return tokens

    async def login(self, email: str, password: str) -> dict:
        """Authenticate user and return tokens."""
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        if user.status != "active":
            raise UnauthorizedException("Account is not active")

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        # Get roles
        roles = await self.user_repo.get_user_roles(user.id)

        return self._generate_tokens(user, roles)

    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token."""
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid refresh token")

        user = await self.user_repo.get_with_roles(payload["sub"])
        if not user:
            raise UnauthorizedException("User not found")

        roles = await self.user_repo.get_user_roles(user.id)
        access_token = create_access_token({
            "sub": str(user.id),
            "email": user.email,
            "roles": roles,
        })

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        }

    async def get_current_user(self, user_id: str) -> dict:
        """Get current user profile."""
        user = await self.user_repo.get_with_roles(user_id)
        if not user:
            raise UnauthorizedException("User not found")

        roles = await self.user_repo.get_user_roles(user.id)

        result = {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
            "status": user.status,
            "roles": roles,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

        # Add student/instructor specific data
        if "student" in roles:
            student = await self.student_repo.get_by_user_id(user.id)
            if student:
                result["student_id"] = str(student.id)
                result["student_code"] = student.student_code

        if "instructor" in roles:
            instructor = await self.instructor_repo.get_by_user_id(user.id)
            if instructor:
                result["instructor_id"] = str(instructor.id)

        return result

    def _generate_tokens(self, user: User, roles: list[str]) -> dict:
        """Generate JWT token pair."""
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "roles": roles,
        }

        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "roles": roles,
            },
        }
