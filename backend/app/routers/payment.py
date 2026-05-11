"""Payment processing router using Razorpay for the Tethread store."""

import hashlib
import hmac
import json
from typing import Annotated
from uuid import UUID

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import get_db
from app.models.order import Order
from app.models.user import User
from app.routers.auth import get_current_user


router = APIRouter(prefix="/payment", tags=["Payment"])

razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


class CreatePaymentOrderRequest(BaseModel):
    """Request payload for creating a Razorpay payment order."""
    order_id: UUID


class VerifyPaymentRequest(BaseModel):
    """Request payload for verifying a completed Razorpay payment."""
    order_id: UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class RefundRequest(BaseModel):
    """Request payload for initiating a refund."""
    order_id: UUID
    amount: float | None = None  # None means full refund
    reason: str | None = "requested_by_customer"


@router.post("/create-order")
async def create_payment_order(
    payload: CreatePaymentOrderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Razorpay order for the given order_id.
    Fetches the Order from database, creates a Razorpay order with amount in paise,
    and saves the razorpay_order_id back to the Order record.
    """
    result = await db.execute(select(Order).where(Order.id == payload.order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this order")

    amount_in_paise = int(float(order.total_amount) * 100)

    razorpay_order = razorpay_client.order.create({
        "amount": amount_in_paise,
        "currency": "INR",
        "receipt": str(order.id),
        "notes": {
            "order_id": str(order.id),
            "user_id": str(order.user_id),
        },
    })

    order.razorpay_order_id = razorpay_order["id"]
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return {
        "razorpay_order_id": razorpay_order["id"],
        "amount": razorpay_order["amount"],
        "currency": razorpay_order["currency"],
        "key_id": settings.RAZORPAY_KEY_ID,
    }


@router.post("/verify")
async def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a Razorpay payment using HMAC SHA256 signature.
    If the signature is valid, update the order status to 'confirmed'
    and save the razorpay_payment_id.
    """
    result = await db.execute(select(Order).where(Order.id == payload.order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this order")

    signature_payload = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected_signature = hmac.new(
        key=settings.RAZORPAY_KEY_SECRET.encode(),
        msg=signature_payload.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Invalid signature",
        )

    order.status = "confirmed"
    order.razorpay_payment_id = payload.razorpay_payment_id
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return {
        "status": "success",
        "message": "Payment verified and order confirmed",
        "order_id": str(order.id),
        "order_status": order.status,
    }


@router.post("/refund")
async def refund_payment(
    payload: RefundRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Order).where(Order.id == payload.order_id))
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this order")

    if order.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be refunded. Current status: {order.status}",
        )

    if not order.razorpay_payment_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No payment found for this order.",
        )

    refund_amount = (
        int(float(payload.amount) * 100)
        if payload.amount
        else int(float(order.total_amount) * 100)
    )

    # ── Test mode simulation ──────────────────────────────────────────
    if settings.RAZORPAY_KEY_ID.startswith("rzp_test_"):
        order.status = "refund_initiated"
        order.razorpay_refund_id = f"rfnd_test_{str(order.id)[:8]}"
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return {
            "status": "success",
            "message": "Refund initiated successfully (test mode)",
            "refund_id": order.razorpay_refund_id,
            "refund_amount": float(order.total_amount),
            "order_id": str(order.id),
            "order_status": order.status,
        }

    # ── Live mode — real Razorpay refund ─────────────────────────────
    try:
        refund = razorpay_client.payment.refund(
            order.razorpay_payment_id,
            {
                "amount": refund_amount,
                "speed": "normal",
                "notes": {
                    "order_id": str(order.id),
                    "reason": payload.reason or "requested_by_customer",
                },
                "receipt": str(order.id),
            },
        )
    except Exception as e:
        print(f"Razorpay error: {str(e)}")
        print(f"Payment ID: {order.razorpay_payment_id}")
        print(f"Amount: {refund_amount}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Razorpay refund failed: {str(e)}",
        )

    order.status = "refund_initiated"
    order.razorpay_refund_id = refund["id"]
    db.add(order)
    await db.commit()
    await db.refresh(order)

    return {
        "status": "success",
        "message": "Refund initiated successfully",
        "refund_id": refund["id"],
        "refund_amount": refund["amount"] / 100,
        "order_id": str(order.id),
        "order_status": order.status,
    }


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Handle incoming Razorpay webhook events.
    Verifies the webhook signature from X-Razorpay-Signature header,
    and processes the following events:
      - payment.captured  -> confirms the order
      - refund.processed  -> marks order as refunded
      - refund.failed     -> marks order as refund_failed
    """
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")

    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Razorpay-Signature header",
        )

    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook verification failed: Invalid signature",
        )

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    event = payload.get("event")

    # Handle payment.captured event.
    if event == "payment.captured":
        data = payload.get("payload", {}).get("payment", {}).get("entity", {})
        razorpay_order_id = data.get("order_id")
        razorpay_payment_id = data.get("id")

        if razorpay_order_id and razorpay_payment_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_order_id == razorpay_order_id)
            )
            order = result.scalar_one_or_none()

            if order:
                order.status = "confirmed"
                order.razorpay_payment_id = razorpay_payment_id
                db.add(order)
                await db.commit()

    # Handle refund.processed event.
    elif event == "refund.processed":
        refund_data = payload.get("payload", {}).get("refund", {}).get("entity", {})
        razorpay_refund_id = refund_data.get("id")

        if razorpay_refund_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_refund_id == razorpay_refund_id)
            )
            order = result.scalar_one_or_none()

            if order:
                order.status = "refunded"
                db.add(order)
                await db.commit()

    # Handle refund.failed event.
    elif event == "refund.failed":
        refund_data = payload.get("payload", {}).get("refund", {}).get("entity", {})
        razorpay_refund_id = refund_data.get("id")

        if razorpay_refund_id:
            result = await db.execute(
                select(Order).where(Order.razorpay_refund_id == razorpay_refund_id)
            )
            order = result.scalar_one_or_none()

            if order:
                order.status = "refund_failed"
                db.add(order)
                await db.commit()

    return {"status": "received"}