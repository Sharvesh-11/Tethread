import Link from "next/link";
import { CameraIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

const quickLinks = [
	{ href: "/shop", label: "Shop" },
	{ href: "/about", label: "About Us" },
	{ href: "/contact", label: "Contact" },
	{ href: "/faq", label: "FAQ" },
];

export default function Footer() {
	return (
		<footer className="mt-auto bg-charcoal text-cream/80">
			<div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
				<section>
					<h2 className="font-display text-3xl font-semibold text-cream">Tethread 🧶</h2>
					<p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/80">
						Handcrafted with love, one stitch at a time
					</p>
					<p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70">
						Discover thoughtfully crocheted pieces made for cozy corners, cherished gifts, and everyday comfort. Each design is made in small batches with care and warmth.
					</p>
				</section>

				<section>
					<h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-sage">
						Quick Links
					</h3>
					<ul className="mt-4 space-y-3">
						{quickLinks.map((link) => (
							<li key={link.href}>
								<Link
									href={link.href}
									className="text-sm transition-colors duration-200 hover:text-cream"
								>
									{link.label}
								</Link>
							</li>
						))}
					</ul>
				</section>

				<section>
					<h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-sage">
						Connect
					</h3>
					<ul className="mt-4 space-y-3 text-sm">
						<li>
							<a
								href="https://instagram.com/tethread"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 transition-colors duration-200 hover:text-cream"
							>
								<CameraIcon className="h-4 w-4" />
								@tethread
							</a>
						</li>
						<li>
							<a
								href="https://wa.me/0000000000"
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 transition-colors duration-200 hover:text-cream"
							>
								<ChatBubbleLeftRightIcon className="h-4 w-4" />
								+91 XXXXX XXXXX
							</a>
						</li>
						<li>
							<a
								href="mailto:hello@tethread.com"
								className="inline-flex items-center gap-2 transition-colors duration-200 hover:text-cream"
							>
								hello@tethread.com
							</a>
						</li>
					</ul>
				</section>
			</div>

			<div className="border-t border-cream/15">
				<div className="mx-auto w-full max-w-7xl px-4 py-4 text-xs text-cream/70 sm:px-6 lg:px-8">
					© 2024 Tethread. Made with 🧶 in India
				</div>
			</div>
		</footer>
	);
}
