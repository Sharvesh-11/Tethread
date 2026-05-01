"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ProductCard from "@/components/products/ProductCard";
import { useCartStore } from "@/store/cartStore";
import { getProduct, getProducts, type Product } from "@/lib/api";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = React.use(params);
  const productId = resolvedParams.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch product from database
  useEffect(() => {
    async function fetchProduct() {
      setLoading(true);
      try {
        const data = await getProduct(productId);
        setProduct(data);
        // Fetch related products
        const all = await getProducts();
        setRelatedProducts(all.filter((p) => p.id !== productId).slice(0, 3));
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-cream">
        <Navbar />
        <main className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-sage/25 bg-warm-white px-6 py-10 text-center text-charcoal shadow-sm">
            Product not found
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const stockQty = Number(product.stock_quantity ?? product.stock ?? 0);

  const decreaseQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));
  const increaseQuantity = () => setQuantity((prev) => Math.min(stockQty, prev + 1));

  const handleAddToCart = () => {
    if (stockQty === 0) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url ?? "",
      quantity,
    });
    setIsAdded(true);
    setToastMessage(`${product.name} added to cart`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setIsAdded(false);
      setToastMessage(null);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />

      {toastMessage && (
        <div className="fixed right-4 top-4 z-50 rounded-2xl border border-sage/30 bg-warm-white px-4 py-3 text-sm font-medium text-charcoal shadow-lg">
          {toastMessage}
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            <div className="relative aspect-[4/5] w-full bg-cream">
              <Image
                src={product.image_url ?? "/placeholder.jpg"}
                alt={product.name}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>

            {product.category && (
              <span className="absolute left-4 top-4 rounded-full bg-sage px-3 py-1 text-xs font-semibold uppercase tracking-wide text-charcoal">
                {product.category.replace("-", " ")}
              </span>
            )}

            {stockQty === 0 && (
              <span className="absolute right-4 top-4 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                Out of Stock
              </span>
            )}
            {stockQty > 0 && stockQty < 5 && (
              <span className="absolute right-4 top-4 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                Only {stockQty} left
              </span>
            )}
          </div>

          <div>
            {product.category && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sage">
                {product.category.replace("-", " ")}
              </p>
            )}

            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-charcoal sm:text-5xl">
              {product.name}
            </h1>

            <p className="mt-4 text-3xl font-bold text-charcoal">
              {inrFormatter.format(product.price)}
            </p>

            <div className="my-6 h-px w-full bg-charcoal/15" />

            <p className="text-base leading-relaxed text-charcoal/80">
              {product.description}
            </p>

            <p className="mt-4 text-sm font-medium text-charcoal/70">
              {stockQty} pieces available
            </p>

            <div className="mt-7 inline-flex items-center rounded-xl border border-sage/70 bg-cream">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                className="h-10 w-10 text-xl font-semibold text-charcoal transition-colors duration-200 hover:bg-sage/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                -
              </button>
              <div className="inline-flex h-10 min-w-14 items-center justify-center border-x border-sage/60 px-3 text-sm font-semibold text-charcoal">
                {quantity}
              </div>
              <button
                type="button"
                onClick={increaseQuantity}
                disabled={quantity >= stockQty}
                className="h-10 w-10 text-xl font-semibold text-charcoal transition-colors duration-200 hover:bg-sage/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                +
              </button>
            </div>

            <div className="mt-8 space-y-3">
              <button
                type="button"
                onClick={stockQty === 0 ? undefined : handleAddToCart}
                disabled={stockQty === 0}
                className={`inline-flex w-full items-center justify-center rounded-xl bg-sage px-6 py-3 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95 ${
                  stockQty === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {stockQty === 0 ? "Out of Stock" : isAdded ? "Added ✓" : "Add to Cart 🛒"}
              </button>

              <Link
                href="/custom-order"
                className="inline-flex w-full items-center justify-center rounded-xl border border-sage px-6 py-3 text-sm font-semibold text-charcoal transition-all duration-200 hover:bg-sage/20"
              >
                Place Custom Order
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-charcoal/75 sm:gap-3 sm:text-sm">
              <span className="rounded-full bg-blush/60 px-3 py-1">🤝 Handmade</span>
              <span className="rounded-full bg-blush/60 px-3 py-1">📦 Ships in 3-5 days</span>
              <span className="rounded-full bg-blush/60 px-3 py-1">↩️ Easy returns</span>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-3xl font-bold text-charcoal sm:text-4xl">
            You Might Also Like
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                name={item.name}
                price={item.price}
                image_url={item.image_url ?? ""}
                category={item.category ?? ""}
                stock_quantity={Number(item.stock_quantity ?? item.stock ?? 0)}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}