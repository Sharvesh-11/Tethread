"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCartStore } from "@/store/cartStore";

type ProductCardProps = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function ProductCard({
  id,
  name,
  price,
  image_url,
  category,
  stock_quantity,
}: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isAdded, setIsAdded] = useState(false);

  const stockQty = Number(stock_quantity ?? 0);
  const isOutOfStock = stockQty === 0;
  const isLowStock = stockQty > 0 && stockQty < 5;

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-cream shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative z-0">
        <Link href={`/products/${id}`} aria-label={`View ${name}`}>
          <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-cream">
            <Image
              src={image_url}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-contain"
            />

            <span className="absolute left-3 top-3 rounded-full bg-sage/90 px-3 py-1 text-xs font-semibold capitalize text-charcoal">
              {category.replace("-", " ")}
            </span>

            {isOutOfStock && (
              <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white">
                Out of Stock
              </span>
            )}
            {isLowStock && (
              <span className="absolute right-3 top-3 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white">
                Only {stockQty} left
              </span>
            )}
          </div>
        </Link>

        <div className="space-y-3 p-4">
          <Link href={`/products/${id}`} aria-label={`View ${name}`}>
            <h3 className="line-clamp-2 text-lg font-body font-semibold text-charcoal">
              {name}
            </h3>
          </Link>
          <p className="text-base font-semibold text-charcoal/90">
            {inrFormatter.format(price)}
          </p>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(event) => {
              if (isOutOfStock) return;
              event.preventDefault();
              event.stopPropagation();
              addItem({ id, name, price, image_url });
              setIsAdded(true);
              setTimeout(() => setIsAdded(false), 1500);
            }}
            className={`relative z-20 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
              isOutOfStock
                ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                : "bg-sage text-charcoal hover:brightness-95"
            }`}
          >
            {isOutOfStock ? "Out of Stock" : isAdded ? "Added! ✓" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}