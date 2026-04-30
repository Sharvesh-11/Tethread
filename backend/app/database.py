"""Async database configuration for FastAPI using SQLAlchemy + asyncpg."""

import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load variables from .env into environment variables.
load_dotenv()

# Read the database connection string from environment variables.
# Example: postgresql+asyncpg://user:password@localhost:5432/dbname
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
	raise RuntimeError("DATABASE_URL is not set. Please define it in your .env file.")

# Create the async SQLAlchemy engine that talks to PostgreSQL via asyncpg.
engine = create_async_engine(
	DATABASE_URL,
	echo=False,  # Set to True to log SQL queries during development.
)

# Create a session factory for request-scoped async database sessions.
AsyncSessionLocal = sessionmaker(
	bind=engine,
	class_=AsyncSession,
	expire_on_commit=False,
	autoflush=False,
)

# Base class for SQLAlchemy models.
Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
	"""Yield a database session and ensure it is closed after the request."""
	db = AsyncSessionLocal()
	try:
		yield db
	finally:
		# Always close the session so connections return to the pool.
		await db.close()
