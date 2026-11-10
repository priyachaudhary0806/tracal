"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Home, CalendarCheck, ShieldCheck, CheckCircle, XCircle,
  IndianRupee, TrendingUp, BarChart3, ScrollText, Star, Sparkles,
  ShieldAlert, Clock, AlertCircle
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import StatCard from "@/components/admin/StatCard";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

interface Props {
  currentUser: any;
  pendingVerifications: any[];
  stats: any;
}

const AdminDashboardClient: React.FC<Props> = ({
  currentUser,
  pendingVerifications: initialVerifications,
  stats,
}) => {
  const router = useRouter();
  const [verifications, setVerifications] = useState<any[]>(initialVerifications || []);
  const [loadingId, setLoadingId] = useState("");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const handleVerification = useCallback(async (id: string, action: "approved" | "rejected") => {
    if (action === "rejected") {
      const reason = (rejectReason[id] || "").trim();
      if (!reason) {
        toast.error("Please enter a rejection reason before rejecting.");
        return;
      }
    }

    setLoadingId(id);
    const token = Cookies.get("token");
    try {
      await api.patch(`/host-verification/admin/${id}`, {
        status: action,
        rejectionReason: action === "rejected" ? rejectReason[id].trim() : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Verification ${action} and host notified`);
      setVerifications((prev) => prev.filter((v) => v.id !== id));
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Action failed");
    } finally {
      setLoadingId("");
    }
  }, [rejectReason, router]);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const u = stats?.users;
  const h = stats?.homestays;
  const b = stats?.bookings;
  const p = stats?.payments;
  const r = stats?.reviews;
  const recentActivities = stats?.recent_activities || [];

  return (
    <AdminShell title="Admin Dashboard" subtitle={`Welcome back, ${currentUser.name}`}>

      {/* KPI Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Users"     value={u?.total ?? 0}      icon={Users}         color="text-blue-600"   sub={`${u?.hosts ?? 0} hosts · ${u?.guests ?? 0} guests`} />
          <StatCard label="Total Homestays" value={h?.total ?? 0}      icon={Home}          color="text-teal-600"   sub={`${h?.active ?? 0} active · ${h?.pending ?? 0} pending`} />
          <StatCard label="Total Bookings"  value={b?.total ?? 0}      icon={CalendarCheck} color="text-orange-500" sub={`${b?.approved ?? 0} approved`} />
          <StatCard label="Revenue (₹)"     value={`₹${(p?.total_revenue_inr ?? 0).toLocaleString("en-IN")}`} icon={IndianRupee} color="text-green-600" sub={`${p?.successful ?? 0} payments`} />
        </div>
      )}

      {/* Quick Nav Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 mb-10">
        {[
          { href: "/admin/analytics",     icon: BarChart3,     label: "Analytics",      desc: "Charts & platform trends",    color: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600" },
          { href: "/admin/users",         icon: Users,         label: "Users",          desc: "Account management",          color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600" },
          { href: "/admin/homestays",     icon: Home,          label: "Homestays",      desc: "Moderate property listings",  color: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-600", badge: h?.pending },
          { href: "/admin/bookings",      icon: CalendarCheck, label: "Bookings",       desc: "Reservations & payments",     color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600" },
          { href: "/admin/verifications", icon: ShieldCheck,   label: "Verifications",  desc: "Host verification queue",    color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600", badge: verifications.length },
          { href: "/admin/reviews",       icon: Star,          label: "Reviews",        desc: "Reports & moderation",        color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600", badge: r?.reported },
          { href: "/admin/ai-monitoring", icon: Sparkles,      label: "AI Monitoring",  desc: "Services & telemetry",        color: "bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-600" },
          { href: "/admin/logs",          icon: ScrollText,    label: "Activity Log",   desc: "System audit history",        color: "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600" },
        ].map(({ href, icon: Icon, label, desc, color, badge }: any) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={`relative flex flex-col gap-1 p-5 rounded-2xl border-2 text-left hover:shadow-md transition cursor-pointer ${color}`}
          >
            <Icon size={22} />
            <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">{label}</div>
            <div className="text-xs text-neutral-500">{desc}</div>
            {badge !== undefined && badge > 0 && (
              <span className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking Status Breakdown */}
      {stats?.bookings && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Booking Status Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Pending",   value: stats.bookings.pending,   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300" },
              { label: "Approved",  value: stats.bookings.approved,  color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300" },
              { label: "Cancelled", value: stats.bookings.cancelled, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
              { label: "Rejected",  value: stats.bookings.rejected,  color: "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300" },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl p-4 flex flex-col gap-1 ${color}`}>
                <div className="text-2xl font-bold">{value ?? 0}</div>
                <div className="text-xs font-semibold uppercase tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Verifications Queue */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
          Pending Host Verifications
        </h2>
        <p className="text-sm text-neutral-500 mb-5">
          {verifications.length === 0
            ? "No pending verifications — all host requests reviewed."
            : `${verifications.length} submission${verifications.length > 1 ? "s" : ""} awaiting review.`}
        </p>

        {verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl gap-2">
            <CheckCircle size={28} className="text-emerald-500" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">All clear</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {verifications.map((v) => (
              <div key={v.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{v.full_name}</div>
                    <div className="text-sm text-neutral-500 mt-0.5">
                      {fmt(v.submittedAt)} · ID: {v.id_type} · Phone: {v.phone}
                    </div>
                    <div className="text-sm text-neutral-500">{v.address}</div>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold uppercase rounded-full self-start whitespace-nowrap">
                    pending
                  </span>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Rejection reason (required if rejecting)..."
                    value={rejectReason[v.id] || ""}
                    onChange={(e) => setRejectReason((p) => ({ ...p, [v.id]: e.target.value }))}
                    className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    disabled={loadingId === v.id}
                    onClick={() => handleVerification(v.id, "approved")}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    disabled={loadingId === v.id}
                    onClick={() => handleVerification(v.id, "rejected")}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Platform Activities Audit Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ScrollText className="text-purple-600" size={18} />
            Recent Platform Activities (Audit Trail)
          </h2>
          <button
            onClick={() => router.push("/admin/logs")}
            className="text-xs font-semibold text-purple-600 hover:underline"
          >
            View all logs →
          </button>
        </div>

        {recentActivities.length === 0 ? (
          <div className="h-28 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-neutral-400 text-sm">
            No recent activity recorded yet.
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivities.map((act: any) => (
                <div key={act.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {act.adminEmail || "Admin"}
                    </span>{" "}
                    <span className="text-neutral-500">performed</span>{" "}
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold">
                      {act.action}
                    </span>{" "}
                    <span className="text-neutral-500">on {act.targetType}</span>
                    {act.details?.reason && (
                      <span className="text-xs text-neutral-400 ml-2 italic">
                        (&quot;{act.details.reason}&quot;)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 whitespace-nowrap">
                    {act.createdAt ? new Date(act.createdAt).toLocaleString("en-IN") : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </AdminShell>
  );
};

export default AdminDashboardClient;
