"use client";

import { getSession } from "next-auth/react";
import React, { useEffect, useState, useMemo } from "react";
import { getAdminHeaders } from "@/lib/api";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_url: string;
  is_active: boolean;
  is_featured: boolean;
  category: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const CLOUDINARY_CLOUD_NAME = "dysfqcv5g";
const CLOUDINARY_UPLOAD_PRESET = "tethread_products";

const initialForm = {
  name: "",
  description: "",
  price: "",
  stock_quantity: "",
  image_url: "",
  category: "",
  is_featured: false,
};

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  if (!data.secure_url) throw new Error("Upload failed");
  return data.secure_url;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setError("");
      try {
        const headers = await getAdminHeaders();
        const res = await fetch(`${API}/products`, { headers });
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setProducts(data);
      } catch {
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
    );
  }, [search, products]);

  function openModal(product: Product | null = null) {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        stock_quantity: String(product.stock_quantity),
        image_url: product.image_url,
        category: product.category ?? "",
        is_featured: product.is_featured,
      });
      setEditingId(product.id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setForm(initialForm);
    setEditingId(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, image_url: url }));
    } catch {
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `${API}/products/${editingId}` : `${API}/products`;
      const headers = { ...(await getAdminHeaders()), "Content-Type": "application/json" };
      const body = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity, 10),
        image_url: form.image_url,
        is_featured: form.is_featured,
        ...(form.category ? { category: form.category } : {}),
      };
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Failed to save product");
      const saved = await res.json();
      if (editingId) {
        setProducts((prev) => prev.map((p) => (p.id === editingId ? saved : p)));
      } else {
        setProducts((prev) => [saved, ...prev]);
      }
      closeModal();
    } catch {
      alert("Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API}/products/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Failed to delete");
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    } catch {
      alert("Failed to delete product");
    }
  }

  async function handleConnectTelegram() {
  let userId = "";

  try {
    const headers = await getAdminHeaders();
    console.log("headers:", headers); // check what token is being sent

    const res = await fetch(`${API}/auth/me`, { headers });
    console.log("auth/me status:", res.status);

    const data = await res.json();
    console.log("auth/me response:", data); // see the full response shape

    // try all possible id fields
    userId = String(data.id || data.user_id || data.sub || "");
    console.log("userId:", userId);
  } catch (e) {
    console.error("auth/me failed:", e);
  }

  if (!userId) {
    alert("Could not get user ID. Check console for details.");
    return;
  }

  const telegramUrl = `https://t.me/Tethread_bot?start=user${userId}`;
  console.log("Opening URL:", telegramUrl);
  window.open(telegramUrl, "_blank");
}

  async function toggleFeatured(id: string, is_featured: boolean) {
    try {
      const headers = { ...(await getAdminHeaders()), "Content-Type": "application/json" };
      const res = await fetch(`${API}/products/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_featured: !is_featured }),
      });
      if (!res.ok) throw new Error("Failed to update featured status");
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_featured: !is_featured } : p))
      );
    } catch {
      alert("Failed to update featured status");
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-96 bg-cream">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
    </div>
  );

  if (error) return (
    <div className="text-red-500 font-semibold">{error}</div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6 text-charcoal">
        Products Management
      </h1>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          className="px-4 py-2 bg-sage text-charcoal rounded-xl font-semibold hover:bg-sage/80 transition-colors"
          onClick={() => openModal()}
        >
          + Add Product
        </button>

        {/* Search bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-sage/30 rounded-xl px-4 py-2 pl-9 text-sm text-charcoal focus:outline-none focus:border-sage w-64"
          />
          <span className="absolute left-3 top-2.5 text-charcoal/40 text-sm">🔍</span>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-charcoal/40 hover:text-charcoal text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Telegram Connect Button */}
        <button
          onClick={handleConnectTelegram}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#229ED9] text-white rounded-xl font-semibold hover:bg-[#1a8ec4] transition-colors text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.88 13.375l-2.967-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.953-.001 0-.001.001 0 0l-.558-.769z"/>
          </svg>
          Connect Telegram
        </button>
      </div>

      {/* Result count */}
      <p className="text-xs text-charcoal/50 mb-3">
        Showing {filteredProducts.length} of {products.length} products
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-warm-white rounded-2xl shadow-sm">
          <thead>
            <tr className="bg-sage/20 text-charcoal">
              <th className="py-3 px-4 text-left">Image</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Price</th>
              <th className="py-3 px-4 text-left">Stock</th>
              <th className="py-3 px-4 text-left">Category</th>
              <th className="py-3 px-4 text-left">Featured</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b border-blush">
                <td className="py-3 px-4">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                </td>
                <td className="py-3 px-4 text-charcoal font-medium">{product.name}</td>
                <td className="py-3 px-4 text-charcoal">₹{product.price?.toFixed(2) ?? "-"}</td>
                <td className="py-3 px-4 text-charcoal">{product.stock_quantity}</td>
                <td className="py-3 px-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sage/20 text-charcoal capitalize">
                    {product.category?.replace("-", " ") || "-"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      product.is_featured
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-gray-200 text-gray-500"
                    }`}
                    onClick={() => toggleFeatured(product.id, product.is_featured)}
                  >
                    {product.is_featured ? "⭐ Featured" : "Not Featured"}
                  </button>
                </td>
                <td className="py-3 px-4 flex gap-2">
                  <button
                    className="px-3 py-1 bg-blush text-charcoal rounded-lg hover:bg-rose-soft/50 text-xs font-semibold"
                    onClick={() => openModal(product)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-xs font-semibold"
                    onClick={() => handleDelete(product.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="text-center py-12 text-charcoal/40">
                    {search ? `No products found for "${search}"` : "No products found"}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-charcoal/30 flex items-center justify-center z-50 overflow-y-auto py-8">
          <form
            className="bg-warm-white rounded-2xl shadow-lg p-8 w-full max-w-md flex flex-col gap-4 mx-4"
            onSubmit={handleSubmit}
          >
            <h2 className="font-display text-xl font-bold text-charcoal">
              {editingId ? "Edit Product" : "Add Product"}
            </h2>

            <input
              className="border border-sage/30 rounded-xl px-3 py-2 text-charcoal focus:outline-none focus:border-sage"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <textarea
              className="border border-sage/30 rounded-xl px-3 py-2 text-charcoal focus:outline-none focus:border-sage"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />

            <input
              className="border border-sage/30 rounded-xl px-3 py-2 text-charcoal focus:outline-none focus:border-sage"
              placeholder="Price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />

            <input
              className="border border-sage/30 rounded-xl px-3 py-2 text-charcoal focus:outline-none focus:border-sage"
              placeholder="Stock Quantity"
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
              required
            />

            <select
              className="border border-sage/30 rounded-xl px-3 py-2 text-charcoal focus:outline-none focus:border-sage"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              <option value="" disabled>Select Category</option>
              <option value="animals">Animals</option>
              <option value="accessories">Accessories</option>
              <option value="spider-verse">Spider-Verse</option>
              <option value="pokemon">Pokemon</option>
            </select>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-charcoal">Product Image</label>
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-xl border border-sage/30"
                />
              )}
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-sage/30 rounded-xl text-sm text-charcoal hover:bg-sage/10 transition-colors">
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sage" />
                    Uploading...
                  </span>
                ) : (
                  <span>📁 {form.image_url ? "Change Image" : "Upload Image"}</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleImageUpload}
                />
              </label>
              <input
                className="border border-sage/30 rounded-xl px-3 py-2 text-charcoal focus:outline-none focus:border-sage text-xs"
                placeholder="Or paste image URL directly"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  form.is_featured ? "bg-yellow-400" : "bg-gray-300"
                }`}
                onClick={() => setForm({ ...form, is_featured: !form.is_featured })}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    form.is_featured ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-charcoal">
                {form.is_featured ? "⭐ Featured on home page" : "Not featured"}
              </span>
            </label>

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-sage text-charcoal rounded-xl font-semibold hover:bg-sage/80 transition-colors disabled:opacity-50"
                disabled={submitting || uploading}
              >
                {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
              </button>
              <button
                type="button"
                className="flex-1 px-4 py-2 bg-blush text-charcoal rounded-xl font-semibold hover:bg-rose-soft/50 transition-colors"
                onClick={closeModal}
                disabled={submitting || uploading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}