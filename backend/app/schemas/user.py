from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRegisterRequest(BaseModel):
	full_name: str
	email: EmailStr
	password: str
	phone_number: Optional[str] = None


class UserLoginRequest(BaseModel):
	email: EmailStr
	password: str


class UserResponse(BaseModel):
	id: UUID
	email: str
	full_name: str
	phone_number: Optional[str] = None
	is_admin: bool
	created_at: datetime

	model_config = ConfigDict(from_attributes=True)
