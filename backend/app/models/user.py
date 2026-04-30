"""User ORM model for the Tethread crochet keychain store."""

from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
	"""Represents a user account in the Tethread store."""

	__tablename__ = "users"

	# Unique identifier for the user, auto-generated with uuid4.
	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

	# User login email; must be unique, indexed for fast lookups, and required.
	email = Column(String(255), unique=True, nullable=False, index=True)

	# Securely hashed password for authentication.
	hashed_password = Column(String(255), nullable=False)

	# User's full display name.
	full_name = Column(String(255), nullable=False)

	# Optional contact phone number.
	phone_number = Column(String(20), nullable=True)

	# Whether the account is active and allowed to use the platform.
	is_active = Column(Boolean, default=True, nullable=False)

	# Whether the user has administrative privileges.
	is_admin = Column(Boolean, default=False, nullable=False)

	# Timestamp when the account was created (UTC).
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

	# Timestamp for last update; auto-updates on every row update (UTC).
	updated_at = Column(
		DateTime,
		default=datetime.utcnow,
		onupdate=datetime.utcnow,
		nullable=False,
	)

	# Orders placed by this user.
	orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")

	def __repr__(self) -> str:
		"""Return a concise debug representation of the user."""
		return f"<User(id={self.id}, email={self.email})>"
