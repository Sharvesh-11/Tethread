"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Bars3Icon,
  ShoppingBagIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getMe, logoutUser, type User } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/orders", label: "Orders" },
];

export default function Navbar() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.totalItems());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (session?.user) {
      setUser(null);
      return;
    }

    if (status === "loading") return;

    const loadUser = async () => {
      try {
        const currentUser = await getMe();
        setUser(currentUser);
      } catch {
        setUser(null);
      }
    };

    void loadUser();
  }, [session, status]);
  
  useEffect(() => {
  if (session) {
    console.log("Navbar session:", JSON.stringify(session));
  }
}, [session]);

  const nextAuthFirstName = session?.user?.name?.trim().split(/\s+/)[0] || "";
  const jwtFirstName = user?.full_name?.trim().split(/\s+/)[0] || "";
  const firstName = nextAuthFirstName || jwtFirstName;
  const isLoggedIn = Boolean(session?.user || user);
  const isAdmin = Boolean(user?.is_admin || (session?.user as any)?.is_admin);
  const hasNextAuthSession = Boolean(session?.user);

  const handleLogout = async () => {
    if (hasNextAuthSession) {
      await signOut({ callbackUrl: "/" });
      return;
    }
    logoutUser();
    setUser(null);
    router.push("/");
  };

  // Combine nav links, only adding Admin after mount (client-only)
  const allNavLinks = [
    ...navLinks,
    ...(mounted && isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-md shadow-sm">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-2xl font-semibold tracking-tight text-charcoal transition-colors duration-200 hover:text-sage"
        >
          Tethread 🧶
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {allNavLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-medium text-charcoal transition-colors duration-200 hover:text-rose-soft"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/custom-order"
            className="inline-flex h-8 items-center rounded-full bg-sage px-3.5 text-xs font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
          >
            Custom Order 🧶
          </Link>

          <Link href="/cart">
            <button
              type="button"
              aria-label="Cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition-all duration-200 hover:bg-cream hover:text-sage"
            >
              <ShoppingBagIcon className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {totalItems}
                </span>
              )}
            </button>
          </Link>

          {mounted && isLoggedIn ? (
            <>
              <span className="hidden sm:inline-flex h-8 items-center px-1 text-xs font-medium text-charcoal">
                Hi, {firstName}!
              </span>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="hidden sm:inline-flex h-8 items-center rounded-full border border-charcoal/30 px-3 text-xs font-medium text-charcoal transition-all duration-200 hover:border-sage hover:text-sage"
              >
                Logout
              </button>
            </>
          ) : mounted ? (
            <Link
              href="/login"
              className="hidden sm:inline-flex h-8 items-center rounded-full border border-charcoal/30 px-3 text-xs font-medium text-charcoal transition-all duration-200 hover:border-sage hover:text-sage"
            >
              Login
            </Link>
          ) : null}

          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal transition-all duration-200 hover:bg-cream hover:text-sage md:hidden"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="border-t border-charcoal/10 bg-warm-white/95 md:hidden">
          <ul className="space-y-1 px-4 py-3 sm:px-6">
            {allNavLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm font-medium text-charcoal transition-colors duration-200 hover:bg-cream hover:text-rose-soft"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-1">
              <Link
                href="/custom-order"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-8 items-center rounded-full bg-sage px-3.5 text-xs font-semibold text-charcoal transition-all duration-200 hover:brightness-95"
              >
                Custom Order 🧶
              </Link>
            </li>
            <li className="pt-1 sm:hidden">
              {mounted && isLoggedIn ? (
                <>
                  <p className="mb-2 px-1 text-xs font-medium text-charcoal">
                    Hi, {firstName}!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="inline-flex h-8 items-center rounded-full border border-charcoal/30 px-3 text-xs font-medium text-charcoal transition-all duration-200 hover:border-sage hover:text-sage"
                  >
                    Logout
                  </button>
                </>
              ) : mounted ? (
                <Link
                  href="/login"
                  className="inline-flex h-8 items-center rounded-full border border-charcoal/30 px-3 text-xs font-medium text-charcoal transition-all duration-200 hover:border-sage hover:text-sage"
                >
                  Login
                </Link>
              ) : null}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}