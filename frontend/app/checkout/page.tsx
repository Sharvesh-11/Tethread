"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { createCheckoutOrder, getMe, getAuthHeadersAsync } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";

// ---------------------------------------------------------------------------
// Razorpay type shim – avoids importing a separate @types package
// ---------------------------------------------------------------------------
declare global {
	interface Window {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		Razorpay: new (options: Record<string, any>) => { open(): void };
	}
}

type CheckoutFormState = {
	full_name: string;
	email: string;
	phone: string;
	delivery_address: string;
};

type CheckoutFormErrors = Partial<Record<keyof CheckoutFormState, string>>;

const emptyFormState: CheckoutFormState = {
	full_name: "",
	email: "",
	phone: "",
	delivery_address: "",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatPrice = (value: number) =>
	new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(value);

const getUserId = (candidate: unknown): number | null => {
	if (typeof candidate === "number" && Number.isFinite(candidate)) {
		return candidate;
	}
	if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
		return Number(candidate);
	}
	return null;
};

/** Dynamically loads the Razorpay checkout script exactly once. */
function loadRazorpayScript(): Promise<boolean> {
	return new Promise((resolve) => {
		if (typeof window.Razorpay !== "undefined") {
			resolve(true);
			return;
		}
		const script = document.createElement("script");
		script.src = "https://checkout.razorpay.com/v1/checkout.js";
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});
}

