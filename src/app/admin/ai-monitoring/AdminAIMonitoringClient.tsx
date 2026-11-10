"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, Key, Layers, Database, RefreshCw, Cpu } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

interface Props {
  currentUser: any;
  initialData: any;
}

export default function AdminAIMonitoringClient({ currentUser, initialData }: Props) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);

  const refreshMonitoring = async () => {
    setLoading(true);
    const token = Cookies.get("token");
    try {
      const res = await api.get("/admin/ai-monitoring", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
      toast.success("AI monitoring data refreshed");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to refresh AI monitoring data");
    } finally {
      setLoading(false);
    }
  };

  const services = data?.services || {};
  const features = data?.features || [];
  const platform = data?.platform_data || {};

  return (
    <AdminShell
      title="AI Features & Services Monitoring"
      subtitle="Inspect external AI model connections, service availability, and real platform metrics across all 6 features."
    >
      {/* Top action row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
            Real Platform Telemetry
          </span>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={refreshMonitoring}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={14} />
          Refresh Status
        </button>
      </div>

      {/* External Service Connections */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Key className="text-purple-600" size={18} />
          External Service Integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(services).map(([key, s]: [string, any]) => (
            <div
              key={key}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{s.name}</div>
                  <div className="text-xs font-mono text-neutral-400 mt-0.5">{s.variable}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Environment: <span className="font-semibold text-slate-700 dark:text-slate-300">{s.configured ? "Key Configured" : "Not Set"}</span>
                  </div>
                  {s.validation_status && (
                    <div className="text-xs text-neutral-500 mt-0.5">
                      Validation: <span className="font-semibold text-slate-700 dark:text-slate-300">{s.validation_status}</span>
                    </div>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase shrink-0 ${
                    s.healthy
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : s.configured
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                  }`}
                >
                  {s.healthy ? (
                    <>
                      <CheckCircle2 size={13} /> {s.status || "Operational"}
                    </>
                  ) : s.configured ? (
                    <>
                      <AlertTriangle size={13} /> {s.status || "Error"}
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} /> Key Required
                    </>
                  )}
                </span>
              </div>
              {s.error_message && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                  <span className="font-bold block mb-0.5">Diagnostic Report:</span>
                  {s.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Platform Real Data Readiness */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Database className="text-teal-600" size={18} />
          Indexed Platform Data (Ground-Truth Base)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{platform.total_homestays ?? 0}</div>
            <div className="text-xs text-neutral-500 mt-1">Homestays Catalogued</div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-bold text-teal-600">{platform.verified_hosts ?? 0}</div>
            <div className="text-xs text-neutral-500 mt-1">Verified Hosts</div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-bold text-purple-600">{platform.total_reviews ?? 0}</div>
            <div className="text-xs text-neutral-500 mt-1">Genuine Reviews</div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-bold text-amber-600">{platform.rated_homestays ?? 0}</div>
            <div className="text-xs text-neutral-500 mt-1">Properties with Ratings</div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-bold text-blue-600">{platform.total_bookings ?? 0}</div>
            <div className="text-xs text-neutral-500 mt-1">Historical Bookings</div>
          </div>
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div className="text-2xl font-bold text-orange-500">{platform.total_assessments ?? 0}</div>
            <div className="text-xs text-neutral-500 mt-1">Profiles Generated</div>
          </div>
        </div>
      </div>

      {/* 6 AI Features Matrix */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <Layers className="text-orange-500" size={18} />
          AI Feature Matrix & Execution Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f: any) => (
            <div
              key={f.id}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{f.name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase shrink-0 ${
                      f.is_available
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                    }`}
                  >
                    {f.is_available ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {f.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed mb-4">{f.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="text-neutral-400">Dependency:</div>
                <div className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">{f.dependency}</div>
                <div className="mt-2 text-xs text-neutral-500 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Data Source:</span> {f.metrics}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

