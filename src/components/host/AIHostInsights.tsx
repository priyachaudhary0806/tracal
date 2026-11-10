"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart2,
  RefreshCw,
  Home,
  Star,
  ExternalLink,
  ChevronRight,
  Info,
} from "lucide-react";
import api from "@/lib/api";

interface AIHostInsightsProps {
  currentUser: any;
  initialHomestayId?: string;
}

export default function AIHostInsights({ currentUser, initialHomestayId }: AIHostInsightsProps) {
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialHomestayId || "");
  const [loadingProperties, setLoadingProperties] = useState(true);

  // Data states for selected property
  const [activeTab, setActiveTab] = useState<"trust" | "reviews" | "reality" | "performance">("trust");

  const [trustData, setTrustData] = useState<any>(null);
  const [reviewIntel, setReviewIntel] = useState<any>(null);
  const [realityData, setRealityData] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Load host properties with their TrustScore
  useEffect(() => {
    if (!currentUser) return;

    setLoadingProperties(true);
    api.get("/trustscore/host/my-scores")
      .then((res) => {
        const scores = res.data?.scores || [];
        setProperties(scores);
        if (scores.length > 0 && !selectedId) {
          setSelectedId(scores[0].homestay_id);
        }
      })
      .catch((err) => {
        // Fallback: load from homestays endpoint
        api.get(`/homestays/?userId=${currentUser.id || currentUser._id}`)
          .then((r) => {
            const list = (r.data || []).map((h: any) => ({
              homestay_id: h.id || h._id,
              title: h.title,
            }));
            setProperties(list);
            if (list.length > 0 && !selectedId) setSelectedId(list[0].homestay_id);
          })
          .catch(() => {});
      })
      .finally(() => setLoadingProperties(false));
  }, [currentUser, selectedId]);

  // Load details when selected property changes
  useEffect(() => {
    if (!selectedId) return;

    setInsightsLoading(true);
    setReviewIntel(null);
    setRealityData(null);

    // Fetch TrustScore for this property
    api.get(`/trustscore/${selectedId}`)
      .then((res) => setTrustData(res.data))
      .catch((err) => {
        setTrustData({ error: err?.response?.data?.detail || "Failed to load TrustScore." });
      });

    // Fetch Host Review Intelligence
    api.get(`/review-intelligence/host/${selectedId}`)
      .then((res) => setReviewIntel(res.data))
      .catch((err) => {
        setReviewIntel({
          status: "error",
          message: err?.response?.data?.detail || "Failed to load host review insights.",
        });
      });

    // Fetch Host Reality Check
    api.get(`/reality-check/host/${selectedId}`)
      .then((res) => setRealityData(res.data))
      .catch((err) => {
        setRealityData({
          status: "error",
          message: err?.response?.data?.detail || "Failed to load host reality check.",
        });
      })
      .finally(() => setInsightsLoading(false));
  }, [selectedId]);

  const selectedProp = properties.find((p) => p.homestay_id === selectedId);

  if (loadingProperties) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2 text-neutral-500 text-sm">
        <RefreshCw size={18} className="animate-spin text-teal-600" /> Loading your properties and AI insights…
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-gradient-to-br from-teal-50 to-orange-50 dark:from-slate-900 dark:to-slate-850 border border-teal-200 dark:border-teal-800 text-center">
        <Sparkles size={36} className="text-[var(--secondary)] mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Unlock AI Host Insights</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mt-2 leading-relaxed">
          Once you list your first property, TRACAL's AI Host Insights will automatically audit your TrustScore, analyze guest reviews, and optimize your listing descriptions for free.
        </p>
      </div>
    );
  }

  const score = trustData?.total_score ?? selectedProp?.total_score ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300" :
    score >= 60 ? "text-teal-700 bg-teal-50 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300" :
    score >= 40 ? "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300" :
    "text-rose-700 bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300";

  return (
    <div id="ai-host-insights" className="mt-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
            <Sparkles size={13} className="text-amber-300" /> AI Host Insights &amp; Growth
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Smart Property Diagnostics
          </h2>
          <p className="text-white/80 text-sm mt-1 max-w-xl">
            Live TrustScore audits, genuine guest review sentiment analysis, and listing reality checks for your homestays.
          </p>
        </div>

        {/* Property Selector */}
        <div className="flex flex-col gap-1.5 min-w-[260px]">
          <label className="text-xs font-semibold text-white/80 flex items-center gap-1">
            <Home size={13} /> Select Property
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white font-semibold text-sm outline-none focus:ring-2 focus:ring-teal-400 transition"
          >
            {properties.map((p) => (
              <option key={p.homestay_id} value={p.homestay_id} className="text-slate-900">
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 pt-3 gap-3 overflow-x-auto text-sm font-semibold">
        <button
          onClick={() => setActiveTab("trust")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "trust"
              ? "border-[var(--secondary)] text-[var(--secondary)] font-bold bg-white dark:bg-slate-900 rounded-t-xl"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <ShieldCheck size={16} /> My TrustScore
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${scoreColor}`}>
            {score}/100
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "reviews"
              ? "border-orange-500 text-orange-600 font-bold bg-white dark:bg-slate-900 rounded-t-xl"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Brain size={16} /> Review Intelligence
        </button>

        <button
          onClick={() => setActiveTab("reality")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "reality"
              ? "border-purple-600 text-purple-600 font-bold bg-white dark:bg-slate-900 rounded-t-xl"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Sparkles size={16} /> Listing Reality Check
        </button>

        <button
          onClick={() => setActiveTab("performance")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 transition cursor-pointer whitespace-nowrap ${
            activeTab === "performance"
              ? "border-blue-600 text-blue-600 font-bold bg-white dark:bg-slate-900 rounded-t-xl"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <BarChart2 size={16} /> Performance Metrics
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-6 sm:p-8">
        {insightsLoading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-neutral-500">
            <RefreshCw size={18} className="animate-spin text-teal-600" /> Refreshing AI insights for {selectedProp?.title}…
          </div>
        ) : (
          <>
            {/* =============================================================== */}
            {/* TAB 1: TRUSTSCORE & IMPROVEMENT ROADMAP */}
            {/* =============================================================== */}
            {activeTab === "trust" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className={`text-4xl font-extrabold px-5 py-2.5 rounded-2xl border ${scoreColor}`}>
                      {score}
                      <span className="text-sm font-normal text-neutral-500">/100</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white">
                        {score >= 75 ? "Excellent Trust Standing" : score >= 50 ? "Good Trust Standing" : "Needs Improvement"}
                      </h4>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Higher TrustScores boost your listing rank in search and give travellers confidence to book.
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/trustscore/${selectedId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs font-bold px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap flex items-center gap-1 self-start sm:self-auto"
                  >
                    View Public Report <ExternalLink size={12} />
                  </a>
                </div>

                {/* Score Breakdown Cards */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Score Breakdown (Max 100 Points)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {trustData?.breakdown?.map((comp: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                        <div>
                          <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">{comp.name}</div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                            {comp.score} <span className="text-xs font-normal text-neutral-400">/ {comp.max_score}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {comp.note || "Standard component"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actionable Improvement Tips */}
                {selectedProp?.improvement_tips?.length > 0 && (
                  <div className="p-5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40">
                    <h4 className="font-bold text-sm text-teal-900 dark:text-teal-200 mb-3 flex items-center gap-2">
                      <Lightbulb size={18} className="text-amber-500" /> Actionable Tips to Increase Your TrustScore
                    </h4>
                    <ul className="space-y-2 text-xs sm:text-sm text-teal-800 dark:text-teal-300">
                      {selectedProp.improvement_tips.map((tip: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 size={16} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 2: AI REVIEW INTELLIGENCE FOR HOSTS */}
            {/* =============================================================== */}
            {activeTab === "reviews" && (
              <div className="space-y-6">
                {reviewIntel?.status === "insufficient_reviews" ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto">
                    <Info size={32} className="text-blue-500 mx-auto mb-2" />
                    <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">Insufficient Reviews for AI Synthesis</h4>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{reviewIntel.message}</p>
                    <p className="text-xs text-neutral-400 mt-3">Once guests complete bookings and submit reviews, AI insights will update automatically.</p>
                  </div>
                ) : reviewIntel?.status === "api_key_required" ? (
                  <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
                    <AlertTriangle size={32} className="text-amber-600 mx-auto mb-2" />
                    <h4 className="font-bold text-base text-amber-900 dark:text-amber-200">Google Gemini API Key Required</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">{reviewIntel.message}</p>
                  </div>
                ) : (reviewIntel?.status === "service_unavailable" || reviewIntel?.status === "error") ? (
                  <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center max-w-xl mx-auto">
                    <AlertTriangle size={32} className="text-amber-600 mx-auto mb-2" />
                    <h4 className="font-bold text-base text-amber-900 dark:text-amber-200">AI Service Offline / Unavailable</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">{reviewIntel.message || "Review intelligence is temporarily unavailable."}</p>
                  </div>
                ) : reviewIntel?.status === "success" ? (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                          Host Review Intelligence Summary
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-200 dark:bg-orange-900/50 text-orange-950 dark:text-orange-100">
                          Overall Sentiment: {reviewIntel.sentiment}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        {reviewIntel.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {reviewIntel.positive_themes?.length > 0 && (
                        <div className="p-5 rounded-2xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20">
                          <h5 className="font-bold text-sm text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-teal-600" /> What Guests Love Most
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                            {reviewIntel.positive_themes.map((pt: string, idx: number) => (
                              <li key={idx}>• {pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {reviewIntel.negative_themes?.length > 0 && (
                        <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
                          <h5 className="font-bold text-sm text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-amber-600" /> Guest Concerns &amp; Friction Points
                          </h5>
                          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                            {reviewIntel.negative_themes.map((nt: string, idx: number) => (
                              <li key={idx}>• {nt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {reviewIntel.host_suggestions?.length > 0 && (
                      <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20">
                        <h5 className="font-bold text-sm text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                          <Lightbulb size={16} className="text-indigo-600" /> Recommendations to Improve Guest Satisfaction
                        </h5>
                        <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                          {reviewIntel.host_suggestions.map((sug: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-bold text-indigo-600">&rarr;</span>
                              <span>{sug}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Review Intelligence currently unavailable.</p>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 3: LISTING REALITY CHECK */}
            {/* =============================================================== */}
            {activeTab === "reality" && (
              <div className="space-y-6">
                {realityData?.status === "insufficient_reviews" ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto">
                    <Info size={32} className="text-blue-500 mx-auto mb-2" />
                    <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">No Reviews to Cross-Reference</h4>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{realityData.message}</p>
                  </div>
                ) : realityData?.status === "api_key_required" ? (
                  <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
                    <AlertTriangle size={32} className="text-amber-600 mx-auto mb-2" />
                    <h4 className="font-bold text-base text-amber-900 dark:text-amber-200">Google Gemini API Key Required</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">{realityData.message}</p>
                  </div>
                ) : (realityData?.status === "service_unavailable" || realityData?.status === "error") ? (
                  <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center max-w-xl mx-auto">
                    <AlertTriangle size={32} className="text-amber-600 mx-auto mb-2" />
                    <h4 className="font-bold text-base text-amber-900 dark:text-amber-200">Reality Check Offline / Unavailable</h4>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">{realityData.message || "Reality Check is temporarily unavailable."}</p>
                  </div>
                ) : realityData?.status === "success" ? (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                          Description vs. Guest Feedback Match
                        </span>
                        <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                          Accuracy Score: {realityData.accuracy_rating}
                        </div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-200 text-purple-900">
                        Listing Audit
                      </span>
                    </div>

                    {realityData.observations_and_caveats?.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-neutral-500">
                          Potential Gaps Between Listing &amp; Guest Reality
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {realityData.observations_and_caveats.map((obs: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                              <div className="font-bold text-sm text-slate-900 dark:text-white">{obs.topic}</div>
                              <div className="text-neutral-500 mt-1">Advertised Claim: {obs.advertised_claim}</div>
                              <div className="text-amber-700 dark:text-amber-400 font-semibold mt-1">
                                Guest Feedback: {obs.guest_reality}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {realityData.advice_for_host?.length > 0 && (
                      <div className="p-5 rounded-2xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 text-xs">
                        <h5 className="font-bold text-sm text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-2">
                          <Lightbulb size={16} className="text-teal-600" /> Suggestions to Update Your Listing Description
                        </h5>
                        <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                          {realityData.advice_for_host.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-bold text-teal-600">&rarr;</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500">Reality Check currently unavailable.</p>
                )}
              </div>
            )}

            {/* =============================================================== */}
            {/* TAB 4: PROPERTY PERFORMANCE INSIGHTS */}
            {/* =============================================================== */}
            {activeTab === "performance" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-xs font-semibold text-neutral-500">Nightly Price</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      ₹{selectedProp?.price?.toLocaleString("en-IN") || "—"}
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">Configured by you</span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-xs font-semibold text-neutral-500">Total Reviews</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedProp?.review_count ?? "0"}
                    </div>
                    <span className="text-[11px] text-teal-600 mt-1 block">Verified guest reviews</span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-xs font-semibold text-neutral-500">Host Verification</span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedProp?.host_verified ? "Verified" : "Pending"}
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      {selectedProp?.host_verified ? "Identity confirmed" : "Documents required"}
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <span className="text-xs font-semibold text-neutral-500">TrustScore Tier</span>
                    <div className="text-2xl font-bold text-[var(--secondary)] mt-1">
                      {score}/100
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">Platform rating</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200">Want to edit this property?</h5>
                    <p className="text-xs text-neutral-500 mt-0.5">Update photos, pricing, amenities or descriptions in My Properties.</p>
                  </div>
                  <a
                    href="/properties"
                    className="btn-secondary text-xs font-bold px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Go to My Properties &rarr;
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

