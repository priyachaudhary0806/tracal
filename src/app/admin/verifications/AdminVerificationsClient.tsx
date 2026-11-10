"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, FileText, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
};

export default function AdminVerificationsClient({ currentUser, initialVerifications }: any) {
  const router = useRouter();
  const [verifications, setVerifications] = useState<any[]>(initialVerifications || []);
  const [loadingId, setLoadingId] = useState("");
  const [viewingDoc, setViewingDoc] = useState<{ id: string; type: string } | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<string>("all");

  const openDocument = async (id: string, docType: "id_document" | "ownership_proof") => {
    const token = Cookies.get("token");
    setViewingDoc({ id, type: docType });
    try {
      const res = await api.get(`/admin/verifications/${id}/document/${docType}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const fileBlob = new Blob([res.data], { type: res.headers["content-type"] || "application/octet-stream" });
      const fileURL = URL.createObjectURL(fileBlob);
      window.open(fileURL, "_blank");
    } catch (err: any) {
      toast.error("Failed to load document securely. Ensure you are authorized.");
    } finally {
      setViewingDoc(null);
    }
  };

  const handleAction = useCallback(async (id: string, action: "approved" | "rejected") => {
    if (action === "rejected") {
      const reason = (reasons[id] || "").trim();
      if (!reason) {
        toast.error("Please enter a specific rejection reason before rejecting.");
        return;
      }
    }

    setLoadingId(id);
    const token = Cookies.get("token");
    try {
      await api.patch(`/host-verification/admin/${id}`, {
        status: action,
        rejectionReason: action === "rejected" ? reasons[id].trim() : null,
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success(`Verification ${action} and host notified`);
      setVerifications((prev) =>
        prev.map((v) => v.id === id ? { ...v, status: action, rejectionReason: reasons[id] } : v)
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Action failed");
    } finally {
      setLoadingId("");
    }
  }, [reasons, router]);

  const filtered = filter === "all" ? verifications : verifications.filter((v) => v.status === filter);

  return (
    <AdminShell
      title="Host Verification Management"
      subtitle="Review host credentials, inspect submitted documents securely, and moderate verification status."
    >
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {["all", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              filter === s
                ? "bg-purple-700 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} (
            {s === "all" ? verifications.length : verifications.filter((v) => v.status === s).length}
            )
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <ShieldCheck className="text-slate-300 dark:text-slate-700 mb-2" size={36} />
          <p className="text-neutral-500 font-medium">No verification requests found in this view.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{v.full_name}</span>
                    <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full ${STATUS_BADGE[v.status] || ""}`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">
                    Submitted: {new Date(v.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" · "}ID Type: <span className="font-medium text-slate-700 dark:text-slate-300">{v.id_type}</span>
                    {" · "}Phone: <span className="font-medium text-slate-700 dark:text-slate-300">{v.phone}</span>
                  </div>
                  <div className="text-sm text-neutral-500 mt-1">
                    Registered Address: <span className="text-slate-700 dark:text-slate-300">{v.address}</span>
                  </div>
                  {v.rejectionReason && (
                    <div className="text-sm text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                      <AlertCircle size={15} />
                      <span>Rejection reason: {v.rejectionReason}</span>
                    </div>
                  )}
                </div>

                {/* Secure Document Access Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openDocument(v.id, "id_document")}
                    disabled={viewingDoc?.id === v.id && viewingDoc?.type === "id_document"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 text-xs font-semibold transition cursor-pointer"
                  >
                    <FileText size={14} />
                    {viewingDoc?.id === v.id && viewingDoc?.type === "id_document" ? "Opening..." : "View ID Document"}
                    <ExternalLink size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDocument(v.id, "ownership_proof")}
                    disabled={viewingDoc?.id === v.id && viewingDoc?.type === "ownership_proof"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 text-xs font-semibold transition cursor-pointer"
                  >
                    <FileText size={14} />
                    {viewingDoc?.id === v.id && viewingDoc?.type === "ownership_proof" ? "Opening..." : "View Ownership Proof"}
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>

              {/* Action Buttons for Pending Verifications */}
              {v.status === "pending" && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter rejection reason (required if rejecting)..."
                    value={reasons[v.id] || ""}
                    onChange={(e) => setReasons((p) => ({ ...p, [v.id]: e.target.value }))}
                    className="flex-1 p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    disabled={loadingId === v.id}
                    onClick={() => handleAction(v.id, "approved")}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <CheckCircle size={15} /> Approve Host
                  </button>
                  <button
                    disabled={loadingId === v.id}
                    onClick={() => handleAction(v.id, "rejected")}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
