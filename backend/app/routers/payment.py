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

# Initialize Razorpay client with API keys from environment settings.
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
	# Fetch the order from the database.
	result = await db.execute(
		select(Order).where(Order.id == payload.order_id)
	)
	order = result.scalar_one_or_none()

	if not order:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Order not found",
		)

	# Verify the order belongs to the current user.
	if order.user_id != current_user.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="You do not have access to this order",
		)

	# Convert total_amount to paise (multiply by 100).
	amount_in_paise = int(float(order.total_amount) * 100)

	# Create a Razorpay order.
	razorpay_order = razorpay_client.order.create(
		{
			"amount": amount_in_paise,
			"currency": "INR",
			"receipt": str(order.id),
			"notes": {
				"order_id": str(order.id),
				"user_id": str(order.user_id),
			},
		}
	)

	# Save the razorpay_order_id to the Order model.
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
	# Fetch the order from the database.
	result = await db.execute(
		select(Order).where(Order.id == payload.order_id)
	)
	order = result.scalar_one_or_none()

	if not order:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Order not found",
		)

	# Verify the order belongs to the current user.
	if order.user_id != current_user.id:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="You do not have access to this order",
		)

	# Verify the signature using HMAC SHA256.
	signature_payload = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
	expected_signature = hmac.new(
		settings.RAZORPAY_KEY_SECRET.encode(),
		signature_payload.encode(),
		hashlib.sha256,
	).hexdigest()

	if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Payment verification failed: Invalid signature",
		)

	# Signature is valid; update the order.
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


@router.post("/webhook")
async def razorpay_webhook(
	request: Request,
	db: AsyncSession = Depends(get_db),
):
	"""
	Handle incoming Razorpay webhook events.
	Verifies the webhook signature from X-Razorpay-Signature header,
	and processes payment.captured events to confirm orders.
	"""
	# Get the raw request body and signature from headers.
	body = await request.body()
	signature = request.headers.get("X-Razorpay-Signature")

	if not signature:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Missing X-Razorpay-Signature header",
		)

	# Verify the webhook signature.
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

	# Parse the webhook payload.
	try:
		payload = json.loads(body)
	except json.JSONDecodeError:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Invalid JSON payload",
		)

	event = payload.get("event")
	data = payload.get("payload", {}).get("payment", {}).get("entity", {})

	# Handle payment.captured event.
	if event == "payment.captured":
		razorpay_order_id = data.get("order_id")
		razorpay_payment_id = data.get("id")

		if razorpay_order_id and razorpay_payment_id:
			# Find the order by razorpay_order_id.
			result = await db.execute(
				select(Order).where(Order.razorpay_order_id == razorpay_order_id)
			)
			order = result.scalar_one_or_none()

			if order:
				order.status = "confirmed"
				order.razorpay_payment_id = razorpay_payment_id
				db.add(order)
				await db.commit()

	return {"status": "received"}
