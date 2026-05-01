import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function extractOrderStatus(payload: unknown): string {
	if (!payload || typeof payload !== "object") {
		return "";
	}

	const raw = payload as { status?: unknown; order?: { status?: unknown } };
	const status = raw.status ?? raw.order?.status;
	return typeof status === "string" ? status.trim().toLowerCase() : "";
}

async function parseBackendError(response: Response): Promise<string> {
	const contentType = response.headers.get("content-type") || "";

	if (contentType.includes("application/json")) {
		const payload = await response.json().catch(() => null);
		const message = payload?.detail || payload?.message || payload?.error;
		if (typeof message === "string" && message.trim()) {
			return message;
		}
	}

	const text = await response.text().catch(() => "");
	return text || "Failed to cancel order.";
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
	const authorization = request.headers.get("authorization");
	const { orderId } = await context.params;

	const headers = new Headers();
	if (authorization) {
		headers.set("Authorization", authorization);
	}

	try {
		const existingOrderResponse = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
			method: "GET",
			headers,
			cache: "no-store",
		});

		if (!existingOrderResponse.ok) {
			const message = await parseBackendError(existingOrderResponse);
			return NextResponse.json({ message }, { status: existingOrderResponse.status });
		}

		const existingOrderPayload = await existingOrderResponse.json().catch(() => null);
		if (extractOrderStatus(existingOrderPayload) !== "pending") {
			return NextResponse.json(
				{ message: "Only pending orders can be cancelled." },
				{ status: 409 },
			);
		}

		const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
			method: "PATCH",
			headers,
			cache: "no-store",
		});

		if (!response.ok) {
			const message = await parseBackendError(response);
			return NextResponse.json({ message }, { status: response.status });
		}

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			return NextResponse.json({ id: orderId, status: "cancelled" }, { status: 200 });
		}

		const payload = await response.json();
		return NextResponse.json(payload, { status: 200 });
	} catch {
		return NextResponse.json(
			{ message: "Unable to reach the orders service right now." },
			{ status: 502 },
		);
	}
}