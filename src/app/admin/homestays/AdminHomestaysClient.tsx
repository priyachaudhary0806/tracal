"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ShieldCheck, ShieldX, ExternalLink } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const MOD_BADGE: Record<string, string> = {
  active:       "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  deactivated:  "bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300",
  rejected:     "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

interface Props { currentUser: any; initialData: any; }

export default function AdminHomestaysClient({ currentUser, initialData }: Props) {
  const router  = useRouter();
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [modFilter, setModFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState("");
  const [reasonInput, setReasonInput] = useState<Record<string, string>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchHomestays = useCallback(async (params: {
    search?: string; category?: string; moderation_status?: string; page?: number;
  }) => {
    setLoading(true);
    const token = Cookies.get("token");
    try {
      const qs = new URLSearchParams();
      if (params.search)            qs.set("search", params.search);
      if (params.category)          qs.set("category", params.category);
      if (params.moderation_status) qs.set("moderation_status", params.moderation_status);
      qs.set("page", String(params.page ?? 1));
      qs.set("limit", "20");
      const res = await api.get(`/admin/homestays?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      setPage(params.page ?? 1);
    } catch {
      toast.error("Failed to load homestays");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchHomestays({ search: v, category: catFilter, moderation_status: modFilter, page: 1 }), 400);
  };

  const handleModerate = useCallback(async (
    homestayId: string,
    status: "active" | "deactivated" | "rejected",
  ) => {
    setActionId(homestayId);
    const token = Cookies.get("token");
    const reason = reasonInput[homestayId] || undefined;
    try {
      await api.patch(`/admin/homestays/${homestayId}`, {
        moderation_status: status,
        moderation_reason: reason,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Listing ${status}`);
      fetchHomestays({ search, category: catFilter, moderation_status: modFilter, page });
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Action failed");
    } finally {
      setActionId("");
    }
  }, [fetchHomestays, search, catFilter, modFilter, page, reasonInput]);

  const fmt = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  const listings: any[] = data?.homestays ?? [];
  const total  = data?.total ?? 0;
  const pages  = data?.pages ?? 1;

  return (
    <AdminShell title="Homestay Management" subtitle={`${total} listings on the platform`}>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by title, address, host name…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-purple-500"
          />
        </div>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); fetchHomestays({ search, category: e.target.value, moderation_status: modFilter, page: 1 }); }}
          className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none">
          <option value="">All Categories</option>
          <option value="beach">Beach</option>
          <option value="mountain">Mountain</option>
          <option value="city">City</option>
          <option value="village">Village</option>
        </select>
        <select value={modFilter} onChange={(e) => { setModFilter(e.target.value); fetchHomestays({ search, category: catFilter, moderation_status: e.target.value, page: 1 }); }}
          className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="h-40 flex items-center justify-center text-neutral-400">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-neutral-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
          No listings found
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((h) => {
            const modStatus = h.moderation_status || "active";
            const ownerVerified = h.owner?.host_verified;
            return (
              <div key={h.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Thumbnail */}
                  {h.images?.[0] && (
                    <img src={h.images[0]} alt={h.title} className="w-full md:w-36 h-24 object-cover rounded-xl shrink-0 bg-slate-100" />
                  )}

                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          {h.title}
                          <a href={`/homestays/${h.id}`} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-purple-600 transition">
                            <ExternalLink size={13} />
                          </a>
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">{h.address} · {h.category}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          ₹{h.price}/night · {h.guestCount} guests · {h.booking_count ?? 0} bookings
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">Listed: {fmt(h.createdAt)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${MOD_BADGE[modStatus] || MOD_BADGE.active}`}>
                          {modStatus}
                        </span>
                        {!ownerVerified && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/20">
                            <ShieldX size={10} /> Unverified Host
                          </span>
                        )}
                        {ownerVerified && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-600 dark:bg-green-900/20">
                            <ShieldCheck size={10} /> Verified Host
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Owner info */}
                    {h.owner && (
                      <div className="mt-2 text-xs text-neutral-500">
                        Host: <span className="font-semibold">{h.owner.name}</span> ({h.owner.email})
                      </div>
                    )}
                    {h.moderation_reason && (
                      <div className="mt-1 text-xs text-rose-500">Reason: {h.moderation_reason}</div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={reasonInput[h.id] || ""}
                        onChange={(e) => setReasonInput((p) => ({ ...p, [h.id]: e.target.value }))}
                        className="flex-1 p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 dark:text-white outline-none"
                      />
                      {modStatus !== "active" && (
                        <button disabled={actionId === h.id} onClick={() => handleModerate(h.id, "active")}
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 cursor-pointer">
                          Activate
                        </button>
                      )}
                      {modStatus !== "deactivated" && (
                        <button disabled={actionId === h.id} onClick={() => handleModerate(h.id, "deactivated")}
                          className="px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold disabled:opacity-50 cursor-pointer">
                          Deactivate
                        </button>
                      )}
                      {modStatus !== "rejected" && (
                        <button disabled={actionId === h.id} onClick={() => handleModerate(h.id, "rejected")}
                          className="px-3 py-1.5 text-xs bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-semibold disabled:opacity-50 cursor-pointer">
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-neutral-500">Page {page} of {pages} ({total} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => fetchHomestays({ search, category: catFilter, moderation_status: modFilter, page: page - 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <ChevronLeft size={14} /> Prev
            </button>
            <button disabled={page >= pages || loading} onClick={() => fetchHomestays({ search, category: catFilter, moderation_status: modFilter, page: page + 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
