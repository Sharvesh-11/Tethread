"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/home/Hero";
import ProductCard from "@/components/products/ProductCard";
import CustomOrder from "../components/home/CustomOrder";

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      try {
        const res = await fetch(`${API}/products?featured=true`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data: Product[] = await res.json();
        setFeaturedProducts(data);
        2
      } finally {
        setLoading(false);
      }
    }
    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <Hero />

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-4xl font-bold text-charcoal sm:text-5xl">
          Most Loved Picks 🧶
        </h2>
        <p className="mt-3 text-center text-base text-charcoal/70 sm:text-lg">
          Our customers can&apos;t stop ordering these
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full border border-sage px-5 py-2 text-sm font-semibold text-charcoal transition-all duration-200 hover:bg-sage/20"
          >
            View All
          </Link>
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage" />
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image_url={product.image_url}
                category={product.category}
                stock_quantity={product.stock_quantity}
              />
            ))}
          </div>
        )}
      </section>

      <CustomOrder />
      <Footer />
    </div>
  );
}