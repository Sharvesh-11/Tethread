"use client";

import { useMemo, useState, useEffect } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import ProductCard from "@/components/products/ProductCard";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const shopCategories = ["All", "Animals", "Accessories", "Spider-Verse 🕷️", "Pokemon ⚡"];

const categoryMap: Record<string, string> = {
  Animals: "animals",
  Accessories: "accessories",
  "Spider-Verse 🕷️": "spider-verse",
  "Pokemon ⚡": "pokemon",
};

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
};

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${API}/products`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter(
      (product) => product.category === categoryMap[activeCategory]
    );
  }, [activeCategory, products]);

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-cream flex items-center justify-center text-red-500">
      {error}
    </div>
  );

  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main className="bg-cream">
        <section className="px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
          <h1 className="font-display text-4xl font-bold text-charcoal sm:text-5xl">
            Our Collection 🧶
          </h1>
          <p className="mt-3 text-base text-charcoal/70 sm:text-lg">
            Every piece handcrafted with love
          </p>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {shopCategories.slice(0, 3).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeCategory === category
                      ? "bg-sage text-charcoal shadow-sm"
                      : "border border-sage text-charcoal hover:bg-sage/20"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="text-sm font-semibold text-charcoal/70">
                Special Characters:
              </span>
              {shopCategories.slice(3).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                    activeCategory === category
                      ? "bg-sage text-charcoal shadow-sm"
                      : "border border-sage text-charcoal hover:bg-sage/20"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-8 text-sm text-charcoal/60">
            Showing {filteredProducts.length} products
          </p>

          {filteredProducts.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
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
          ) : (
            <div className="mt-6 rounded-2xl border border-sage/30 bg-blush/40 px-4 py-8 text-center text-charcoal/70">
              No products found
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}