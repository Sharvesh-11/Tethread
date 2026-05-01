"use client";

import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import { products } from "@/components/lib/mockdata";
import { useCartStore } from "@/store/cartStore";

const formatPrice = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const toCategoryLabel = (category?: string) => {
	if (!category) {
		return "Crochet";
	}

	return category
		.split("-")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
};

export default function CartPage() {
	const items = useCartStore((state) => state.items);
	const removeItem = useCartStore((state) => state.removeItem);
	const updateQuantity = useCartStore((state) => state.updateQuantity);
	const totalPrice = useCartStore((state) => state.totalPrice());

	return (
		<div className="flex min-h-screen flex-col bg-cream text-charcoal">
			<Navbar />

			<main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
				{items.length === 0 ? (
					<section className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl bg-warm-white/70 px-6 text-center shadow-sm">
						<div className="text-7xl leading-none sm:text-8xl">🛒</div>
						<h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">
							Your cart is empty
						</h1>
						<p className="mt-3 text-sm text-charcoal/70 sm:text-base">
							Looks like you haven&apos;t added anything yet
						</p>
						<Link
							href="/shop"
							className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-sage px-7 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
						>
							Browse Products
						</Link>
					</section>
				) : (
					<section className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10">
						<div>
							<h1 className="font-display text-3xl font-semibold sm:text-4xl">Your Cart 🛒</h1>

							<div className="mt-6 divide-y divide-charcoal/10 overflow-hidden rounded-2xl bg-warm-white shadow-sm">
								{items.map((item) => {
									const product = products.find((p) => p.id === item.id);
									const itemSubtotal = item.price * item.quantity;

									return (
										<article
											key={item.id}
											className="grid gap-4 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5 sm:p-5"
										>
											<img
												src={item.image_url}
												alt={item.name}
												className="h-20 w-20 rounded-xl object-cover"
											/>

											<div>
												<h2 className="font-semibold text-charcoal">{item.name}</h2>
												<p className="mt-1 text-sm text-charcoal/60">
													{toCategoryLabel(product?.category)}
												</p>
												<p className="mt-1 text-sm font-medium text-charcoal/80">
													{formatPrice(item.price)} each
												</p>

												<div className="mt-3 flex flex-wrap items-center gap-3">
													<div className="inline-flex items-center rounded-full border border-sage">
														<button
															type="button"
															onClick={() => updateQuantity(item.id, item.quantity - 1)}
															className="inline-flex h-8 w-8 items-center justify-center text-charcoal transition-colors hover:bg-sage/20"
															aria-label={`Decrease quantity of ${item.name}`}
														>
															−
														</button>
														<span className="min-w-8 text-center text-sm font-semibold text-charcoal">
															{item.quantity}
														</span>
														<button
															type="button"
															onClick={() => updateQuantity(item.id, item.quantity + 1)}
															className="inline-flex h-8 w-8 items-center justify-center text-charcoal transition-colors hover:bg-sage/20"
															aria-label={`Increase quantity of ${item.name}`}
														>
															+
														</button>
													</div>

													<button
														type="button"
														onClick={() => removeItem(item.id)}
														className="text-xs font-medium text-rose-soft transition-colors hover:text-charcoal"
													>
														Remove
													</button>
												</div>
											</div>

											<div className="justify-self-start text-base font-semibold text-charcoal sm:justify-self-end">
												{formatPrice(itemSubtotal)}
											</div>
										</article>
									);
								})}
							</div>
						</div>

						<aside>
							<div className="rounded-2xl bg-cream p-6 shadow-[0_18px_40px_-28px_rgba(61,61,61,0.45)] lg:sticky lg:top-24">
								<h2 className="font-display text-2xl font-semibold text-charcoal">Order Summary</h2>

								<div className="mt-6 space-y-4 text-sm">
									<div className="flex items-center justify-between">
										<span className="text-charcoal/70">Subtotal</span>
										<span className="font-medium text-charcoal">{formatPrice(totalPrice)}</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-charcoal/70">Shipping</span>
										<span className="font-medium text-charcoal">Free (for now)</span>
									</div>
									<div className="h-px bg-charcoal/15" />
									<div className="flex items-center justify-between">
										<span className="text-base font-medium text-charcoal">Total</span>
										<span className="text-2xl font-bold text-charcoal">{formatPrice(totalPrice)}</span>
									</div>
								</div>

								<Link
									href="/checkout"
									className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-full bg-sage text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
								>
									Checkout
								</Link>

								<p className="mt-4 text-center text-xs text-charcoal/70">
									Custom order?{" "}
									<Link href="/custom-order" className="font-medium text-charcoal underline underline-offset-2">
										Click here
									</Link>
								</p>
							</div>
						</aside>
					</section>
				)}
			</main>

			<Footer />
		</div>
	);
}
