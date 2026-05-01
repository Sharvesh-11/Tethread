"use client";
import React, { useEffect, useState } from "react";
import { getAdminHeaders } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";



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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      <div className="overflow-x-auto">
        <table className="min-w-full bg-warm-white rounded-2xl shadow-sm">
          <thead>
            <tr className="bg-sage/20 text-charcoal">
              <th className="py-3 px-4 text-left">Full Name</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Phone</th>
              <th className="py-3 px-4 text-left">Admin</th>
              <th className="py-3 px-4 text-left">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
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
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="text-center py-12 text-charcoal/40">
                    No users found
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