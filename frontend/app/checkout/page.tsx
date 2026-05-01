"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { createCheckoutOrder, getMe } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";

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
		| {
			id?: string;
			name?: string | null;
			email?: string | null;
		}
		| undefined;

	useEffect(() => {
		let active = true;

		const hydrateCart = async () => {
			await useCartStore.persist.rehydrate();

			if (active) {
				setIsHydrated(true);
			}
		};

		void hydrateCart();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		let active = true;

		const loadUser = async () => {
			if (status === "loading") {
				return;
			}

			try {
				const currentUser = await getMe();
				if (!active) {
					return;
				}

				setUserId(currentUser.id);
				setFormData((previous) => ({
					...previous,
					full_name: previous.full_name.trim() ? previous.full_name : currentUser.full_name,
					email: previous.email.trim() ? previous.email : currentUser.email,
					phone: previous.phone.trim() ? previous.phone : currentUser.phone_number || "",
				}));
				return;
			} catch {
				// Fall back to the NextAuth session if the JWT-backed profile request fails.
			}

			if (!sessionUser || !active) {
				return;
			}

			const sessionUserId = getUserId(sessionUser.id);
			setUserId(sessionUserId);
			setFormData((previous) => ({
				...previous,
				full_name: previous.full_name.trim() ? previous.full_name : sessionUser.name || "",
				email: previous.email.trim() ? previous.email : sessionUser.email || "",
			}));
		};

		void loadUser();

		return () => {
			active = false;
		};
	}, [sessionUser?.email, sessionUser?.id, sessionUser?.name, status]);

	useEffect(() => {
		if (!orderId) {
			return;
		}

		const timer = window.setTimeout(() => {
			router.push("/orders");
		}, 2000);

		return () => {
			window.clearTimeout(timer);
		};
	}, [orderId, router]);

	const handleChange = (field: keyof CheckoutFormState, value: string) => {
		setFormData((previous) => ({
			...previous,
			[field]: value,
		}));

		if (formErrors[field]) {
			setFormErrors((previous) => ({
				...previous,
				[field]: undefined,
			}));
		}
	};

	const validateForm = () => {
		const nextErrors: CheckoutFormErrors = {};

		if (!formData.full_name.trim()) {
			nextErrors.full_name = "Full name is required.";
		}

		if (!emailPattern.test(formData.email.trim())) {
			nextErrors.email = "Enter a valid email address.";
		}

		const digitsOnlyPhone = formData.phone.replace(/\D/g, "");
		if (!formData.phone.trim() || digitsOnlyPhone.length < 7) {
			nextErrors.phone = "Enter a valid phone number.";
		}

		if (!formData.delivery_address.trim()) {
			nextErrors.delivery_address = "Delivery address is required.";
		}

		return nextErrors;
	};

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
			const order = await createCheckoutOrder({
				user_id: resolvedUserId,
				items: items.map((item) => ({
					product_id: String(item.id),
					quantity: item.quantity,
					price: item.price,
				})),
				total_price: totalPrice,
				user_name: formData.full_name.trim(),
				user_email: formData.email.trim(),
				user_phone: formData.phone.trim(),
				delivery_address: formData.delivery_address.trim(),
			});

			clearCart();
			setOrderId(order.id);
		} catch (error) {
			setSubmitError(error instanceof Error ? error.message : "Unable to place your order.");
		} finally {
			setIsSubmitting(false);
		}
	};

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
							Review your order, confirm delivery details, and place your Tethered crochet order.
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
					<div className="mb-6 rounded-2xl border border-rose-soft/40 bg-rose-soft/15 px-4 py-3 text-sm text-charcoal" role="alert" aria-live="polite">
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
										onChange={(event) => handleChange("full_name", event.target.value)}
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
										onChange={(event) => handleChange("email", event.target.value)}
										className={`w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)] ${formErrors.email ? "border-rose-soft focus:border-rose-soft" : "border-transparent focus:border-sage"}`}
										placeholder="you@example.com"
									/>
									{formErrors.email ? <p className="mt-2 text-xs text-rose-soft">{formErrors.email}</p> : null}
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
										onChange={(event) => handleChange("phone", event.target.value)}
										className={`w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)] ${formErrors.phone ? "border-rose-soft focus:border-rose-soft" : "border-transparent focus:border-sage"}`}
										placeholder="+91 98765 43210"
									/>
									{formErrors.phone ? <p className="mt-2 text-xs text-rose-soft">{formErrors.phone}</p> : null}
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
										onChange={(event) => handleChange("delivery_address", event.target.value)}
										className={`w-full rounded-2xl border bg-cream px-4 py-3 text-sm text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/35 focus:shadow-[0_0_0_4px_rgba(178,201,173,0.22)] ${formErrors.delivery_address ? "border-rose-soft focus:border-rose-soft" : "border-transparent focus:border-sage"}`}
										placeholder="House number, street, city, state, and postal code"
									/>
									{formErrors.delivery_address ? (
										<p className="mt-2 text-xs text-rose-soft">{formErrors.delivery_address}</p>
									) : null}
								</div>
							</div>

							<div className="rounded-2xl border border-sage/25 bg-sage/10 px-4 py-3 text-sm text-charcoal/80">
								The order will be tied to your account and sent to your delivery address after payment confirmation.
							</div>

							<button
								type="submit"
								disabled={isSubmitting}
								className="inline-flex h-12 w-full items-center justify-center rounded-full bg-sage text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{isSubmitting ? (
									<span className="inline-flex items-center gap-2">
										<span className="h-4 w-4 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
										Placing Order...
									</span>
								) : (
									"Place Order"
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
												<p className="mt-1 text-xs text-warm-white/65">
													Qty: {item.quantity}
												</p>
											</div>
											<div className="text-right text-sm font-semibold text-warm-white">
												{subtotal === 0 ? formatPrice(0) : formatPrice(subtotal)}
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
						</div>
					</aside>
				</section>
			</main>

			<Footer />
		</div>
	);
}
