from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProductCreateRequest(BaseModel):
	name: str
	description: Optional[str] = None
	price: Decimal
	stock_quantity: int
	category: str
	image_url: Optional[str] = None
	is_featured: bool = False


class ProductUpdateRequest(BaseModel):
	name: Optional[str] = None
	description: Optional[str] = None
	price: Optional[Decimal] = None
	stock_quantity: Optional[int] = None
	category: Optional[str] = None
	image_url: Optional[str] = None
	is_featured: Optional[bool] = None


class ProductResponse(BaseModel):
	id: UUID
	name: str
	description: Optional[str] = None
	price: Decimal
	stock_quantity: int
	category: str
	image_url: Optional[str] = None
	is_active: bool
	is_featured: bool
	created_at: datetime
	updated_at: datetime

	model_config = ConfigDict(from_attributes=True)
