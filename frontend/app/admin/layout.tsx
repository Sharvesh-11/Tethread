"use client";

import { useRouter, usePathname } from "next/navigation";
import React, { useEffect, useState, ReactNode } from "react";

const navLinks = [
  { label: "Dashboard", href: "/admin" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Products", href: "/admin/products" },
  { label: "Users", href: "/admin/users" },
  { label: "Analytics", href: "/admin/analytics" },
];

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        const payload = parseJwt(token);
        if (payload?.is_admin) { setLoading(false); return; }
      }
      try {
        const { getSession } = await import("next-auth/react");
        const session = await getSession();
        if ((session?.user as any)?.is_admin) { setLoading(false); return; }
      } catch {}
      router.replace("/login");
    }
    void checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed z-30 inset-y-0 left-0 w-64 bg-charcoal text-white flex flex-col py-8 px-4 transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <a href="/" className="mb-10 text-center block hover:opacity-80 transition-opacity">
          <div className="text-2xl font-bold tracking-wide">Tethread 🧶</div>
          <div className="text-sm text-white/50 tracking-widest uppercase mt-0.5">Admin</div>
        </a>
        <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`rounded px-4 py-2 font-medium transition-colors duration-150 ${
                  pathname === link.href ? "bg-sage text-charcoal" : "hover:bg-sage/30"
                }`}
              >
                {link.label}
              </a>
            ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="flex items-center gap-3 bg-charcoal px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-bold text-lg">Tethread 🧶</span>
        </div>

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}