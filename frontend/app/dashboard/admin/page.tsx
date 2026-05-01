"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  getMe,
  getCompletedOrdersAnalytics,
  getCancelledOrdersAnalytics,
  CompletedOrderAnalytic,
  CancelledOrderAnalytic,
  User,
} from "@/lib/api";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function filterData(data: CompletedOrderAnalytic[], isCompleted: true, searchTerm: string, filterStartDate: string, filterEndDate: string): CompletedOrderAnalytic[];
function filterData(data: CancelledOrderAnalytic[], isCompleted: false, searchTerm: string, filterStartDate: string, filterEndDate: string): CancelledOrderAnalytic[];
function filterData(
  data: CompletedOrderAnalytic[] | CancelledOrderAnalytic[],
  isCompleted: boolean,
  searchTerm: string,
  filterStartDate: string,
  filterEndDate: string
): CompletedOrderAnalytic[] | CancelledOrderAnalytic[] {
  return (data as (CompletedOrderAnalytic | CancelledOrderAnalytic)[]).filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStartDate || filterEndDate) {
      const dateKey = isCompleted ? "order_date" : "cancellation_date";
      const dateStr = item[dateKey as keyof typeof item] as string;
      const itemDate = new Date(dateStr);

      if (filterStartDate) {
        const startDate = new Date(filterStartDate);
        if (itemDate < startDate) return false;
      }

      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        if (itemDate > endDate) return false;
      }
    }

    return true;
  }) as CompletedOrderAnalytic[] | CancelledOrderAnalytic[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [completedOrders, setCompletedOrders] = useState<CompletedOrderAnalytic[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<CancelledOrderAnalytic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"completed" | "cancelled">("completed");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const currentUser = await getMe();
        if (!currentUser.is_admin) {
          router.push("/login");
          return;
        }
        setUser(currentUser);

        const [completed, cancelled] = await Promise.all([
          getCompletedOrdersAnalytics(),
          getCancelledOrdersAnalytics(),
        ]);
        setCompletedOrders(completed);
        setCancelledOrders(cancelled);
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const filteredCompleted = filterData(completedOrders, true, searchTerm, filterStartDate, filterEndDate) as CompletedOrderAnalytic[];
  const filteredCancelled = filterData(cancelledOrders, false, searchTerm, filterStartDate, filterEndDate) as CancelledOrderAnalytic[];

  const completedStats = {
    totalOrders: completedOrders.length,
    uniqueUsers: new Set(completedOrders.map((o) => o.user_email)).size,
  };

  const cancelledStats = {
    totalOrders: cancelledOrders.length,
    uniqueUsers: new Set(cancelledOrders.map((o) => o.user_email)).size,
  };

  const handleExportCSV = (
    data: CompletedOrderAnalytic[] | CancelledOrderAnalytic[],
    filename: string
  ) => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    const isCompleted = "order_date" in data[0];
    const headers = isCompleted
      ? ["User Name", "User Email", "Product Name", "Product ID", "Order Date", "Order Status"]
      : ["User Name", "User Email", "Product Name", "Product ID", "Cancellation Date"];

    const rows = data.map((item) => {
      if (isCompleted) {
        const completed = item as CompletedOrderAnalytic;
        return [
          completed.user_name,
          completed.user_email,
          completed.product_name,
          completed.product_id,
          completed.order_date,
          completed.order_status,
        ];
      } else {
        const cancelled = item as CancelledOrderAnalytic;
        return [
          cancelled.user_name,
          cancelled.user_email,
          cancelled.product_name,
          cancelled.product_id,
          cancelled.cancellation_date,
        ];
      }
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      const [completed, cancelled] = await Promise.all([
        getCompletedOrdersAnalytics(),
        getCancelledOrdersAnalytics(),
      ]);
      setCompletedOrders(completed);
      setCancelledOrders(cancelled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-cream">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-4 inline-block">
              <div className="w-12 h-12 border-4 border-sage border-t-rose-soft rounded-full animate-spin"></div>
            </div>
            <p className="text-charcoal/70">Loading dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold text-charcoal mb-2">Admin Dashboard</h1>
            <p className="text-charcoal/70">Order analytics and management</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-soft/20 border border-rose-soft/50 rounded-lg text-rose-900">
              {error}
            </div>
          )}

          <div className="mb-6 bg-warm-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Search by name or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-charcoal/20 rounded-lg focus:outline-none focus:border-sage"
              />
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="px-4 py-2 border border-charcoal/20 rounded-lg focus:outline-none focus:border-sage"
              />
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="px-4 py-2 border border-charcoal/20 rounded-lg focus:outline-none focus:border-sage"
              />
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-sage text-warm-white rounded-lg hover:bg-sage/90 font-medium transition"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          <div className="mb-6 flex gap-4 border-b border-charcoal/10">
            <button
              onClick={() => setActiveTab("completed")}
              className={`pb-4 font-medium transition ${
                activeTab === "completed"
                  ? "text-sage border-b-2 border-sage"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              Completed Orders ({completedStats.totalOrders})
            </button>
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`pb-4 font-medium transition ${
                activeTab === "cancelled"
                  ? "text-sage border-b-2 border-sage"
                  : "text-charcoal/60 hover:text-charcoal"
              }`}
            >
              Cancelled Orders ({cancelledStats.totalOrders})
            </button>
          </div>

          {activeTab === "completed" && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-warm-white p-4 rounded-lg">
                    <p className="text-charcoal/70 text-sm">Total Items</p>
                    <p className="text-2xl font-bold text-sage">{completedStats.totalOrders}</p>
                  </div>
                  <div className="bg-warm-white p-4 rounded-lg">
                    <p className="text-charcoal/70 text-sm">Unique Users</p>
                    <p className="text-2xl font-bold text-sage">{completedStats.uniqueUsers}</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleExportCSV(
                      filteredCompleted,
                      `completed-orders-${new Date().toISOString().split("T")[0]}.csv`
                    )
                  }
                  className="px-4 py-2 bg-blush text-charcoal rounded-lg hover:bg-blush/80 font-medium transition"
                >
                  📥 Export CSV
                </button>
              </div>

              <div className="overflow-x-auto bg-warm-white rounded-lg shadow-sm">
                {filteredCompleted.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-charcoal/10 bg-cream/50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">User Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">User Email</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">Product Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">Product ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">Order Date</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCompleted.map((order, idx) => (
                        <tr key={idx} className="border-b border-charcoal/5 hover:bg-cream/30 transition">
                          <td className="px-6 py-4 text-sm text-charcoal">{order.user_name}</td>
                          <td className="px-6 py-4 text-sm text-charcoal/70">{order.user_email}</td>
                          <td className="px-6 py-4 text-sm font-medium text-charcoal">{order.product_name}</td>
                          <td className="px-6 py-4 text-sm text-charcoal/70 font-mono text-xs">
                            {order.product_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 text-sm text-charcoal/70">
                            {dateFormatter.format(new Date(order.order_date))}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                order.order_status === "delivered"
                                  ? "bg-sage/20 text-sage"
                                  : "bg-blue-200 text-blue-900"
                              }`}
                            >
                              {order.order_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-charcoal/70">No completed orders found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "cancelled" && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-warm-white p-4 rounded-lg">
                    <p className="text-charcoal/70 text-sm">Total Items</p>
                    <p className="text-2xl font-bold text-rose-soft">{cancelledStats.totalOrders}</p>
                  </div>
                  <div className="bg-warm-white p-4 rounded-lg">
                    <p className="text-charcoal/70 text-sm">Unique Users</p>
                    <p className="text-2xl font-bold text-rose-soft">{cancelledStats.uniqueUsers}</p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleExportCSV(
                      filteredCancelled,
                      `cancelled-orders-${new Date().toISOString().split("T")[0]}.csv`
                    )
                  }
                  className="px-4 py-2 bg-blush text-charcoal rounded-lg hover:bg-blush/80 font-medium transition"
                >
                  📥 Export CSV
                </button>
              </div>

              <div className="overflow-x-auto bg-warm-white rounded-lg shadow-sm">
                {filteredCancelled.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-charcoal/10 bg-cream/50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">User Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">User Email</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">Product Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">Product ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-charcoal">Cancellation Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCancelled.map((order, idx) => (
                        <tr key={idx} className="border-b border-charcoal/5 hover:bg-cream/30 transition">
                          <td className="px-6 py-4 text-sm text-charcoal">{order.user_name}</td>
                          <td className="px-6 py-4 text-sm text-charcoal/70">{order.user_email}</td>
                          <td className="px-6 py-4 text-sm font-medium text-charcoal">{order.product_name}</td>
                          <td className="px-6 py-4 text-sm text-charcoal/70 font-mono text-xs">
                            {order.product_id.slice(0, 8)}...
                          </td>
                          <td className="px-6 py-4 text-sm text-charcoal/70">
                            {dateFormatter.format(new Date(order.cancellation_date))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-charcoal/70">No cancelled orders found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}