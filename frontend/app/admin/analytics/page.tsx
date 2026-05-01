"use client";
import React, { useEffect, useState } from "react";

type AnalyticsOrder = {
  user_name: string;
  user_email: string;
  product_name: string;
  product_id: string;
  order_date?: string;
  order_status?: string;
  cancellation_date?: string;
};

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { getAdminHeaders } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SERVICE_KEY = "nR8#vQ2xL!9mT$4pZ@7kD%1sY&6wH*3cJ5uF0aBnE2r";

const COLORS = ["#C97D4E", "#FBE9E0", "#FFD6B0", "#F9B384", "#F7A072", "#F28482"];


export default function AnalyticsPage() {
  const [completed, setCompleted] = useState<AnalyticsOrder[] | null>(null);
  const [cancelled, setCancelled] = useState<AnalyticsOrder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError("");
      try {
        const headers = await getAdminHeaders({ "X-Service-Key": SERVICE_KEY });
        const [completedRes, cancelledRes] = await Promise.all([
          fetch(`${API}/orders/analytics/completed`, { headers }),
          fetch(`${API}/orders/analytics/cancelled`, { headers }),
        ]);
        if (!completedRes.ok || !cancelledRes.ok) throw new Error("Failed to fetch analytics");
        setCompleted(await completedRes.json());
        setCancelled(await cancelledRes.json());
      } catch (err) {
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
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
  if (!completed || !cancelled) return null;

  // Top selling products — count occurrences of each product_name
  const productMap: Record<string, number> = {};
  completed.forEach((item) => {
    productMap[item.product_name] = (productMap[item.product_name] || 0) + 1;
  });
  const topProducts = Object.entries(productMap)
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => (b.qty as number) - (a.qty as number));

  // Orders over time — group by date
  const dateMap: Record<string, number> = {};
  completed.forEach((item) => {
    const date = item.order_date ? new Date(item.order_date).toLocaleDateString() : "";
    if (date) dateMap[date] = (dateMap[date] || 0) + 1;
  });
  const ordersOverTime = Object.entries(dateMap)
    .map(([date, count]) => ({ date, count }));

  // Status breakdown
  const statusData = [
    { name: "Completed", value: completed.length },
    { name: "Cancelled", value: cancelled.length },
  ];

  return (
    <div className="bg-cream min-h-screen">
      <h1 className="font-display text-3xl font-bold mb-8 text-charcoal">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-warm-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-charcoal">Top Selling Products</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="qty" fill="#B7C9A6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-warm-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-charcoal">Orders Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={ordersOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#C97D4E" strokeWidth={2} dot={{ r: 5, fill: '#C97D4E' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-warm-white rounded-lg shadow-sm p-6 mt-8 max-w-md">
        <h2 className="text-lg font-semibold mb-4 text-charcoal">Order Status Breakdown</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#C97D4E"
              label
            >
              {statusData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
