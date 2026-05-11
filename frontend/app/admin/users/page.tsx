"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { getAdminHeaders } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SUPERADMIN_EMAIL = "sharveshkichu@gmail.com";

type User = {
  id: string;
  full_name?: string;
  name?: string;
  email: string;
  phone_number?: string;
  is_admin: boolean;
  created_at?: string;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

  useEffect(() => {
    async function getCurrentEmail() {
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
        return;
      }
      try {
        const headers = await getAdminHeaders();
        const res = await fetch(`${API}/auth/me`, { headers });
        const data = await res.json();
        setCurrentUserEmail(data.email || "");
      } catch {}
    }
    getCurrentEmail();
  }, [session]);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      setError("");
      try {
        const headers = await getAdminHeaders();
        const res = await fetch(`${API}/users`, { headers });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data);
      } catch {
        setError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        (u.full_name || u.name || "").toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    );
  }, [search, users]);

  const isSuperAdmin = currentUserEmail === SUPERADMIN_EMAIL;

  async function toggleAdmin(userId: string, currentIsAdmin: boolean) {
    if (!confirm(`${currentIsAdmin ? "Remove" : "Grant"} admin access for this user?`)) return;
    setToggling(userId);
    try {
      const headers = await getAdminHeaders();
      const res = await fetch(`${API}/users/${userId}/toggle-admin`, {
        method: "PATCH",
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to update admin status");
      }
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: data.is_admin } : u))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update admin status");
    } finally {
      setToggling(null);
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
        Users Management
      </h1>

      <div className="mb-4 relative">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-sage/30 rounded-xl px-4 py-2 pl-9 text-sm text-charcoal focus:outline-none focus:border-sage"
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

      <p className="text-xs text-charcoal/50 mb-3">
        Showing {filteredUsers.length} of {users.length} users
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-warm-white rounded-2xl shadow-sm">
          <thead>
            <tr className="bg-sage/20 text-charcoal">
              <th className="py-3 px-4 text-left">Full Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Phone</th>
              <th className="py-3 px-4 text-left">Admin</th>
              <th className="py-3 px-4 text-left">Joined</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-blush">
                <td className="py-3 px-4 text-charcoal font-medium">
                  {user.full_name || user.name || "-"}
                </td>
                <td className="py-3 px-4 text-charcoal">{user.email}</td>
                <td className="py-3 px-4 text-charcoal">
                  {user.phone_number || "-"}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.is_admin
                        ? "bg-sage/30 text-charcoal"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {user.is_admin ? "Yes" : "No"}
                  </span>
                </td>
                <td className="py-3 px-4 text-charcoal">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="py-3 px-4">
                  {user.email === SUPERADMIN_EMAIL ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sage/30 text-charcoal">
                      👑 Superadmin
                    </span>
                  ) : isSuperAdmin ? (
                    <button
                      disabled={toggling === user.id}
                      onClick={() => toggleAdmin(user.id, user.is_admin)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                        user.is_admin
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "bg-sage/30 text-charcoal hover:bg-sage/50"
                      }`}
                    >
                      {toggling === user.id
                        ? "Updating..."
                        : user.is_admin
                        ? "Remove Admin"
                        : "Make Admin"}
                    </button>
                  ) : (
                    <span className="text-xs text-charcoal/40">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="text-center py-12 text-charcoal/40">
                    {search ? `No users found for "${search}"` : "No users found"}
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