"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { products } from "@/lib/mockData";

type OrderStatus = "delivered" | "shipped" | "pending" | "cancelled" | "processing" | "unknown";

type OrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  image_url: string;
};

type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
};

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

const placeholderImage = "https://placehold.co/400x400/F2C4CE/3D3D3D?text=🧶";
const AUTH_TOKEN_KEY = "token";
const DELETED_CANCELLED_ORDERS_KEY = "deleted_cancelled_orders";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type ApiProduct = {
  id?: string | number;
  name?: string;
  price?: number;
  image_url?: string;
};

type ApiOrderItem = {
  id?: string | number;
  product_id?: string | number;
  quantity?: number;
  name?: string;
  product_name?: string;
  image_url?: string;
  price?: number;
  unit_price?: number;
  subtotal?: number;
  product?: ApiProduct;
};

type ApiOrder = {
  id?: string | number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  total_price?: number;
  total_amount?: number;
  items?: ApiOrderItem[];
};

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const statusStyles: Record<OrderStatus, string> = {
  delivered: "bg-sage/70 text-charcoal",
  shipped: "bg-blue-200 text-charcoal",
  pending: "bg-yellow-200 text-charcoal",
  cancelled: "bg-rose-200 text-rose-900",
  processing: "bg-amber-200 text-charcoal",
  unknown: "bg-charcoal/10 text-charcoal",
};

const toastStyles: Record<NonNullable<ToastState>["type"], string> = {
  success: "border-sage/40 bg-warm-white text-charcoal shadow-[0_14px_30px_-24px_rgba(61,61,61,0.45)]",
  error: "border-rose-soft/60 bg-warm-white text-charcoal shadow-[0_14px_30px_-24px_rgba(61,61,61,0.45)]",
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const productCatalog = new Map(products.map((product) => [String(product.id), product]));

async function getToken(): Promise<string | null> {
  // Try localStorage first
  const local = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  if (local) return local;
  // Fall back to NextAuth session
  try {
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    return (session?.user as any)?.jwt ?? null;
  } catch {
    return null;
  }
}

function normalizeOrder(rawOrder: unknown, orderIndex = 0): Order {
  const order = (rawOrder || {}) as ApiOrder;

  const items = Array.isArray(order.items)
    ? order.items.map((item, itemIndex) => {
        const productId = item.product_id != null ? String(item.product_id) : "";
        const fallbackProductId = item.product?.id != null ? String(item.product.id) : "";
        const resolvedProductId = productId || fallbackProductId || String(itemIndex + 1);
        const catalogProduct = productCatalog.get(productId);
        const quantity = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const fallbackPrice = Number(item.subtotal) > 0 ? Number(item.subtotal) / quantity : 0;
        const price =
          Number(item.unit_price) > 0
            ? Number(item.unit_price)
            : Number(item.price) > 0
              ? Number(item.price)
              : Number(item.product?.price) > 0
                ? Number(item.product?.price)
                : Number(catalogProduct?.price) > 0
                  ? Number(catalogProduct?.price)
                  : fallbackPrice;

        const resolvedName =
          item.product?.name ||
          item.product_name ||
          item.name ||
          catalogProduct?.name ||
          `Product ${String(item.product_id ?? itemIndex + 1)}`;

        const resolvedImage =
          item.product?.image_url || item.image_url || catalogProduct?.image_url || placeholderImage;

        return { product_id: resolvedProductId, name: resolvedName, quantity, price, image_url: resolvedImage };
      })
    : [];

  const computedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total =
    Number(order.total_price) > 0
      ? Number(order.total_price)
      : Number(order.total_amount) > 0
        ? Number(order.total_amount)
        : computedTotal;

  return {
    id: String(order.id ?? `order-${orderIndex + 1}`),
    date: formatOrderDate(order.created_at || order.updated_at),
    status: parseStatus(order.status),
    items,
    total,
  };
}

const parseStatus = (value: unknown): OrderStatus => {
  if (typeof value !== "string") return "unknown";
  const n = value.trim().toLowerCase();
  if (n === "delivered") return "delivered";
  if (n === "shipped") return "shipped";
  if (n === "pending") return "pending";
  if (n === "cancelled") return "cancelled";
  if (n === "processing") return "processing";
  return "unknown";
};

const formatOrderDate = (value?: string) => {
  if (!value) return "Date unavailable";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";
  return dateFormatter.format(parsedDate);
};

const normalizeOrders = (payload: unknown): Order[] => {
  const apiOrders = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { orders?: unknown[] }).orders)
      ? (payload as { orders: unknown[] }).orders
      : [];
  return apiOrders.map((rawOrder, orderIndex) => normalizeOrder(rawOrder, orderIndex));
};

