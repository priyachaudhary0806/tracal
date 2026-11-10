"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const ACTION_BADGE: Record<string, string> = {
  change_role:                        "bg-purple-100 text-purple-700 dark:bg-purple-900/20",
  change_active_status:               "bg-blue-100 text-blue-700 dark:bg-blue-900/20",
  moderate_homestay_active:           "bg-green-100 text-green-700 dark:bg-green-900/20",
  moderate_homestay_deactivated:      "bg-amber-100 text-amber-700 dark:bg-amber-900/20",
  moderate_homestay_rejected:         "bg-rose-100 text-rose-600 dark:bg-rose-900/20",
};

interface Props { currentUser: any; initialData: any; }

export default function AdminLogsClient({ currentUser, initialData }: Props) {
  const [data, setData]           = useState<any>(initialData);
  const [loading, setLoading]     = useState(false);
  const [targetType, setTargetType] = useState("");
  const [page, setPage]           = useState(1);

  const fetchLogs = useCallback(async (params: { target_type?: string; page?: number }) => {
    setLoading(true);
    const token = Cookies.get("token");
    try {
      const qs = new URLSearchParams();
      if (params.target_type) qs.set("target_type", params.target_type);
      qs.set("page", String(params.page ?? 1));
      qs.set("limit", "50");
      const res = await api.get(`/admin/logs?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      setPage(params.page ?? 1);
    } catch {
      toast.error("Failed to load activity log");
    } finally {
      setLoading(false);
    }
  }, []);

  const fmt = (d: string) => d
    ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : "—";

  const logs: any[] = data?.logs ?? [];
  const total  = data?.total ?? 0;
  const pages  = data?.pages ?? 1;

  return (
    <AdminShell title="Admin Activity Log" subtitle={`${total} recorded actions`}>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <select value={targetType} onChange={(e) => { setTargetType(e.target.value); fetchLogs({ target_type: e.target.value, page: 1 }); }}
          className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-900 dark:text-white outline-none">
          <option value="">All Types</option>
          <option value="user">User</option>
          <option value="homestay">Homestay</option>
          <option value="booking">Booking</option>
          <option value="verification">Verification</option>
        </select>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-neutral-400">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
          <ScrollText size={32} className="text-slate-300 dark:text-slate-600" />
          <p className="text-neutral-500">No activity logged yet.</p>
          <p className="text-xs text-neutral-400">Actions like role changes and property moderation will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {logs.map((log) => (
            <div key={log.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-start gap-3">
              {/* Action badge */}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap self-start ${ACTION_BADGE[log.action] || "bg-slate-100 text-slate-600"}`}>
                {log.action.replace(/_/g, " ")}
              </span>

              <div className="flex-1 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500">
                  <span><span className="font-semibold text-slate-700 dark:text-slate-300">Admin:</span> {log.adminEmail}</span>
                  <span><span className="font-semibold text-slate-700 dark:text-slate-300">Target:</span> {log.targetType} {log.targetId.slice(-8)}</span>
                  <span>{fmt(log.createdAt)}</span>
                </div>

                {/* Details */}
                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {log.details.target_email && (
                      <span className="text-neutral-500">{log.details.target_email}</span>
                    )}
                    {log.details.old_role && log.details.new_role && (
                      <span className="text-purple-600 font-medium">
                        {log.details.old_role} → {log.details.new_role}
                      </span>
                    )}
                    {log.details.is_active !== undefined && (
                      <span className={log.details.is_active ? "text-green-600" : "text-rose-500"}>
                        {log.details.is_active ? "Activated" : "Deactivated"}
                      </span>
                    )}
                    {log.details.reason && (
                      <span className="text-neutral-500 italic">"{log.details.reason}"</span>
                    )}
                    {log.details.title && (
                      <span className="text-neutral-500">"{log.details.title}"</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-neutral-500">Page {page} of {pages} ({total} total)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => fetchLogs({ target_type: targetType, page: page - 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <ChevronLeft size={14} /> Prev
            </button>
            <button disabled={page >= pages || loading} onClick={() => fetchLogs({ target_type: targetType, page: page + 1 })}
              className="flex items-center gap-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-40 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
