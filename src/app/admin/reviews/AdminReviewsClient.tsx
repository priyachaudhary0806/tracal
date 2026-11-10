"use client";

import { useState } from "react";
import { Star, ShieldAlert, Eye, EyeOff, Search, AlertCircle, RefreshCw } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

interface Props {
  currentUser: any;
  initialData: any;
}

export default function AdminReviewsClient({ currentUser, initialData }: Props) {
  const [reviews, setReviews] = useState<any[]>(initialData?.reviews || []);
  const [total, setTotal] = useState<number>(initialData?.total || 0);
  const [page, setPage] = useState<number>(initialData?.page || 1);
  const [pages, setPages] = useState<number>(initialData?.pages || 1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "reported" | "hidden">("all");
  const [loading, setLoading] = useState(false);
  const [modifyingId, setModifyingId] = useState<string | null>(null);

  const fetchReviews = async (newPage = 1, currentFilter = filter, currentSearch = search) => {
    setLoading(true);
    const token = Cookies.get("token");
    try {
      const params = new URLSearchParams();
      params.append("page", newPage.toString());
      params.append("limit", "20");
      if (currentFilter === "reported") params.append("reported_only", "true");
      if (currentFilter === "hidden") params.append("hidden_only", "true");
      if (currentSearch.trim()) params.append("search", currentSearch.trim());

      const res = await api.get(`/admin/reviews?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviews(res.data.reviews || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHide = async (id: string, currentHidden: boolean) => {
    setModifyingId(id);
    const token = Cookies.get("token");
    const targetState = !currentHidden;
    try {
      await api.patch(
        `/admin/reviews/${id}`,
        {
          is_hidden: targetState,
          moderation_reason: targetState ? "Hidden by administrator for inappropriate content" : "Restored by administrator",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(targetState ? "Review hidden from public view" : "Review restored");
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_hidden: targetState } : r))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update review status");
    } finally {
      setModifyingId(null);
    }
  };

  const onFilterChange = (f: "all" | "reported" | "hidden") => {
    setFilter(f);
    fetchReviews(1, f, search);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews(1, filter, search);
  };

  return (
    <AdminShell
      title="Reviews & Reports Moderation"
      subtitle="Inspect guest feedback, investigate reported reviews, and hide inappropriate comments."
    >
      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {[
            { key: "all", label: "All Reviews" },
            { key: "reported", label: "Reported Reviews" },
            { key: "hidden", label: "Hidden Reviews" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onFilterChange(key as any)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                filter === key
                  ? "bg-purple-700 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={onSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search in comments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-sm font-medium hover:bg-slate-900 transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Review List */}
      {loading ? (
        <div className="h-48 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="animate-spin text-purple-600" size={28} />
        </div>
      ) : reviews.length === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <Star className="text-slate-300 dark:text-slate-700 mb-2" size={36} />
          <p className="text-neutral-500 font-medium">No reviews found matching the selected filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`p-6 rounded-2xl border bg-white dark:bg-slate-900 transition ${
                r.is_reported
                  ? "border-rose-300 dark:border-rose-900/60 shadow-sm shadow-rose-500/5"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={16}
                        className={idx < (r.rating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {r.authorName || "Guest"}
                  </span>
                  <span className="text-xs text-neutral-400">
                    on <strong className="text-slate-600 dark:text-slate-300">{r.homestayTitle || "Homestay"}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {r.is_reported && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 flex items-center gap-1">
                      <ShieldAlert size={12} /> Reported
                    </span>
                  )}
                  {r.is_hidden && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Hidden
                    </span>
                  )}
                </div>
              </div>

              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
                &ldquo;{r.comment || "No written comment"}&rdquo;
              </p>

              {/* Reported details banner */}
              {r.is_reported && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2">
                  <AlertCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-rose-900 dark:text-rose-200">
                    <span className="font-semibold">Report Reason:</span> {r.report_reason || "Reported as inappropriate"}
                    {r.reported_at && (
                      <span className="text-neutral-500 ml-2">
                        ({new Date(r.reported_at).toLocaleDateString("en-IN")})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Moderation Controls */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  Date: {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "Unknown"}
                </span>

                <button
                  type="button"
                  disabled={modifyingId === r.id}
                  onClick={() => handleToggleHide(r.id, Boolean(r.is_hidden))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    r.is_hidden
                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                  }`}
                >
                  {r.is_hidden ? (
                    <>
                      <Eye size={14} /> Restore Review
                    </>
                  ) : (
                    <>
                      <EyeOff size={14} /> Hide Review
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={page <= 1}
            onClick={() => fetchReviews(page - 1)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-500">
            Page {page} of {pages} ({total} reviews)
          </span>
          <button
            disabled={page >= pages}
            onClick={() => fetchReviews(page + 1)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </AdminShell>
  );
}