const getDeletedCancelledOrderIds = (): string[] => {
  if (typeof window === "undefined") return [];
  const rawValue = localStorage.getItem(DELETED_CANCELLED_ORDERS_KEY);
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  } catch {
    return [];
  }
};

const persistDeletedCancelledOrderIds = (orderIds: string[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(DELETED_CANCELLED_ORDERS_KEY, JSON.stringify(orderIds));
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const activeOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  const showToast = useCallback((message: string, type: NonNullable<ToastState>["type"]) => {
    setToast({ message, type });
  }, []);

  const closeCancelDialog = useCallback(() => {
    if (cancellingOrderId) return;
    setSelectedOrderId(null);
  }, [cancellingOrderId]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const token = await getToken();
      const response = await fetch(`${API}/orders`, {
        method: "GET",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const serverMessage = payload && typeof payload === "object" ? (payload as { message?: string; detail?: string }).detail || (payload as { message?: string }).message : "";
        throw new Error(serverMessage || "Unable to load your orders right now.");
      }
      const normalizedOrders = normalizeOrders(payload);
      const deletedCancelledOrderIds = getDeletedCancelledOrderIds();
      setOrders(
        normalizedOrders.filter(
          (order) => !(order.status === "cancelled" && deletedCancelledOrderIds.includes(order.id)),
        ),
      );
    } catch (error) {
      setOrders([]);
      setErrorMessage(error instanceof Error ? error.message : "Unable to load your orders right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelOrder = useCallback(async () => {
    if (!activeOrder || activeOrder.status !== "pending" || cancellingOrderId) return;
    setCancellingOrderId(activeOrder.id);
    try {
      const token = await getToken();
      const response = await fetch(`${API}/orders/${activeOrder.id}/cancel`, {
        method: "PATCH",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const serverMessage = payload && typeof payload === "object" ? (payload as { message?: string; detail?: string }).detail || (payload as { message?: string }).message : "";
        throw new Error(serverMessage || "Unable to cancel this order right now.");
      }
      const updatedOrder = normalizeOrder(payload ?? activeOrder);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === activeOrder.id ? { ...order, ...updatedOrder, status: "cancelled" } : order,
        ),
      );
      setSelectedOrderId(null);
      showToast("Order cancelled successfully", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to cancel this order right now.", "error");
    } finally {
      setCancellingOrderId(null);
    }
  }, [activeOrder, cancellingOrderId, showToast]);

  const softDeleteOrder = useCallback(
    (orderId: string) => {
      const previousOrders = orders;
      setOrders((current) => current.filter((order) => order.id !== orderId));
      try {
        const currentDeletedIds = getDeletedCancelledOrderIds();
        const nextDeletedIds = Array.from(new Set([...currentDeletedIds, orderId]));
        persistDeletedCancelledOrderIds(nextDeletedIds);
        showToast("Order removed successfully", "success");
      } catch {
        setOrders(previousOrders);
        showToast("Unable to remove this order right now.", "error");
      }
    },
    [orders, showToast],
  );

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedOrderId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCancelDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeCancelDialog, selectedOrderId]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const hasOrders = useMemo(() => orders.length > 0, [orders]);

  return (
    <div className="flex min-h-screen flex-col bg-cream text-charcoal">
      <Navbar />

      {toast ? (
        <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
          <div
            className={`max-w-sm rounded-2xl border px-4 py-3 text-sm font-medium ${toastStyles[toast.type]}`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header>
          <h1 className="font-display text-4xl font-semibold text-charcoal sm:text-5xl">My Orders</h1>
          <p className="mt-3 text-sm text-charcoal/70 sm:text-base">Track and manage your orders</p>
        </header>

        {isLoading ? (
          <section className="mt-10 flex min-h-[55vh] flex-col items-center justify-center rounded-3xl bg-warm-white/70 px-6 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-sage/25 border-t-sage" />
            <p className="mt-4 text-sm font-medium text-charcoal/70">Loading your orders...</p>
          </section>
        ) : errorMessage ? (
          <section className="mt-10 flex min-h-[55vh] flex-col items-center justify-center rounded-3xl bg-warm-white/70 px-6 text-center shadow-sm">
            <div className="text-6xl leading-none sm:text-7xl">⚠️</div>
            <h2 className="mt-5 font-display text-3xl font-semibold text-charcoal sm:text-4xl">
              Could not load orders
            </h2>
            <p className="mt-3 text-sm text-charcoal/70 sm:text-base">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void fetchOrders()}
              className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-sage px-7 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
            >
              Try Again
            </button>
          </section>
        ) : !hasOrders ? (
          <section className="mt-10 flex min-h-[55vh] flex-col items-center justify-center rounded-3xl bg-warm-white/70 px-6 text-center shadow-sm">
            <div className="text-7xl leading-none sm:text-8xl">📦</div>
            <h2 className="mt-6 font-display text-3xl font-semibold text-charcoal sm:text-4xl">No orders yet</h2>
            <p className="mt-3 text-sm text-charcoal/70 sm:text-base">Your orders will appear here</p>
            <Link
              href="/shop"
              className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-sage px-7 text-sm font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
            >
              Start Shopping
            </Link>
          </section>
        ) : (
          <section className="mt-8 space-y-5">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-2xl bg-cream p-5 shadow-[0_14px_35px_-26px_rgba(61,61,61,0.45)] sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-charcoal sm:text-lg">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="mt-1 text-xs text-charcoal/60 sm:text-sm">{order.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[order.status]}`}>
                      {order.status}
                    </span>
                    {order.status === "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => void softDeleteOrder(order.id)}
                        aria-label={`Remove cancelled order ${order.id}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white transition-all duration-200 hover:bg-rose-700"
                      >
                        X
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="my-4 h-px w-full bg-charcoal/12" />

                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={`${order.id}-${item.name}-${index}`} className="flex items-center gap-3">
                      <img src={item.image_url} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-charcoal sm:text-base">{item.name}</p>
                        <p className="text-xs text-charcoal/60 sm:text-sm">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-semibold text-charcoal sm:text-base">
                        {inrFormatter.format(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="my-4 h-px w-full bg-charcoal/12" />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Link
                      href={`/products/${order.items[0].product_id}`}
                      className="inline-flex h-9 items-center rounded-full border border-sage px-4 text-xs font-semibold text-charcoal transition-all duration-200 hover:bg-sage/20 sm:text-sm"
                    >
                      View Details
                    </Link>
                    {order.status === "pending" ? (
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        disabled={cancellingOrderId === order.id}
                        className="inline-flex h-9 items-center rounded-full bg-rose-600 px-4 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                      >
                        {cancellingOrderId === order.id ? "Cancelling..." : "Cancel Order"}
                      </button>
                    ) : null}
                  </div>
                  <p className="text-base font-bold text-charcoal sm:text-lg">{inrFormatter.format(order.total)}</p>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      {activeOrder ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Close cancel order dialog"
            className="absolute inset-0 bg-charcoal/45"
            onClick={closeCancelDialog}
            disabled={Boolean(cancellingOrderId)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            className="relative w-full max-w-lg rounded-3xl border border-charcoal/10 bg-warm-white p-6 shadow-[0_24px_60px_-32px_rgba(61,61,61,0.55)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-charcoal/55">Cancel order</p>
            <h2 id="cancel-order-title" className="mt-2 font-display text-3xl font-semibold text-charcoal">
              Are you sure you want to cancel this order?
            </h2>
            <p className="mt-3 text-sm text-charcoal/70">
              Order #{activeOrder.id.slice(0, 8).toUpperCase()} will be marked as cancelled...
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCancelDialog}
                disabled={Boolean(cancellingOrderId)}
                className="inline-flex h-11 items-center justify-center rounded-full border border-charcoal/15 bg-cream px-6 text-sm font-semibold text-charcoal transition-all duration-200 hover:bg-charcoal/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void cancelOrder()}
                disabled={Boolean(cancellingOrderId)}
                className="inline-flex h-11 items-center justify-center rounded-full bg-rose-600 px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancellingOrderId === activeOrder.id ? "Cancelling..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}