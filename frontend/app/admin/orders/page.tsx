"use client";
import React, { useEffect, useState } from "react";
import { getAdminHeaders } from "@/lib/api";

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type Order = {
  id: string;
  user_name: string;
  user_email: string;
  total_amount: number;
  status: "pending" | "shipped" | "delivered" | "cancelled";
  created_at: string;
  shipping_address: {
    full_name: string;
    phone: string;
    address: string;
    city: string;
  };
  items: OrderItem[];
  hidden?: boolean;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const statusColors: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError("");
      try {
        const headers = await getAdminHeaders();
        const res = await fetch(`${API}/orders/admin/all`, { headers });
        if (!res.ok) throw new Error("Failed to fetch orders");
        const data = await res.json();
        setOrders(data);
      } catch {
        setError("Failed to load orders.");
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  async function deleteOrder(orderId: string) {
    if (!confirm("Permanently delete this order?")) return;
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API}/orders/admin/${orderId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete order");
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      alert("Failed to delete order");
    }
  }

  async function updateStatus(id: string, status: Order["status"]) {
    setUpdating(id);
    try {
      const headers = { ...(await getAdminHeaders()), "Content-Type": "application/json" };
      const res = await fetch(`${API}/orders/${id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdating("");
    }
  }

  async function cancelOrder(id: string) {
    setUpdating(id);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API}/orders/${id}/cancel`, {
        method: "PATCH",
        headers,
      });
      if (!res.ok) throw new Error("Failed to cancel order");
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o))
      );
    } catch {
      alert("Failed to cancel order");
    } finally {
      setUpdating("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 font-semibold">{error}</div>;
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-6 text-charcoal">
        Orders Management
      </h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-warm-white rounded-2xl shadow-sm">
          <thead>
            <tr className="bg-sage/20 text-charcoal">
              <th className="py-3 px-4 text-left">Order ID</th>
              <th className="py-3 px-4 text-left">Customer</th>
              <th className="py-3 px-4 text-left">Products</th>
              <th className="py-3 px-4 text-left">Total</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.filter((o) => !o.hidden).map((order) => (
              <tr key={order.id} className="border-b border-blush align-top group">
                <td className="py-3 px-4 font-mono text-charcoal text-xs">
                  <div className="flex items-center gap-2">
                    {order.id.slice(0, 8)}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      title="Delete this order"
                      className="text-charcoal/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 leading-none"
                    >
                      ✕
                    </button>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-charcoal">
                    {order.user_name || "-"}
                  </div>
                  <div className="text-xs text-charcoal/40">{order.user_email || ""}</div>
                  {order.shipping_address?.phone && (
                    <div className="text-xs text-charcoal/40">
                      {order.shipping_address.phone}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  {order.items && order.items.length > 0 ? (
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-2">
                          <span className="font-medium text-charcoal text-sm">
                            {item.product_name}
                          </span>
                          <span className="text-xs text-charcoal/50 bg-sage/10 px-1.5 py-0.5 rounded-full">
                            ×{item.quantity}
                          </span>
                          <span className="text-xs text-charcoal/40">
                            ₹{item.unit_price.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-charcoal/30 italic">No items</span>
                  )}
                </td>
                <td className="py-3 px-4 text-charcoal font-medium">
                  ₹{order.total_amount?.toFixed(2) ?? "-"}
                </td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4 text-charcoal text-sm">
                  {order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-col gap-2">
                    <select
                      className="border border-sage/30 rounded-xl px-2 py-1 text-sm text-charcoal focus:outline-none focus:border-sage"
                      value={order.status}
                      disabled={updating === order.id}
                      onChange={(e) => updateStatus(order.id, e.target.value as Order["status"])}
                    >
                      {(["pending", "shipped", "delivered", "cancelled"] as const).map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                   
                  </div>
                </td>
              </tr>
            ))}
            {orders.filter((o) => !o.hidden).length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="text-center py-12 text-charcoal/40">
                    No orders found
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}