"""Product-related ORM models for the Tethread store."""

from datetime import datetime
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


PRODUCT_CATEGORIES = ("animals", "accessories", "spider-verse", "pokemon")


class Product(Base):
	"""Represents a sellable crochet keychain product."""

	__tablename__ = "products"

	# Unique identifier for the product, auto-generated with uuid4.
	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

	# Product display name shown in catalog listings.
	name = Column(String(255), nullable=False)

	# Optional detailed description of the product.
	description = Column(Text, nullable=True)

	# Product price with two decimal places (e.g., 199.99).
	price = Column(Numeric(10, 2), nullable=False)

	# Number of available items in inventory.
	stock_quantity = Column(Integer, default=0, nullable=False)

	# Product category limited to predefined Tethread categories.
	category = Column(
		Enum(*PRODUCT_CATEGORIES, name="product_category"),
		nullable=False,
	)

	# Optional primary image URL used for previews.
	image_url = Column(String(500), nullable=True)

	# Whether the product is currently active and purchasable.
	is_active = Column(Boolean, default=True, nullable=False)

	# Whether the product should be highlighted in featured sections.
	is_featured = Column(Boolean, default=False, nullable=False)

	# Timestamp when the product was created (UTC).
	created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

	# Timestamp for the most recent update; refreshed on each save (UTC).
	updated_at = Column(
		DateTime,
		default=datetime.utcnow,
		onupdate=datetime.utcnow,
		nullable=False,
	)

	# Ordered list of additional images associated with this product.
	images = relationship(
		"ProductImage",
		back_populates="product",
		cascade="all, delete-orphan",
		passive_deletes=True,
	)

	# Order items that reference this product.
	order_items = relationship("OrderItem", back_populates="product")

	def __repr__(self) -> str:
		"""Return a concise debug representation of the product."""
		return f"<Product(id={self.id}, name={self.name})>"


class ProductImage(Base):
	"""Represents an individual image for a product."""

	__tablename__ = "product_images"

	# Unique identifier for the product image, auto-generated with uuid4.
	id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

	# Reference to the product this image belongs to; deletes with parent product.
	product_id = Column(
		UUID(as_uuid=True),
		ForeignKey("products.id", ondelete="CASCADE"),
		nullable=False,
	)

	# URL for the image asset.
	image_url = Column(String(500), nullable=False)

	# Controls display order among multiple product images.
	sort_order = Column(Integer, default=0, nullable=False)

	# Parent product relationship for ORM navigation.
	product = relationship("Product", back_populates="images")

	def __repr__(self) -> str:
		"""Return a concise debug representation of the product image."""
		return f"<ProductImage(id={self.id}, product_id={self.product_id})>"
