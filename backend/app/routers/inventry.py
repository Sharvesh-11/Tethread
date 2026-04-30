"""Inventory router for Node-RED automation against Tethread products."""

from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import get_db
from app.models.product import Product


router = APIRouter(prefix="/inventory", tags=["Inventory"])


class StockUpdateRequest(BaseModel):
	"""Request body for updating product stock from Node-RED."""

	stock_quantity: int = Field(ge=0)


def check_api_key(x_api_key: Optional[str] = Header(default=None, alias="X-API-Key")) -> None:
	"""Verify the Node-RED API key before allowing access to inventory endpoints."""
	if not x_api_key or x_api_key != settings.API_KEY:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid or missing API key",
			headers={"WWW-Authenticate": "Bearer"},
		)


def serialize_inventory_product(product: Product) -> dict:
	"""Convert a Product ORM object into the compact inventory API response shape."""
	return {
		"id": product.id,
		"name": product.name,
		"category": product.category,
		"stock_quantity": product.stock_quantity,
		"price": product.price,
		"is_active": product.is_active,
		"is_featured": product.is_featured,
		"updated_at": product.updated_at,
	}


@router.get("")
async def list_inventory(
	db: AsyncSession = Depends(get_db),
	_: None = Depends(check_api_key),
):
	"""Return the full inventory for Node-RED sync jobs and dashboards."""
	# Node-RED can poll this endpoint to mirror the store's entire catalog state.
	result = await db.execute(select(Product).order_by(Product.category, Product.name))
	products = result.scalars().all()
	return {
		"total": len(products),
		"products": [serialize_inventory_product(product) for product in products],
	}


@router.patch("/{product_id}")
async def update_stock_quantity(
	product_id: uuid.UUID,
	payload: StockUpdateRequest,
	db: AsyncSession = Depends(get_db),
	_: None = Depends(check_api_key),
):
	"""Update a product's stock level from a Node-RED flow or manual automation."""
	product = await db.scalar(select(Product).where(Product.id == product_id))
	if not product:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

	product.stock_quantity = payload.stock_quantity
	await db.commit()
	await db.refresh(product)

	return serialize_inventory_product(product)


@router.get("/low-stock")
async def low_stock_inventory(
	db: AsyncSession = Depends(get_db),
	_: None = Depends(check_api_key),
):
	"""Return products that need restocking so Node-RED can trigger low-stock alerts."""
	# Node-RED can use this endpoint to generate alerts or send notifications automatically.
	result = await db.execute(
		select(Product)
		.where(Product.stock_quantity < 5)
		.order_by(Product.category, Product.name)
	)
	products = result.scalars().all()
	return [
		{
			"name": product.name,
			"category": product.category,
			"stock_quantity": product.stock_quantity,
		}
		for product in products
	]
