"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ShieldCheck, User, Home, Calendar } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  host:  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  guest: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

interface Props {
  currentUser: any;
  initialData: any;
}

export default function UsersClient({ currentUser, initialData }: Props) {
  const router = useRouter();
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [roleChangeId, setRoleChangeId] = useState("");
  const [newRole, setNewRole] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (params: { search?: string; role?: string; page?: number }) => {
    setLoading(true);
    const token = Cookies.get("token");
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.role)   qs.set("role", params.role);
      qs.set("page", String(params.page ?? 1));
      qs.set("limit", "20");
      const res = await api.get(`/admin/users?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      setPage(params.page ?? 1);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers({ search: v, role: roleFilter, page: 1 }), 400);
  };

  const handleRoleFilter = (v: string) => {
    setRoleFilter(v);
    fetchUsers({ search, role: v, page: 1 });
  };

  const handleUpdateUser = useCallback(async (userId: string, fields: { role?: string; is_active?: boolean }) => {
    setActionLoading((p) => ({ ...p, [userId]: true }));
    const token = Cookies.get("token");
    try {
      await api.patch(`/admin/users/${userId}`, fields, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("User updated");
      fetchUsers({ search, role: roleFilter, page });
      setSelectedUser(null);
      setRoleChangeId("");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Update failed");
    } finally {
      setActionLoading((p) => ({ ...p, [userId]: false }));
    }
  }, [fetchUsers, search, roleFilter, page]);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const users: any[] = data?.users ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <AdminShell title="User Management" subtitle={`${total} users on the platform`}>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilter(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-purple-500"
        >
          <option value="">All Roles</option>
          <option value="guest">Guest</option>
          <option value="host">Host</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-40 flex items-center justify-center text-neutral-400">Loading…</div>
      ) : users.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-neutral-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
          No users found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-neutral-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">User</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Joined</th>
                <th className="px-4 py-3 text-center font-semibold">Properties</th>
                <th className="px-4 py-3 text-center font-semibold">Bookings</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">{u.name}</div>
                    <div className="text-xs text-neutral-400 truncate max-w-[200px]">{u.email}</div>
                    {u.host_verified && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600"><ShieldCheck size={10} /> Verified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${ROLE_BADGE[u.role] || ""}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{fmt(u.createdAt)}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">{u.property_count ?? 0}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">{u.booking_count ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      u.is_active === false
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-900/20"
                        : "bg-green-100 text-green-600 dark:bg-green-900/20"
                    }`}>
                      {u.is_active === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Role change */}
                      {roleChangeId === u.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="text-xs border border-slate-300 dark:border-slate-600 rounded px-1.5 py-1 bg-white dark:bg-slate-900 dark:text-white"
                          >
                            <option value="">Select role</option>
                            <option value="guest">guest</option>
                            <option value="host">host</option>
                            <option value="admin">admin</option>
                          </select>
                          <button
                            disabled={!newRole || actionLoading[u.id]}
                            onClick={() => handleUpdateUser(u.id, { role: newRole })}
                            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 cursor-pointer"
                          >
                            Save
                          </button>
                          <button onClick={() => setRoleChangeId("")} className="text-xs text-neutral-400 hover:text-slate-600 cursor-pointer">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRoleChangeId(u.id); setNewRole(u.role); }}
                          className="text-xs text-purple-600 hover:underline cursor-pointer"
                        >
                          Change Role
                        </button>
                      )}

                      {/* Activate/deactivate */}
                      {u.id !== currentUser.id && (
                        <button
                          disabled={actionLoading[u.id]}
                          onClick={() => handleUpdateUser(u.id, { is_active: u.is_active === false })}
                          className={`text-xs px-2 py-1 rounded transition cursor-pointer disabled:opacity-50 ${
                            u.is_active === false
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-rose-100 text-rose-600 hover:bg-rose-200"
                          }`}
                        >
                          {u.is_active === false ? "Activate" : "Deactivate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-neutral-500">
            Page {page} of {pages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => fetchUsers({ search, role: roleFilter, page: page - 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              disabled={page >= pages || loading}
              onClick={() => fetchUsers({ search, role: roleFilter, page: page + 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
