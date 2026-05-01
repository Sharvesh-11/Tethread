"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section
      className="relative overflow-hidden px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/images/products/hero-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "right center",
        backgroundRepeat: "no-repeat",
        minHeight: "calc(100vh - 4rem)",
      }}
    >
      {/* Lighter overlay so image shows more */}
      <div className="absolute inset-0 bg-cream/40" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl items-center" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="max-w-xl animate-[fade-in_700ms_ease-out_forwards] opacity-0 py-20">
          
          <h1 className="font-display text-5xl font-bold leading-tight text-charcoal sm:text-6xl lg:text-7xl">
            Crochet Made<br />With Love 🧶
          </h1>

          <p className="mt-6 text-base leading-relaxed text-charcoal/75 sm:text-lg">
            Each piece is lovingly handcrafted — from amigurumi toys to cozy accessories.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center rounded-full bg-sage px-8 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95 shadow-sm"
            >
              Shop Now
            </Link>
            <Link
              href="/shop"
              className="inline-flex h-12 items-center justify-center rounded-full border-2 border-charcoal/20 px-8 text-sm font-semibold text-charcoal transition-all duration-200 hover:bg-white/40 backdrop-blur-sm"
            >
              View Collection
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap gap-4 text-xs font-medium text-charcoal/60">
            <span>🤝 100% Handmade</span>
            <span>📦 Ships in 3-5 days</span>
            <span>↩️ Easy returns</span>
          </div>
        </div>
      </div>
    </section>
  );
}