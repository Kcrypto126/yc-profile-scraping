"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";

type UserRow = {
  _id: string;
  email: string;
  name: string | null;
  role: string;
  enabled: boolean;
  createdAt: string;
};

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/signin?next=" + encodeURIComponent("/admin"));
      return;
    }
    if (user?.role !== "admin") {
      router.replace("/search");
      return;
    }
  }, [authLoading, isAuthenticated, user?.role, router]);

  useEffect(() => {
    if (user?.role !== "admin") return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/users", { credentials: "same-origin" });
        if (!res.ok) {
          if (res.status === 403) {
            router.replace("/search");
            return;
          }
          toast.error("Failed to load users");
          return;
        }
        const data = (await res.json()) as { ok: boolean; users?: UserRow[] };
        if (data.ok && data.users) setUsers(data.users);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user?.role, router]);

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      const res = await fetch(`/api/users/${id}/accept`, {
        method: "PATCH",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to accept user");
        return;
      }
      toast.success("User accepted");
      setUsers((prev) =>
        prev.map((u) => (u._id === id ? { ...u, enabled: true } : u))
      );
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this user? They will no longer be able to sign in.")) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to remove user");
        return;
      }
      toast.success("User removed");
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } finally {
      setRemovingId(null);
    }
  };

  if (authLoading || (isAuthenticated && user?.role !== "admin")) {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Manage users
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Accept signups to allow new users to sign in. Only approved users can access the app.
      </p>

      {loading ? (
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-12 rounded w-full" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {u.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        u.role === "admin"
                          ? "px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200"
                          : "px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.enabled ? (
                      <span className="text-green-600 dark:text-green-400">Approved</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 flex flex-wrap gap-2">
                    {!u.enabled && (
                      <button
                        type="button"
                        onClick={() => handleAccept(u._id)}
                        disabled={acceptingId === u._id}
                        className="rounded bg-green-600 hover:bg-green-700 disabled:opacity-60 px-3 py-1.5 text-sm text-white font-medium"
                      >
                        {acceptingId === u._id ? "Accepting..." : "Accept"}
                      </button>
                    )}
                    {user?.id !== u._id && (
                      <button
                        type="button"
                        onClick={() => handleRemove(u._id)}
                        disabled={removingId === u._id}
                        className="rounded bg-red-600 hover:bg-red-700 disabled:opacity-60 px-3 py-1.5 text-sm text-white font-medium"
                      >
                        {removingId === u._id ? "Removing..." : "Remove"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && users.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">No users yet.</p>
      )}
    </div>
  );
}
