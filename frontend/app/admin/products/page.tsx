"use client";

import React, { useEffect, useState } from "react";
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
  console.log("handleDelete called with id:", id);
  if (!confirm("Delete this product?")) return;
  try {
    const headers = await getAdminHeaders();
    const res = await fetch(`${API}/products/${id}`, { method: "DELETE", headers });
    console.log("response status:", res.status);
    if (!res.ok) throw new Error("Failed to delete");
    console.log("id type:", typeof id, "value:", id);
    console.log("first product id type:", typeof products[0]?.id, "value:", products[0]?.id);
    setProducts((prev) => prev.filter((p) => String(p.id) !== String(id)));
    console.log("filter done");
  } catch (err) {
    console.error("Delete error:", err);
    alert("Failed to delete product");
  }
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
      <button
        className="mb-4 px-4 py-2 bg-sage text-charcoal rounded-xl font-semibold hover:bg-sage/80 transition-colors"
        onClick={() => openModal()}
      >
        + Add Product
      </button>

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
            {products.map((product) => (
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
            {products.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="text-center py-12 text-charcoal/40">
                    No products found
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

            {/* Image Upload */}
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

            {/* Featured toggle */}
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