import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.BACKEND_URL || "http://localhost:8000/api/v1";

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
	return text || "Failed to fetch orders.";
}

export async function GET(request: NextRequest) {
	const authorization = request.headers.get("authorization");

	const headers = new Headers();
	if (authorization) {
		headers.set("Authorization", authorization);
	}

	try {
		const response = await fetch(`${API_BASE_URL}/orders`, {
			method: "GET",
			headers,
			cache: "no-store",
		});

		if (!response.ok) {
			const message = await parseBackendError(response);
			return NextResponse.json({ message }, { status: response.status });
		}

		const contentType = response.headers.get("content-type") || "";
		if (!contentType.includes("application/json")) {
			return NextResponse.json([], { status: 200 });
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
