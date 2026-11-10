"use client";

import { useState, useCallback, useRef } from "react";
import { Search, ChevronLeft, ChevronRight, IndianRupee } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800",
  rejected:  "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
};

const PAYMENT_BADGE: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  failed:  "bg-rose-100 text-rose-600",
};

interface Props { currentUser: any; initialData: any; }

export default function AdminBookingsClient({ currentUser, initialData }: Props) {
  const [data, setData]         = useState<any>(initialData);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatus] = useState("");
  const [page, setPage]         = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBookings = useCallback(async (params: {
    search?: string; status?: string; page?: number;
  }) => {
    setLoading(true);
    const token = Cookies.get("token");
    try {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.status) qs.set("status", params.status);
      qs.set("page", String(params.page ?? 1));
      qs.set("limit", "20");
      const res = await api.get(`/admin/bookings?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      setPage(params.page ?? 1);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchBookings({ search: v, status: statusFilter, page: 1 }), 400);
  };

  const fmt = (d: string) => d
    ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const bookings: any[] = data?.bookings ?? [];
  const total  = data?.total ?? 0;
  const pages  = data?.pages ?? 1;

  return (
    <AdminShell title="Booking Management" subtitle={`${total} bookings across the platform`}>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by guest name, email, phone…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-purple-500"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatus(e.target.value); fetchBookings({ search, status: e.target.value, page: 1 }); }}
          className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-40 flex items-center justify-center text-neutral-400">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-neutral-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
          No bookings found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-neutral-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Guest</th>
                <th className="px-4 py-3 text-left font-semibold">Property</th>
                <th className="px-4 py-3 text-left font-semibold">Dates</th>
                <th className="px-4 py-3 text-center font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Payment</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bookings.map((b) => {
                const nights = b.startDate && b.endDate
                  ? Math.max(1, Math.round((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / 86400000))
                  : 0;
                const amount = nights * (b.homestayPrice ?? 0);
                const payStatus = b.payment?.status ?? null;

                return (
                  <>
                    <tr
                      key={b.id}
                      className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                      onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{b.name}</div>
                        <div className="text-xs text-neutral-400">{b.email}</div>
                        <div className="text-xs text-neutral-400">{b.phone}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 dark:text-slate-300 font-medium text-xs">{b.homestayTitle || "—"}</div>
                        <div className="text-xs text-neutral-400 truncate max-w-[160px]">{b.homestayAddress || ""}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {fmt(b.startDate)} → {fmt(b.endDate)}
                        <div className="text-neutral-400">{nights} night{nights !== 1 ? "s" : ""}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${STATUS_BADGE[b.status] || ""}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {payStatus ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${PAYMENT_BADGE[payStatus] || "bg-slate-100"}`}>
                            {payStatus}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400">No payment</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {amount > 0 ? `₹${amount.toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {expanded === b.id && (
                      <tr key={`${b.id}-detail`} className="bg-slate-50 dark:bg-slate-800">
                        <td colSpan={6} className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div><span className="font-semibold">Booking ID:</span> {b.id}</div>
                            <div><span className="font-semibold">Guests:</span> {b.guestCount}</div>
                            <div><span className="font-semibold">Created:</span> {fmt(b.createdAt)}</div>
                            {b.payment?.gateway_order_id && (
                              <div><span className="font-semibold">Order ID:</span> {b.payment.gateway_order_id}</div>
                            )}
                            {b.payment?.amount && (
                              <div><span className="font-semibold">Paid Amount:</span> ₹{b.payment.amount.toLocaleString("en-IN")}</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-neutral-500">Page {page} of {pages} ({total} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => fetchBookings({ search, status: statusFilter, page: page - 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <ChevronLeft size={14} /> Prev
            </button>
            <button disabled={page >= pages || loading} onClick={() => fetchBookings({ search, status: statusFilter, page: page + 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
