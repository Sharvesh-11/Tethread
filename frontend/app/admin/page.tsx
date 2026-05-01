"use client";
import React, { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const statCards = [
  {
    label: "Total Orders",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" /></svg>
    ),
    color: "bg-warm-white text-charcoal",
  },
  {
    label: "Pending Orders",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
    ),
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    label: "Total Products",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 7h20" /></svg>
    ),
    color: "bg-warm-white text-charcoal",
  },
  {
    label: "Total Users",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M5.5 21a7.5 7.5 0 0 1 13 0" /></svg>
    ),
    color: "bg-warm-white text-charcoal",
  },
];


import { getAdminHeaders } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState([null, null, null, null]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError("");
      try {
        const headers = await getAdminHeaders();
        const [ordersRes, productsRes, usersRes] = await Promise.all([
          fetch(`${API}/orders/admin/all`, { headers }),
          fetch(`${API}/products`, { headers }),
          fetch(`${API}/users`, { headers }),
        ]);
        if (!ordersRes.ok || !productsRes.ok || !usersRes.ok) throw new Error("Failed to fetch stats");
        const orders: { status: string }[] = await ordersRes.json();
        const products = await productsRes.json();
        const users = await usersRes.json();
        setStats([
          orders.length,
          orders.filter((o) => o.status === "pending").length,
          products.length,
          users.length,
        ]);
      } catch (err) {
        setError("Failed to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
      </div>
    );
  }
  if (error) {
    return <div className="text-rose-soft font-semibold">{error}</div>;
  }

  return (
    <div className="bg-cream min-h-screen">
      <h1 className="font-display text-3xl font-bold mb-8 text-charcoal">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`flex items-center gap-4 rounded-2xl shadow-sm p-6 ${card.color}`}
          >
            <div>{card.icon}</div>
            <div>
              <div className="text-lg font-semibold font-body">{card.label}</div>
              <div className="text-2xl font-bold font-body">{stats[i]}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
