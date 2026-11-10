"use client";

import { useState, useCallback } from "react";
import {
  Users, Home, CalendarCheck, IndianRupee, Star,
  TrendingUp, Tag, ShieldCheck,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import StatCard from "@/components/admin/StatCard";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const PERIODS = [
  { key: "7d",  label: "7 Days"  },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "all", label: "All Time" },
];

interface Props {
  currentUser: any;
  initialStats: any;
  initialPeriod: string;
}

export default function AnalyticsClient({ currentUser, initialStats, initialPeriod }: Props) {
  const [stats, setStats]   = useState<any>(initialStats);
  const [period, setPeriod] = useState(initialPeriod);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async (p: string) => {
    setLoading(true);
    const token = Cookies.get("token");
    try {
      const res = await api.get(`/admin/analytics?period=${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
      setPeriod(p);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  const u = stats?.users;
  const h = stats?.homestays;
  const b = stats?.bookings;
  const p = stats?.payments;
  const c = stats?.coupons;
  const v = stats?.verifications;
  const r = stats?.reviews;

  return (
    <AdminShell title="Platform Analytics" subtitle="Real-time platform statistics">

      {/* Period selector */}
      <div className="flex gap-2 mb-8">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => fetchStats(key)}
            disabled={loading}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
              period === key
                ? "bg-purple-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
        {loading && <span className="text-sm text-neutral-400 self-center ml-2">Loading…</span>}
      </div>

      {!stats ? (
        <div className="h-40 flex items-center justify-center text-neutral-400">No data available</div>
      ) : (
        <>
          {/* Users */}
          <Section title="Users" icon={<Users size={16} className="text-blue-600" />}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Users"       value={u?.total}         icon={Users} color="text-blue-600" />
              <StatCard label="Guests"            value={u?.guests}        icon={Users} color="text-blue-400" />
              <StatCard label="Hosts"             value={u?.hosts}         icon={Home}  color="text-teal-600" />
              <StatCard label="Verified Hosts"    value={u?.verified_hosts} icon={ShieldCheck} color="text-green-600" />
              <StatCard label="New in Period"     value={u?.new_in_period} icon={TrendingUp} color="text-purple-600" />
            </div>
          </Section>

          {/* Homestays */}
          <Section title="Homestays" icon={<Home size={16} className="text-teal-600" />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Listings"   value={h?.total}         icon={Home} color="text-teal-600" />
              <StatCard label="Active"           value={h?.active}        icon={Home} color="text-green-600" />
              <StatCard label="Deactivated"      value={h?.deactivated}   icon={Home} color="text-rose-500" />
              <StatCard label="New in Period"    value={h?.new_in_period} icon={TrendingUp} color="text-purple-600" />
            </div>

            {/* Category breakdown */}
            {h?.by_category?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">By Category</p>
                <div className="flex flex-wrap gap-2">
                  {h.by_category.map((c: any) => (
                    <span key={c.category} className="px-3 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-full text-sm font-medium">
                      {c.category}: {c.count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Popular destinations */}
            {h?.popular_destinations?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Popular Destinations</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {h.popular_destinations.map((d: any, i: number) => (
                    <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">{d.address}</div>
                      <div className="text-neutral-400 text-xs">{d.count} listing{d.count !== 1 ? "s" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Bookings */}
          <Section title="Bookings" icon={<CalendarCheck size={16} className="text-orange-500" />}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total"     value={b?.total}     icon={CalendarCheck} color="text-orange-500" />
              <StatCard label="Pending"   value={b?.pending}   icon={CalendarCheck} color="text-amber-500" />
              <StatCard label="Approved"  value={b?.approved}  icon={CalendarCheck} color="text-green-600" />
              <StatCard label="Cancelled" value={b?.cancelled} icon={CalendarCheck} color="text-slate-500" />
              <StatCard label="Rejected"  value={b?.rejected}  icon={CalendarCheck} color="text-rose-500" />
            </div>
          </Section>

          {/* Payments */}
          <Section title="Payments" icon={<IndianRupee size={16} className="text-green-600" />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Payments"  value={p?.total}       icon={IndianRupee} color="text-slate-600" />
              <StatCard label="Successful"      value={p?.successful}  icon={IndianRupee} color="text-green-600" />
              <StatCard label="Failed"          value={p?.failed}      icon={IndianRupee} color="text-rose-500" />
              <StatCard label="Revenue (INR)"   value={`₹${(p?.total_revenue_inr ?? 0).toLocaleString("en-IN")}`} icon={IndianRupee} color="text-green-700" />
            </div>
          </Section>

          {/* Coupons */}
          <Section title="Coupons" icon={<Tag size={16} className="text-indigo-600" />}>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Total Coupons" value={c?.total}      icon={Tag} color="text-indigo-600" />
              <StatCard label="Active"        value={c?.active}     icon={Tag} color="text-green-600" />
              <StatCard label="Total Uses"    value={c?.total_uses} icon={TrendingUp} color="text-purple-600" />
            </div>
          </Section>

          {/* Host Verifications */}
          <Section title="Host Verifications" icon={<ShieldCheck size={16} className="text-purple-600" />}>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Pending"  value={v?.pending}  icon={ShieldCheck} color="text-amber-500" />
              <StatCard label="Approved" value={v?.approved} icon={ShieldCheck} color="text-green-600" />
              <StatCard label="Rejected" value={v?.rejected} icon={ShieldCheck} color="text-rose-500" />
            </div>
          </Section>

          {/* Reviews */}
          <Section title="Reviews" icon={<Star size={16} className="text-yellow-500" />}>
            <div className="grid grid-cols-2 gap-4 max-w-xs">
              <StatCard label="Total Reviews" value={r?.total} icon={Star} color="text-yellow-500" />
            </div>
          </Section>

          {/* Time-series charts — simple bar representation */}
          {stats?.charts?.registrations_last_30d?.length > 0 && (
            <Section title="Registrations — Last 30 Days" icon={<Users size={16} className="text-blue-600" />}>
              <SimpleBarChart data={stats.charts.registrations_last_30d} />
            </Section>
          )}

          {stats?.charts?.bookings_last_30d?.length > 0 && (
            <Section title="Bookings — Last 30 Days" icon={<CalendarCheck size={16} className="text-orange-500" />}>
              <SimpleBarChart data={stats.charts.bookings_last_30d} color="bg-orange-400" />
            </Section>
          )}
        </>
      )}
    </AdminShell>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-base font-bold text-slate-700 dark:text-slate-300">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SimpleBarChart({ data, color = "bg-purple-500" }: { data: { date: string; count: number }[]; color?: string }) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-28 overflow-x-auto pb-1">
      {data.map(({ date, count }) => {
        const height = Math.max(4, (count / maxVal) * 100);
        return (
          <div key={date} className="flex flex-col items-center gap-1 min-w-[28px] group">
            <div className="relative w-full">
              <div
                className={`${color} rounded-sm w-full transition-all`}
                style={{ height: `${height}px` }}
              />
              {/* Tooltip */}
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                {count}
              </div>
            </div>
            <span className="text-[9px] text-neutral-400 rotate-45 origin-left">{date.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}