const N8N_WEBHOOK_URL = "https://n8n.zenith-labs.app/webhook/checkout";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function CheckoutPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const items = useCartStore((state) => state.items);
	const clearCart = useCartStore((state) => state.clearCart);
	const totalItems = useCartStore((state) => state.totalItems());
	const totalPrice = useCartStore((state) => state.totalPrice());

	const [isHydrated, setIsHydrated] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState("");
	const [formErrors, setFormErrors] = useState<CheckoutFormErrors>({});
	const [formData, setFormData] = useState<CheckoutFormState>(emptyFormState);
	const [userId, setUserId] = useState<number | null>(null);
	const [orderId, setOrderId] = useState<number | string | null>(null);

	const sessionUser = session?.user as
		| { id?: string; name?: string | null; email?: string | null }
		| undefined;

	// Hydrate Zustand cart from persisted storage
	useEffect(() => {
		let active = true;
		const rehydratePromise = useCartStore.persist.rehydrate();
		Promise.resolve(rehydratePromise).then(() => {
			if (active) setIsHydrated(true);
		});
		return () => { active = false; };
	}, []);

	// Pre-fill form from authenticated user profile
	useEffect(() => {
		let active = true;

		const loadUser = async () => {
			if (status === "loading") return;

			try {
				const currentUser = await getMe();
				if (!active) return;
				setUserId(currentUser.id);
				setFormData((prev) => ({
					...prev,
					full_name: prev.full_name.trim() ? prev.full_name : currentUser.full_name,
					email: prev.email.trim() ? prev.email : currentUser.email,
					phone: prev.phone.trim() ? prev.phone : currentUser.phone_number ?? "",
				}));
				return;
			} catch {
				// Fall through to NextAuth session fallback
			}

			if (!sessionUser || !active) return;
			const sessionUserId = getUserId(sessionUser.id);
			setUserId(sessionUserId);
			setFormData((prev) => ({
				...prev,
				full_name: prev.full_name.trim() ? prev.full_name : sessionUser.name ?? "",
				email: prev.email.trim() ? prev.email : sessionUser.email ?? "",
			}));
		};

		void loadUser();
		return () => { active = false; };
	}, [sessionUser?.email, sessionUser?.id, sessionUser?.name, status]);

	// Redirect to orders after successful payment
	useEffect(() => {
		if (!orderId) return;
		const timer = window.setTimeout(() => router.push("/orders"), 2000);
		return () => window.clearTimeout(timer);
	}, [orderId, router]);

	const handleChange = (field: keyof CheckoutFormState, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (formErrors[field]) {
			setFormErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const validateForm = (): CheckoutFormErrors => {
		const errors: CheckoutFormErrors = {};
		if (!formData.full_name.trim()) errors.full_name = "Full name is required.";
		if (!emailPattern.test(formData.email.trim())) errors.email = "Enter a valid email address.";
		const digitsOnly = formData.phone.replace(/\D/g, "");
		if (!formData.phone.trim() || digitsOnly.length < 7) errors.phone = "Enter a valid phone number.";
		if (!formData.delivery_address.trim()) errors.delivery_address = "Delivery address is required.";
		return errors;
	};

	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	// UPDATED FLOW:
	// Step 1 – create our own order record (do NOT fire webhook yet)
	// Step 2 – create a Razorpay order (amount in paise)
	// Step 3 – open Razorpay modal & wait for payment
	// Step 4 – verify signature with backend
	// Step 5 – 🎉 ONLY HERE: Fire n8n webhook with confirmation
	// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitError("");
		setFormErrors({});

		if (!isHydrated) {
			setSubmitError("Preparing your cart. Please try again in a moment.");
			return;
		}
		if (items.length === 0) {
			setSubmitError("Your cart is empty.");
			return;
		}

		const nextErrors = validateForm();
		if (Object.keys(nextErrors).length > 0) {
			setFormErrors(nextErrors);
			return;
		}

		const resolvedUserId = userId ?? getUserId(sessionUser?.id);
		if (!resolvedUserId) {
			setSubmitError("We could not verify your account. Please sign in again.");
			return;
		}

		setIsSubmitting(true);

		try {
			// ── Step 1: create the order in our database ──────────────────────────
			const orderPayload = {
				user_id: resolvedUserId,
				items: items.map((item) => ({
					product_id: String(item.id),
					name: item.name,
					quantity: item.quantity,
					price: item.price,
				})),
				total_price: totalPrice,
				user_name: formData.full_name.trim(),
				user_email: formData.email.trim(),
				user_phone: formData.phone.trim(),
				delivery_address: formData.delivery_address.trim(),
			};

			const order = await createCheckoutOrder(orderPayload);

			// ── Step 2: create a Razorpay order ──────────────────────────────────
			const authHeaders = await getAuthHeadersAsync();
			const rzpOrderRes = await fetch(`${API_BASE}/payment/create-order`, {
				method: "POST",
				headers: { "Content-Type": "application/json", ...authHeaders },
				body: JSON.stringify({ order_id: order.id }),
			});

			if (!rzpOrderRes.ok) {
				const err = await rzpOrderRes.json().catch(() => ({}));
				throw new Error((err as { detail?: string }).detail ?? "Failed to initiate payment.");
			}

			const rzpOrder = await rzpOrderRes.json() as {
				razorpay_order_id: string;
				amount: number;
				currency: string;
				key_id: string;
			};

			// ── Step 3: load Razorpay script and open modal ───────────────────────
			const scriptLoaded = await loadRazorpayScript();
			if (!scriptLoaded) {
				throw new Error("Could not load the payment library. Please refresh and try again.");
			}

			await new Promise<void>((resolve, reject) => {
				const rzp = new window.Razorpay({
					key: rzpOrder.key_id,
					amount: rzpOrder.amount,
					currency: rzpOrder.currency,
					order_id: rzpOrder.razorpay_order_id,
					name: "Tethered",
					description: `Order #${String(order.id).slice(0, 8)}`,
					prefill: {
						name: formData.full_name.trim(),
						email: formData.email.trim(),
						contact: formData.phone.trim(),
					},
					theme: { color: "#B2C9AD" }, // sage
					modal: {
						ondismiss: () => reject(new Error("Payment cancelled.")),
					},
					// ── Step 4: verify payment on success ────────────────────────
					handler: async (response: {
						razorpay_payment_id: string;
						razorpay_order_id: string;
						razorpay_signature: string;
					}) => {
						try {
							const verifyRes = await fetch(`${API_BASE}/payment/verify`, {
								method: "POST",
								headers: { "Content-Type": "application/json", ...authHeaders },
								body: JSON.stringify({
									order_id: order.id,
									razorpay_order_id: response.razorpay_order_id,
									razorpay_payment_id: response.razorpay_payment_id,
									razorpay_signature: response.razorpay_signature,
								}),
							});

							if (!verifyRes.ok) {
								const err = await verifyRes.json().catch(() => ({}));
								reject(new Error((err as { detail?: string }).detail ?? "Payment verification failed."));
								return;
							}

							// ── Step 5: ONLY NOW fire n8n webhook ──────────────────────
							// This runs AFTER payment is verified, so no duplicate emails!
							fetch(N8N_WEBHOOK_URL, {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ ...orderPayload, order_id: order.id }),
							}).catch((err) => console.error("n8n webhook error:", err));

							clearCart();
							setOrderId(order.id);
							resolve();
						} catch (err) {
							reject(err);
						}
					},
				});

				rzp.open();
			});
		} catch (error) {
			// "Payment cancelled." is a soft user action, not a hard error
			const message = error instanceof Error ? error.message : "Unable to place your order.";
			if (message !== "Payment cancelled.") {
				setSubmitError(message);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	// ── Loading state ──────────────────────────────────────────────────────────
	if (!isHydrated) {
		return (
			<div className="flex min-h-screen flex-col bg-cream text-charcoal">
				<Navbar />
				<main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
					<div className="rounded-3xl bg-warm-white px-8 py-10 text-center shadow-[0_18px_40px_-28px_rgba(61,61,61,0.45)]">
						<div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-sage/25 border-t-sage" />
						<p className="mt-4 text-sm font-medium text-charcoal/70">Loading checkout...</p>
					</div>
				</main>
				<Footer />
			</div>
		);
	}

	// ── Order success ──────────────────────────────────────────────────────────
	if (orderId) {
		return (
			<div className="flex min-h-screen flex-col bg-cream text-charcoal">
				<Navbar />
				<main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
					<section className="w-full max-w-2xl rounded-[2rem] bg-warm-white p-8 shadow-[0_18px_40px_-28px_rgba(61,61,61,0.45)] sm:p-10">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sage/25 text-3xl">
							✓
						</div>
						<h1 className="mt-6 text-center font-display text-3xl font-semibold text-charcoal sm:text-4xl">
							Order placed successfully
						</h1>
						<p className="mt-3 text-center text-sm text-charcoal/70 sm:text-base">
							Your order ID is <span className="font-semibold text-charcoal">{orderId}</span>.
							You will be redirected to your orders shortly.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Link
								href="/orders"
								className="inline-flex h-11 items-center justify-center rounded-full bg-sage px-6 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
							>
								View Order
							</Link>
							<Link
								href="/shop"
								className="inline-flex h-11 items-center justify-center rounded-full border border-charcoal/20 px-6 text-sm font-semibold text-charcoal transition-all duration-200 hover:bg-cream"
							>
								Continue Shopping
							</Link>
						</div>
					</section>
				</main>
				<Footer />
			</div>
		);
	}

	// ── Empty cart ─────────────────────────────────────────────────────────────
	if (items.length === 0) {
		return (
			<div className="flex min-h-screen flex-col bg-cream text-charcoal">
				<Navbar />
				<main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
					<section className="w-full max-w-2xl rounded-[2rem] bg-warm-white px-6 py-12 text-center shadow-[0_18px_40px_-28px_rgba(61,61,61,0.45)] sm:px-10">
						<div className="text-7xl leading-none sm:text-8xl">🧶</div>
						<h1 className="mt-6 font-display text-3xl font-semibold text-charcoal sm:text-4xl">
							Your cart is empty
						</h1>
						<p className="mt-3 text-sm text-charcoal/70 sm:text-base">
							Add a few handmade pieces before heading to checkout.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
							<Link
								href="/shop"
								className="inline-flex h-11 items-center justify-center rounded-full bg-sage px-6 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
							>
								Continue Shopping
							</Link>
							<Link
								href="/cart"
								className="inline-flex h-11 items-center justify-center rounded-full border border-charcoal/20 px-6 text-sm font-semibold text-charcoal transition-all duration-200 hover:bg-cream"
							>
								Back to Cart
							</Link>
						</div>
					</section>
				</main>
				<Footer />
			</div>
		);
	}

	// ── Main checkout form ─────────────────────────────────────────────────────
	return (
		<div className="flex min-h-screen flex-col bg-cream text-charcoal">
			<Navbar />

			<main className="relative mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
				<div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(circle_at_top_left,_rgba(242,196,206,0.45),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(178,201,173,0.35),_transparent_36%)]" />

				<div className="mb-8 flex flex-wrap items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-charcoal/50">
							Secure Checkout
						</p>
						<h1 className="mt-2 font-display text-4xl font-semibold text-charcoal sm:text-5xl">
							Complete your order
						</h1>
						<p className="mt-3 max-w-2xl text-sm text-charcoal/70 sm:text-base">
							Review your order, confirm delivery details, and pay securely via Razorpay.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Link
							href="/cart"
							className="inline-flex h-11 items-center justify-center rounded-full border border-charcoal/20 bg-warm-white px-5 text-sm font-semibold text-charcoal transition-all duration-200 hover:border-sage hover:bg-cream"
						>
							Back to Cart
						</Link>
						<Link
							href="/shop"
							className="inline-flex h-11 items-center justify-center rounded-full bg-sage px-5 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
						>
							Continue Shopping
						</Link>
					</div>
				</div>

				{submitError ? (
					<div
						className="mb-6 rounded-2xl border border-rose-soft/40 bg-rose-soft/15 px-4 py-3 text-sm text-charcoal"
						role="alert"
						aria-live="polite"
					>
						{submitError}
					</div>
				) : null}

				<section className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] lg:gap-10">
					<form
						className="rounded-[2rem] bg-warm-white p-6 shadow-[0_18px_40px_-28px_rgba(61,61,61,0.45)] sm:p-8"
						onSubmit={handleSubmit}
					>
						<div className="space-y-6">
							<div>
								<h2 className="font-display text-2xl font-semibold text-charcoal sm:text-3xl">
									Delivery Info
								</h2>
								<p className="mt-2 text-sm text-charcoal/65">
									We will use these details for the shipping label and order confirmation.
								</p>
							</div>

							<div className="grid gap-5 sm:grid-cols-2">
								<div>
									<label htmlFor="full_name" className="mb-2 block text-sm font-medium text-charcoal">
										Full Name
									</label>
									<input
										id="full_name"
										name="full_name"
										autoComplete="name"
										required
										value={formData.full_name}
										onChange={(e) => handleChange("full_name", e.target.value)}
										className={`w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)] ${formErrors.full_name ? "border-rose-soft focus:border-rose-soft" : "border-transparent focus:border-sage"}`}
										placeholder="Your full name"
									/>
									{formErrors.full_name ? (
										<p className="mt-2 text-xs text-rose-soft">{formErrors.full_name}</p>
									) : null}
								</div>

								<div>
									<label htmlFor="email" className="mb-2 block text-sm font-medium text-charcoal">
										Email
									</label>
									<input
										id="email"
										name="email"
										type="email"
										autoComplete="email"
										required
										value={formData.email}
										onChange={(e) => handleChange("email", e.target.value)}
										className={`w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)] ${formErrors.email ? "border-rose-soft focus:border-rose-soft" : "border-transparent focus:border-sage"}`}
										placeholder="you@example.com"
									/>
									{formErrors.email ? (
										<p className="mt-2 text-xs text-rose-soft">{formErrors.email}</p>
									) : null}
								</div>
							</div>

							<div className="grid gap-5 sm:grid-cols-2">
								<div>
									<label htmlFor="phone" className="mb-2 block text-sm font-medium text-charcoal">
										Phone
									</label>
									<input
										id="phone"
										name="phone"
										type="tel"
										autoComplete="tel"
										required
										value={formData.phone}
										onChange={(e) => handleChange("phone", e.target.value)}
										className={`w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)] ${formErrors.phone ? "border-rose-soft focus:border-rose-soft" : "border-transparent focus:border-sage"}`}
										placeholder="+91 98765 43210"
									/>
									{formErrors.phone ? (
										<p className="mt-2 text-xs text-rose-soft">{formErrors.phone}</p>
									) : null}
								</div>

								<div>
									<label htmlFor="delivery_address" className="mb-2 block text-sm font-medium text-charcoal">
										Delivery Address
									</label>
									<textarea
										id="delivery_address"
										name="delivery_address"
										autoComplete="street-address"
										required
										rows={4}
										value={formData.delivery_address}
										onChange={(e) => handleChange("delivery_address", e.target.value)}
										className={`w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)] ${formErrors.delivery_address ? "border-rose-soft focus:border-rose-soft" : "border-transparent focus:border-sage"}`}
										placeholder="House number, street, city, state, and postal code"
									/>
									{formErrors.delivery_address ? (
										<p className="mt-2 text-xs text-rose-soft">{formErrors.delivery_address}</p>
									) : null}
								</div>
							</div>

							<div className="rounded-2xl border border-sage/25 bg-sage/10 px-4 py-3 text-sm text-charcoal/80">
								Your payment is processed securely via Razorpay. We never store card details.
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sage text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{isSubmitting ? (
									<>
										<span className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
										Processing...
									</>
								) : (
									<>
										{/* Razorpay lock icon */}
										<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
											<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
											<path d="M7 11V7a5 5 0 0 1 10 0v4" />
										</svg>
										Pay {formatPrice(totalPrice)}
									</>
								)}
							</button>
						</div>
					</form>

					<aside>
						<div className="rounded-[2rem] bg-charcoal p-6 text-warm-white shadow-[0_18px_40px_-28px_rgba(61,61,61,0.45)] lg:sticky lg:top-24">
							<div className="flex items-start justify-between gap-4">
								<div>
									<h2 className="font-display text-2xl font-semibold text-warm-white">
										Order Summary
									</h2>
									<p className="mt-2 text-sm text-warm-white/70">
										{totalItems} {totalItems === 1 ? "item" : "items"} in your cart
									</p>
								</div>
								<div className="rounded-full bg-warm-white/10 px-3 py-1 text-xs font-semibold text-warm-white">
									{formatPrice(totalPrice)}
								</div>
							</div>

							<div className="mt-6 space-y-4">
								{items.map((item) => {
									const subtotal = item.price * item.quantity;
									return (
										<div
											key={item.id}
											className="flex items-start gap-4 rounded-2xl bg-warm-white/8 p-4"
										>
											<img
												src={item.image_url}
												alt={item.name}
												className="h-16 w-16 rounded-2xl object-cover"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold text-warm-white sm:text-base">
													{item.name}
												</p>
												<p className="mt-1 text-xs text-warm-white/65">
													{formatPrice(item.price)} each
												</p>
												<p className="mt-1 text-xs text-warm-white/65">Qty: {item.quantity}</p>
											</div>
											<div className="text-right text-sm font-semibold text-warm-white">
												{formatPrice(subtotal)}
											</div>
										</div>
									);
								})}
							</div>

							<div className="mt-6 space-y-4 rounded-2xl bg-warm-white/8 p-4">
								<div className="flex items-center justify-between text-sm text-warm-white/75">
									<span>Subtotal</span>
									<span>{formatPrice(totalPrice)}</span>
								</div>
								<div className="flex items-center justify-between text-sm text-warm-white/75">
									<span>Shipping</span>
									<span>Calculated after confirmation</span>
								</div>
								<div className="h-px bg-warm-white/10" />
								<div className="flex items-center justify-between text-base font-semibold text-warm-white">
									<span>Total</span>
									<span>{formatPrice(totalPrice)}</span>
								</div>
							</div>

							{/* Razorpay trust badge */}
							<div className="mt-4 flex items-center justify-center gap-2 text-xs text-warm-white/40">
								<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
								</svg>
								Secured by Razorpay
							</div>
						</div>
					</aside>
				</section>
			</main>

			<Footer />
		</div>
	);
}