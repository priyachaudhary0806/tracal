"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Brain,
  Sparkles,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Star,
  Info,
} from "lucide-react";
import api from "@/lib/api";

interface HomestayAIPanelProps {
  homestayId: string;
  homestayTitle: string;
  homestayAddress: string;
}

export default function HomestayAIPanel({
  homestayId,
  homestayTitle,
  homestayAddress,
}: HomestayAIPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"trust" | "reviews" | "reality">("trust");

  // State
  const [trustScore, setTrustScore] = useState<any>(null);
  const [trustLoading, setTrustLoading] = useState(true);

  const [reviewIntel, setReviewIntel] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [realityCheck, setRealityCheck] = useState<any>(null);
  const [realityLoading, setRealityLoading] = useState(false);

  useEffect(() => {
    // Load TrustScore immediately
    api.get(`/trustscore/${homestayId}`)
      .then((res) => setTrustScore(res.data))
      .catch((err) => {
        setTrustScore({ error: err?.response?.data?.detail || "Failed to load TrustScore." });
      })
      .finally(() => setTrustLoading(false));
  }, [homestayId]);

  useEffect(() => {
    if (activeTab === "reviews" && !reviewIntel && !reviewLoading) {
      setReviewLoading(true);
      api.get(`/review-intelligence/${homestayId}`)
        .then((res) => setReviewIntel(res.data))
        .catch((err) => {
          setReviewIntel({
            status: "error",
            message: err?.response?.data?.detail || "Failed to load AI review intelligence.",
          });
        })
        .finally(() => setReviewLoading(false));
    } else if (activeTab === "reality" && !realityCheck && !realityLoading) {
      setRealityLoading(true);
      api.get(`/reality-check/${homestayId}`)
        .then((res) => setRealityCheck(res.data))
        .catch((err) => {
          setRealityCheck({
            status: "error",
            message: err?.response?.data?.detail || "Failed to load AI reality check.",
          });
        })
        .finally(() => setRealityLoading(false));
    }
  }, [activeTab, homestayId, reviewIntel, reviewLoading, realityCheck, realityLoading]);

  const score = trustScore?.total_score ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    score >= 60 ? "text-teal-600 bg-teal-50 border-teal-200" :
    score >= 40 ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-rose-600 bg-rose-50 border-rose-200";

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles size={18} className="text-amber-300" />
          <div>
            <h3 className="font-bold text-base text-white">TRACAL AI Property Intelligence</h3>
            <p className="text-xs text-white/70">Verified TrustScore, Review Intelligence &amp; Reality Check</p>
          </div>
        </div>

        {/* Local Explorer button */}
        <button
          onClick={() => router.push(`/travel-assistant?tab=explorer`)}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition text-white"
        >
          <MapPin size={13} /> Nearby Attractions
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab("trust")}
          className={`flex items-center gap-1.5 py-2.5 px-3 rounded-t-lg transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "trust"
              ? "border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 font-bold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <ShieldCheck size={14} /> TrustScore
          {trustScore && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${scoreColor}`}>
              {trustScore.total_score}/100
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-1.5 py-2.5 px-3 rounded-t-lg transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "reviews"
              ? "border-orange-500 text-orange-600 bg-white dark:bg-slate-900 font-bold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Brain size={14} /> AI Review Intelligence
        </button>

        <button
          onClick={() => setActiveTab("reality")}
          className={`flex items-center gap-1.5 py-2.5 px-3 rounded-t-lg transition border-b-2 cursor-pointer whitespace-nowrap ${
            activeTab === "reality"
              ? "border-purple-600 text-purple-600 bg-white dark:bg-slate-900 font-bold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Sparkles size={14} /> Reality Check
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-5">
        {/* TAB 1: TRUSTSCORE */}
        {activeTab === "trust" && (
          <div>
            {trustLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-neutral-500">
                <RefreshCw size={16} className="animate-spin" /> Evaluating Property TrustScore…
              </div>
            ) : trustScore ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl font-extrabold px-3.5 py-1.5 rounded-xl border ${scoreColor}`}>
                      {trustScore.total_score}
                      <span className="text-xs font-normal text-neutral-500">/100</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {score >= 75 ? "Highly Verified & Trusted Homestay" : score >= 50 ? "Standard Verified Property" : "Developing Trust Rating"}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Evaluated across 4 strict verification pillars
                      </div>
                    </div>
                  </div>

                  <a
                    href={`/trustscore/${homestayId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-teal-600 hover:underline flex items-center gap-1"
                  >
                    Full Trust Report <ExternalLink size={12} />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {trustScore.breakdown?.map((comp: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{comp.name}</span>
                        {comp.note && <div className="text-[11px] text-neutral-500">{comp.note}</div>}
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 ml-2">
                        {comp.score}/{comp.max_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : trustScore?.error ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-rose-600" /> TrustScore Notice
                </div>
                {trustScore.error}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Unable to retrieve TrustScore.</p>
            )}
          </div>
        )}

        {/* TAB 2: AI REVIEW INTELLIGENCE */}
        {activeTab === "reviews" && (
          <div>
            {reviewLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-neutral-500">
                <RefreshCw size={16} className="animate-spin" /> Synthesizing Genuine Guest Reviews…
              </div>
            ) : reviewIntel?.status === "insufficient_reviews" ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-500" /> Insufficient Reviews for AI Synthesis
                </div>
                {reviewIntel.message}
              </div>
            ) : reviewIntel?.status === "api_key_required" ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-bold text-sm mb-1">Google Gemini API Key Required</div>
                {reviewIntel.message}
              </div>
            ) : (reviewIntel?.status === "service_unavailable" || reviewIntel?.status === "error") ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  AI Service Offline / Unavailable
                </div>
                <p className="leading-relaxed">{reviewIntel.message || "Review intelligence is temporarily unavailable."}</p>
              </div>
            ) : reviewIntel?.status === "success" ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                      AI Review Synthesis ({reviewIntel.review_count} genuine reviews)
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-200 dark:bg-orange-900/50 text-orange-900 dark:text-orange-200">
                      Sentiment: {reviewIntel.sentiment}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {reviewIntel.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {reviewIntel.positive_themes?.length > 0 && (
                    <div className="p-3 rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20">
                      <span className="font-bold text-teal-800 dark:text-teal-300 block mb-1.5">
                        Top Guest Highlights
                      </span>
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                        {reviewIntel.positive_themes.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 size={13} className="text-teal-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reviewIntel.negative_themes?.length > 0 && (
                    <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
                      <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1.5">
                        Guest Observations to Note
                      </span>
                      <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                        {reviewIntel.negative_themes.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Review Intelligence currently unavailable.</p>
            )}
          </div>
        )}

        {/* TAB 3: REALITY CHECK */}
        {activeTab === "reality" && (
          <div>
            {realityLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-sm text-neutral-500">
                <RefreshCw size={16} className="animate-spin" /> Cross-referencing Description with Guest Experiences…
              </div>
            ) : realityCheck?.status === "insufficient_reviews" ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-500" /> No Reviews Yet for Reality Comparison
                </div>
                {realityCheck.message}
              </div>
            ) : realityCheck?.status === "api_key_required" ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-bold text-sm mb-1">Google Gemini API Key Required</div>
                {realityCheck.message}
              </div>
            ) : (realityCheck?.status === "service_unavailable" || realityCheck?.status === "error") ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  Reality Check Offline / Unavailable
                </div>
                <p className="leading-relaxed">{realityCheck.message || "Reality Check is temporarily unavailable."}</p>
              </div>
            ) : realityCheck?.status === "success" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Listing vs. Guest Feedback Match
                    </span>
                    <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                      Accuracy Rating: {realityCheck.accuracy_rating}
                    </div>
                  </div>
                  <span className="text-xs text-purple-700 font-semibold bg-purple-100 px-2.5 py-1 rounded-full">
                    AI Reality Audit
                  </span>
                </div>

                {realityCheck.verified_highlights?.length > 0 && (
                  <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/30 dark:bg-teal-950/20 text-xs">
                    <span className="font-bold text-teal-800 dark:text-teal-300 block mb-1.5">
                      ✓ Advertised Features Confirmed by Real Guests
                    </span>
                    <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                      {realityCheck.verified_highlights.map((h: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 size={13} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {realityCheck.observations_and_caveats?.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Practical Observations
                    </span>
                    {realityCheck.observations_and_caveats.map((obs: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <div className="font-semibold text-slate-900 dark:text-white mb-0.5">{obs.topic}</div>
                        <div className="text-neutral-500">Advertised: {obs.advertised_claim}</div>
                        <div className="text-slate-700 dark:text-slate-300 mt-0.5 font-medium">Guest Reality: {obs.guest_reality}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Reality Check currently unavailable.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

