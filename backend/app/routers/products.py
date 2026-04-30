"""Products router for browsing and managing Tethread products."""

from decimal import Decimal
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import get_db
from app.models.product import Product
from app.models.user import User
from app.routers.auth import get_current_user


router = APIRouter(prefix="/products", tags=["Products"])

# Imported by request for consistency with app-wide configuration usage.
_settings = settings


class ProductCreateRequest(BaseModel):
	"""Request body for creating a new product."""

	name: str
	description: Optional[str] = None
	price: Decimal
	stock_quantity: int
	category: str
	image_url: Optional[str] = None
	is_featured: bool = False


class ProductUpdateRequest(BaseModel):
	"""Request body for partially updating an existing product."""

	name: Optional[str] = None
	description: Optional[str] = None
	price: Optional[Decimal] = None
	stock_quantity: Optional[int] = None
	category: Optional[str] = None
	image_url: Optional[str] = None
	is_featured: Optional[bool] = None


def serialize_product(product: Product) -> dict:
	"""Convert a Product ORM object into an API response dictionary."""
	return {
		"id": product.id,
		"name": product.name,
		"description": product.description,
		"price": product.price,
		"stock_quantity": product.stock_quantity,
		"category": product.category,
		"image_url": product.image_url,
		"is_active": product.is_active,
		"is_featured": product.is_featured,
		"created_at": product.created_at,
		"updated_at": product.updated_at,
	}


@router.get("")
async def list_products(
	category: Optional[str] = Query(default=None),
	featured: Optional[bool] = Query(default=None),
	skip: int = Query(default=0, ge=0),
	limit: int = Query(default=20, ge=1, le=100),
	db: AsyncSession = Depends(get_db),
):
	"""List active products with optional category/featured filters and pagination."""
	# Start from active products only and apply optional filters.
	query = select(Product).where(Product.is_active.is_(True))
	if category is not None:
		query = query.where(Product.category == category)
	if featured is not None:
		query = query.where(Product.is_featured.is_(featured))

	# Return newest products first.
	query = query.order_by(desc(Product.created_at)).offset(skip).limit(limit)

	result = await db.execute(query)
	products = result.scalars().all()
	return [serialize_product(product) for product in products]


@router.get("/{product_id}")
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
	"""Fetch one active product by ID and return 404 when missing or inactive."""
	product = await db.scalar(
		select(Product).where(Product.id == product_id, Product.is_active.is_(True))
	)
	if not product:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

	return serialize_product(product)


@router.post("")
async def create_product(
	payload: ProductCreateRequest,
	db: AsyncSession = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	"""Create a new product; accessible only to admin users."""
	# Only admins can create product records.
	if not current_user.is_admin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

	product = Product(
		name=payload.name,
		description=payload.description,
		price=payload.price,
		stock_quantity=payload.stock_quantity,
		category=payload.category,
		image_url=payload.image_url,
		is_featured=payload.is_featured,
	)
	db.add(product)
	await db.commit()
	await db.refresh(product)
	return serialize_product(product)


@router.patch("/{product_id}")
async def update_product(
	product_id: uuid.UUID,
	payload: ProductUpdateRequest,
	db: AsyncSession = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	"""Partially update a product; accessible only to admin users."""
	# Only admins can update product records.
	if not current_user.is_admin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

	product = await db.scalar(select(Product).where(Product.id == product_id))
	if not product:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

	# Apply only fields explicitly sent in the request.
	updates = payload.model_dump(exclude_unset=True)
	for field, value in updates.items():
		setattr(product, field, value)

	await db.commit()
	await db.refresh(product)
	return serialize_product(product)


@router.delete("/{product_id}")
async def soft_delete_product(
	product_id: uuid.UUID,
	db: AsyncSession = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	"""Soft delete a product by marking it inactive; accessible only to admin users."""
	if not current_user.is_admin:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

	product = await db.scalar(select(Product).where(Product.id == product_id))
	if not product:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

	await db.delete(product)
	await db.commit()
	return {"message": "Product deleted successfully"}