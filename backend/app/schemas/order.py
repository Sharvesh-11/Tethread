from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ShippingAddress(BaseModel):
	full_name: str
	phone: str
	address: str
	city: str
	state: str
	pincode: str


class OrderItemRequest(BaseModel):
	product_id: UUID
	quantity: int


class CreateOrderRequest(BaseModel):
	items: List[OrderItemRequest]
	shipping_address: ShippingAddress


class OrderItemResponse(BaseModel):
	id: UUID
	product_id: UUID
	product_name: str
	quantity: int
	unit_price: Decimal

	model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
	id: UUID
	user_id: UUID
	status: str
	total_amount: Decimal
	shipping_address: dict
	razorpay_order_id: Optional[str] = None
	razorpay_payment_id: Optional[str] = None
	created_at: datetime
	updated_at: datetime
	items: List[OrderItemResponse]

	model_config = ConfigDict(from_attributes=True)
