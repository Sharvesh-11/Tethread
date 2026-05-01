import Link from "next/link";

const decorativeEmojis = [
	{ className: "left-6 top-8 text-3xl sm:text-4xl", emoji: "🧶" },
	{ className: "right-10 top-12 text-2xl sm:text-3xl", emoji: "✨" },
	{ className: "left-10 bottom-10 text-2xl sm:text-3xl", emoji: "💫" },
	{ className: "right-8 bottom-8 text-3xl sm:text-4xl", emoji: "🪡" },
];

const featurePills = ["🎨 Your Colors", "📏 Your Size", "💝 Made with Love"];

export default function CustomOrder() {
	return (
		<section className="relative w-full overflow-hidden bg-blush px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
			{decorativeEmojis.map((item, index) => (
				<span
					key={`${item.emoji}-${index}`}
					aria-hidden="true"
					className={`pointer-events-none absolute select-none opacity-35 blur-[0.2px] ${item.className}`}
				>
					{item.emoji}
				</span>
			))}

			<div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
				<span className="inline-flex rounded-full bg-sage/35 px-4 py-1.5 text-sm font-semibold text-charcoal">
					Made Just For You ✨
				</span>

				<h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
					Want Something Special?
				</h2>

				<p className="mt-5 max-w-2xl text-base leading-relaxed text-charcoal/80 sm:text-lg">
					Can&apos;t find what you&apos;re looking for? Send us your idea and we&apos;ll
					handcraft it just for you — your colors, your size, your vision.
				</p>

				<Link
					href="/custom-order"
					className="mt-8 inline-flex items-center justify-center rounded-full bg-sage px-8 py-4 text-base font-semibold text-charcoal shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md sm:px-10 sm:py-5"
				>
					Place a Custom Order 🧶
				</Link>

				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					{featurePills.map((pill) => (
						<span
							key={pill}
							className="inline-flex items-center rounded-full border border-charcoal/10 bg-cream px-4 py-2 text-sm font-medium text-charcoal shadow-sm"
						>
							{pill}
						</span>
					))}
				</div>
			</div>
		</section>
	);
}
