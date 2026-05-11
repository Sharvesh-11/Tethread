"""Order-related ORM models for the Tethread store."""

from datetime import datetime
import uuid

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


ORDER_STATUSES = (
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
    "refund_initiated",
    "refunded",
    "refund_failed",
)

class Order(Base):
	"""Represents a customer order in the Tethread store."""

	__tablename__ = "orders"

	# Unique identifier for the order, auto-generated with uuid4.
	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

	# Reference to the user who placed the order; deletes with parent user.
	user_id = Column(
		UUID(as_uuid=True),
		ForeignKey("users.id", ondelete="CASCADE"),
		nullable=False,
	)

	# Current order lifecycle status.
	status = Column(
		Enum(*ORDER_STATUSES, name="order_status"),
		nullable=False,
		default="pending",
	)

	# Final order amount at checkout time.
	total_amount = Column(Numeric(10, 2), nullable=False)

	# Structured shipping address details for delivery.
	shipping_address = Column(JSON, nullable=False)

	# Razorpay order identifier for payment flow integration.
	razorpay_order_id = Column(String(255), nullable=True)

	# Razorpay payment identifier after successful payment.
	razorpay_payment_id = Column(String(255), nullable=True)

	razorpay_refund_id = Column(String(255), nullable=True)

	# Timestamp when the order was created (UTC).
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

	# Timestamp for last order update; auto-updates on each save (UTC).
	updated_at = Column(
		DateTime,
		default=datetime.utcnow,
		onupdate=datetime.utcnow,
		nullable=False,
	)

	# User relationship: one user can have many orders.
	user = relationship("User", back_populates="orders")

	# Order item relationship: one order can contain many items.
	items = relationship(
		"OrderItem",
		back_populates="order",
		cascade="all, delete-orphan",
		passive_deletes=True,
	)

	def __repr__(self) -> str:
		"""Return a concise debug representation of the order."""
		return f"<Order(id={self.id}, status={self.status})>"


class OrderItem(Base):
	"""Represents an individual purchased product in an order."""

	__tablename__ = "order_items"

	# Unique identifier for the order item, auto-generated with uuid4.
	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

	# Reference to the parent order; deletes with parent order.
	order_id = Column(
		UUID(as_uuid=True),
		ForeignKey("orders.id", ondelete="CASCADE"),
		nullable=False,
	)

	# Reference to the product that was purchased.
	product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)

	# Quantity purchased for this product line.
	quantity = Column(Integer, nullable=False)

	# Snapshot of product unit price at purchase time.
	unit_price = Column(Numeric(10, 2), nullable=False)

	# Snapshot of product name at purchase time.
	product_name = Column(String(255), nullable=False)

	# Parent order relationship for ORM navigation.
	order = relationship("Order", back_populates="items")

	# Product relationship for referencing current product details.
	product = relationship("Product", back_populates="order_items")

	def __repr__(self) -> str:
		"""Return a concise debug representation of the order item."""
		return f"<OrderItem(id={self.id}, order_id={self.order_id}, product_id={self.product_id})>"
