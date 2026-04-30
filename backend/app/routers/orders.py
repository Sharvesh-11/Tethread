"""Orders router for Tethread purchases and order management."""
from decimal import Decimal
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.config import settings
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.routers.auth import get_current_user, get_current_user_optional
router = APIRouter(prefix="/orders", tags=["Orders"])
_settings = settings

class OrderItemRequest(BaseModel):
    product_id: str
    quantity: int

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    address: str
    city: str

class CreateOrderRequest(BaseModel):
    items: List[OrderItemRequest]
    shipping_address: ShippingAddress

class UpdateOrderStatusRequest(BaseModel):
    status: str

def serialize_order(order: Order) -> dict:
    return {
        "id": order.id,
        "user_id": order.user_id,
        "status": order.status,
        "total_amount": order.total_amount,
        "shipping_address": order.shipping_address,
        "razorpay_order_id": order.razorpay_order_id,
        "razorpay_payment_id": order.razorpay_payment_id,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": [
            {
                "id": item.id,
                "product_id": item.product_id,
                "product_name": item.product_name,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
            }
            for item in order.items
        ],
    }

@router.post("")
async def create_order(
    payload: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least one item is required")
    parsed_items: list[tuple[OrderItemRequest, uuid.UUID]] = []
    for item in payload.items:
        try:
            parsed_product_id = uuid.UUID(item.product_id)
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid product_id format: {item.product_id}",
            ) from None
        parsed_items.append((item, parsed_product_id))
    requested_quantities: dict[uuid.UUID, int] = {}
    for item, product_id in parsed_items:
        requested_quantities[product_id] = requested_quantities.get(product_id, 0) + item.quantity
    products_by_id: dict[uuid.UUID, Product] = {}
    for product_id in requested_quantities:
        product = await db.scalar(select(Product).where(Product.id == product_id, Product.is_active.is_(True)))
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product {product_id} not found")
        if product.stock_quantity < requested_quantities[product_id]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Sorry, '{product.name}' is out of stock",
            )
        products_by_id[product_id] = product
    total_amount = Decimal("0.00")
    order_items: list[OrderItem] = []
    for item, product_id in parsed_items:
        product = products_by_id[product_id]
        total_amount += Decimal(product.price) * item.quantity
        order_items.append(
            OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.price,
                product_name=product.name,
            )
        )
    order = Order(
        user_id=current_user.id,
        status="pending",
        total_amount=total_amount,
        shipping_address=payload.shipping_address.model_dump(),
    )
    order.items = order_items
    for product_id, requested_quantity in requested_quantities.items():
        products_by_id[product_id].stock_quantity -= requested_quantity
    db.add(order)
    await db.commit()
    await db.refresh(order)
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
    )
    created_order = result.scalar_one()
    return serialize_order(created_order)

@router.get("")
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    result = await db.execute(query)
    orders = result.scalars().all()
    return [serialize_order(order) for order in orders]

@router.get("/analytics/completed")
async def get_completed_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.status.in_(["delivered", "shipped"]))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    analytics = []
    for order in orders:
        for item in order.items:
            analytics.append({
                "user_name": order.user.full_name,
                "user_email": order.user.email,
                "product_name": item.product_name,
                "product_id": str(item.product_id),
                "order_date": order.created_at,
                "order_status": order.status,
            })
    return analytics

@router.get("/analytics/cancelled")
async def get_cancelled_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .where(Order.status == "cancelled")
        .order_by(Order.updated_at.desc())
    )
    orders = result.scalars().all()
    analytics = []
    for order in orders:
        for item in order.items:
            analytics.append({
                "user_name": order.user.full_name,
                "user_email": order.user.email,
                "product_name": item.product_name,
                "product_id": str(item.product_id),
                "cancellation_date": order.updated_at,
            })
    return analytics

@router.get("/admin/all")
async def list_all_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.user))
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return [
        {**serialize_order(order), "user_name": order.user.full_name, "user_email": order.user.email}
        for order in orders
    ]

@router.delete("/admin/{order_id}", status_code=204)
async def delete_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    order = await db.scalar(select(Order).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    await db.execute(delete(OrderItem).where(OrderItem.order_id == order_id))
    await db.delete(order)
    await db.commit()

@router.patch("/{order_id}/cancel")
async def cancel_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this order")
    if order.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending orders can be cancelled")
    for item in order.items:
        product = await db.scalar(select(Product).where(Product.id == item.product_id))
        if product:
            product.stock_quantity += item.quantity
    order.status = "cancelled"
    await db.commit()
    await db.refresh(order)
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order.id)
    )
    cancelled_order = result.scalar_one()
    return serialize_order(cancelled_order)

@router.get("/{order_id}")
async def get_order(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this order")
    return serialize_order(order)

@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    payload: UpdateOrderStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    order = await db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order_id))
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = payload.status
    await db.commit()
    await db.refresh(order)
    return serialize_order(order)
