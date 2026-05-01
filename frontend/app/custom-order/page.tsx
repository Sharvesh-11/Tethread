"use client";

import { FormEvent, useState } from "react";

export default function CustomOrderPage() {
	const [submitted, setSubmitted] = useState(false);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSubmitted(true);
	}

	return (
		<main className="bg-cream px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
			<section className="mx-auto w-full max-w-4xl rounded-[2rem] bg-warm-white p-6 shadow-sm sm:p-8 lg:p-10">
				<div className="text-center">
					<p className="inline-flex rounded-full bg-sage/35 px-4 py-1.5 text-sm font-semibold text-charcoal">
						Made Just For You ✨
					</p>
					<h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-charcoal sm:text-5xl">
						Place a Custom Order 🧶
					</h1>
					<p className="mt-3 text-base text-charcoal/75 sm:text-lg">
						Tell us what you have in mind!
					</p>
				</div>

				<form className="mt-10 space-y-5" onSubmit={handleSubmit}>
					<div className="grid gap-5 sm:grid-cols-2">
						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Full Name</span>
							<input
								type="text"
								name="fullName"
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/40 focus:border-sage focus:shadow-md"
							/>
						</label>

						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Phone Number</span>
							<input
								type="tel"
								name="phoneNumber"
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/40 focus:border-sage focus:shadow-md"
							/>
						</label>

						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Email</span>
							<input
								type="email"
								name="email"
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/40 focus:border-sage focus:shadow-md"
							/>
						</label>

						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Product Type</span>
							<select
								name="productType"
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 focus:border-sage focus:shadow-md"
								defaultValue=""
							>
								<option value="" disabled>
									Select a product type
								</option>
								<option value="amigurumi">Air pods cover</option>
								<option value="tote-bag">Phone case</option>
								<option value="accessories">Accessories</option>
								<option value="home-decor">Animals</option>
								<option value="other">Other</option>
							</select>
						</label>
					</div>

					<div className="grid gap-5">
						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Color Preferences</span>
							<input
								type="text"
								name="colorPreferences"
								placeholder="eg: pastel pink, sage green..."
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/40 focus:border-sage focus:shadow-md"
							/>
						</label>

						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Size/Dimensions</span>
							<input
								type="text"
								name="sizeDimensions"
								placeholder="eg: 6 inches tall, A4 size..."
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/40 focus:border-sage focus:shadow-md"
							/>
						</label>

						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Your Message / Description</span>
							<textarea
								name="message"
								rows={5}
								placeholder="Describe your dream piece..."
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 placeholder:text-charcoal/40 focus:border-sage focus:shadow-md"
							/>
						</label>

						<label className="space-y-2 text-sm font-medium text-charcoal">
							<span>Reference Image Upload</span>
							<input
								type="file"
								name="referenceImage"
								className="w-full rounded-xl bg-cream px-4 py-3 text-charcoal shadow-sm outline-none transition-all duration-200 file:mr-4 file:rounded-full file:border-0 file:bg-sage file:px-4 file:py-2 file:text-sm file:font-semibold file:text-charcoal hover:file:brightness-95 focus:border-sage focus:shadow-md"
							/>
						</label>
					</div>

					<button
						type="submit"
						className="inline-flex w-full items-center justify-center rounded-full bg-sage px-6 py-4 text-base font-semibold text-charcoal transition-all duration-200 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md"
					>
						Send My Request 🧶
					</button>
				</form>

				{submitted && (
					<div className="mt-6 rounded-2xl border border-sage/40 bg-sage/20 px-4 py-4 text-center text-charcoal shadow-sm">
						We received your request!
						<br />
						We&apos;ll Telegram within 24 hours 🧶
					</div>
				)}
			</section>
		</main>
	);
}
