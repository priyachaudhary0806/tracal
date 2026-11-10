"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Calculator,
  Compass,
  MapPin,
  ShieldCheck,
  Brain,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Home,
  Calendar,
  Users,
  IndianRupee,
  Utensils,
  Car,
  Compass as ActivityIcon,
  ExternalLink,
  History,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";

import Container from "@/components/Container";
import api from "@/lib/api";
import useLoginModal from "@/hooks/useLoginModal";

interface TravelAssistantClientProps {
  currentUser: any;
}

const TABS = [
  { id: "budget", label: "Smart Budget Planner", icon: Calculator, badge: "Free" },
  { id: "personality", label: "AI Travel Personality", icon: Compass, badge: "Interactive" },
  { id: "explorer", label: "Local Explorer", icon: MapPin, badge: "Places" },
  { id: "homestay_ai", label: "TrustScore & Review AI", icon: ShieldCheck, badge: "Properties" },
];

export default function TravelAssistantClient({ currentUser }: TravelAssistantClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginModal = useLoginModal();

  const initialTab = searchParams?.get("tab") || "budget";
  const [activeTab, setActiveTab] = useState(initialTab);

  // ---------------------------------------------------------------------------
  // 1. Budget Planner State
  // ---------------------------------------------------------------------------
  const [budgetForm, setBudgetForm] = useState({
    destination: "Goa",
    total_budget: 25000,
    travellers: 2,
    start_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    end_date: new Date(Date.now() + 11 * 86400000).toISOString().split("T")[0],
  });
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetResult, setBudgetResult] = useState<any>(null);

  const handleBudgetCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error("Please sign in to calculate your travel budget.");
      loginModal.onOpen();
      return;
    }
    if (!budgetForm.destination.trim()) return toast.error("Please enter a destination");
    if (budgetForm.total_budget <= 0) return toast.error("Total budget must be greater than 0");
    if (budgetForm.travellers <= 0) return toast.error("Number of travellers must be at least 1");
    if (budgetForm.end_date <= budgetForm.start_date) return toast.error("Check-out must be after check-in");

    setBudgetLoading(true);
    try {
      const res = await api.post("/budget-planner/calculate", budgetForm);
      setBudgetResult(res.data);
      toast.success("Budget estimation calculated successfully!");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to calculate budget.");
    } finally {
      setBudgetLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. AI Travel Personality State
  // ---------------------------------------------------------------------------
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [personalityLoading, setPersonalityLoading] = useState(false);
  const [personalityResult, setPersonalityResult] = useState<any>(null);
  const [personalityHistory, setPersonalityHistory] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === "personality") {
      api.get("/personality/questions")
        .then((res) => {
          if (res.data?.questions) setQuestions(res.data.questions);
        })
        .catch(() => { });

      if (currentUser) {
        api.get("/personality/history")
          .then((res) => {
            if (res.data?.history) setPersonalityHistory(res.data.history);
          })
          .catch(() => { });
      }
    }
  }, [activeTab, currentUser]);

  const handleSelectOption = (qid: string, key: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: key }));
  };

  const handlePersonalitySubmit = async () => {
    if (!currentUser) {
      toast.error("Please sign in to take the personality assessment.");
      loginModal.onOpen();
      return;
    }
    if (Object.keys(answers).length < questions.length) {
      return toast.error("Please answer all questions before submitting.");
    }

    setPersonalityLoading(true);
    try {
      const res = await api.post("/personality/assess", { answers });
      setPersonalityResult(res.data);
      toast.success("Travel Personality discovered!");
      // Refresh history
      api.get("/personality/history").then((r) => setPersonalityHistory(r.data?.history || []));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to compute travel personality.");
    } finally {
      setPersonalityLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Local Explorer State
  // ---------------------------------------------------------------------------
  const [explorerDest, setExplorerDest] = useState("Manali, Himachal Pradesh");
  const [explorerCategory, setExplorerCategory] = useState("attractions");
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerResult, setExplorerResult] = useState<any>(null);

  const handleExplorerSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      toast.error("Please sign in to use Local Explorer.");
      loginModal.onOpen();
      return;
    }
    if (!explorerDest.trim()) return toast.error("Please enter a destination");

    setExplorerLoading(true);
    try {
      const res = await api.get(`/local-explorer/nearby?destination=${encodeURIComponent(explorerDest)}&category=${explorerCategory}`);
      setExplorerResult(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to search local spots.");
    } finally {
      setExplorerLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-orange-600 via-amber-600 to-teal-700 text-white rounded-3xl mx-4 sm:mx-8 p-8 md:p-12 shadow-xl mb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={14} className="text-amber-200" />
            TRACAL AI Travel Assistant
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Smart, Honest &amp; Free Travel Intelligence
          </h1>
          <p className="text-white/90 text-base sm:text-lg leading-relaxed">
            Plan budgets tailored to genuine homestays, discover your travel personality archetype, and explore real local attractions — with zero subscription locks.
          </p>
        </div>

        {/* Tab Navigation Chips */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-8">
          {TABS.map(({ id, label, icon: Icon, badge }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer ${active
                  ? "bg-white text-slate-900 shadow-md font-bold"
                  : "bg-white/15 text-white hover:bg-white/25"
                  }`}
              >
                <Icon size={16} />
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${active ? "bg-orange-100 text-orange-700" : "bg-black/20 text-white"}`}>
                  {badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Container>
        {/* =================================================================== */}
        {/* TAB 1: SMART TRIP BUDGET PLANNER */}
        {/* =================================================================== */}
        {activeTab === "budget" && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-[var(--primary)] flex items-center justify-center font-bold">
                  <Calculator size={22} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Smart Trip Budget Planner
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Calculates complete trip estimates using actual TRACAL homestay pricing, food averages (₹500/day) and local transit (₹300/day).
                  </p>
                </div>
              </div>

              <form onSubmit={handleBudgetCalculate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <MapPin size={13} /> Destination
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Goa, Manali, Jaipur"
                    value={budgetForm.destination}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, destination: e.target.value }))}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-sm outline-none focus:border-[var(--primary)] dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <IndianRupee size={13} /> Total Budget (₹)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    required
                    value={budgetForm.total_budget}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, total_budget: Number(e.target.value) }))}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-sm outline-none focus:border-[var(--primary)] dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Users size={13} /> Travellers
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={budgetForm.travellers}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, travellers: Number(e.target.value) }))}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-sm outline-none focus:border-[var(--primary)] dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar size={13} /> Check-In
                  </label>
                  <input
                    type="date"
                    required
                    value={budgetForm.start_date}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, start_date: e.target.value }))}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-sm outline-none focus:border-[var(--primary)] dark:text-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Calendar size={13} /> Check-Out
                  </label>
                  <input
                    type="date"
                    required
                    value={budgetForm.end_date}
                    onChange={(e) => setBudgetForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-sm outline-none focus:border-[var(--primary)] dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-5 flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={budgetLoading}
                    className="btn-primary px-8 py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {budgetLoading ? <RefreshCw className="animate-spin" size={16} /> : <Calculator size={16} />}
                    {budgetLoading ? "Analyzing Homestays…" : "Calculate Smart Trip Budget"}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Presentation */}
            {budgetResult && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                      Trip Estimation Summary
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                      {budgetResult.destination} ({budgetResult.nights} night{budgetResult.nights !== 1 ? "s" : ""} · {budgetResult.travellers} traveller{budgetResult.travellers !== 1 ? "s" : ""})
                    </h3>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-neutral-500">Total Estimated Trip Cost</div>
                    <div className="text-3xl font-extrabold text-[var(--secondary)]">
                      ₹{budgetResult.total_estimated?.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Shortfall or Success Alert */}
                {budgetResult.shortfall ? (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
                    <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-rose-800 dark:text-rose-300">Budget Shortfall of ₹{budgetResult.shortfall?.toLocaleString("en-IN")}</h4>
                      <p className="text-sm text-rose-700 dark:text-rose-400 mt-0.5">{budgetResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 flex items-start gap-3">
                    <CheckCircle2 className="text-teal-600 shrink-0 mt-0.5" size={20} />
                    <div>
                      <h4 className="font-bold text-teal-800 dark:text-teal-300">Budget Fits Perfectly!</h4>
                      <p className="text-sm text-teal-700 dark:text-teal-400 mt-0.5">{budgetResult.message}</p>
                    </div>
                  </div>
                )}

                {/* 4 Cost Components Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <Home size={16} className="text-teal-600" /> Accommodation
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{budgetResult.accommodation?.estimate?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                      {budgetResult.accommodation?.details}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <Utensils size={16} className="text-amber-600" /> Food &amp; Dining
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{budgetResult.food?.estimate?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                      {budgetResult.food?.details}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <Car size={16} className="text-blue-600" /> Local Transit
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{budgetResult.transport?.estimate?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                      {budgetResult.transport?.details}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        <ActivityIcon size={16} className="text-purple-600" /> Activities &amp; Flex
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        ₹{budgetResult.activities?.estimate?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                      {budgetResult.activities?.details}
                    </div>
                  </div>
                </div>

                {/* Recommended Homestay */}
                {budgetResult.recommended_homestay && (
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Star size={18} className="text-amber-500 fill-amber-500" /> Best Matched Homestay for this Budget
                    </h4>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20">
                      <div>
                        <div className="font-extrabold text-lg text-slate-900 dark:text-white">
                          {budgetResult.recommended_homestay.title}
                        </div>
                        <div className="text-sm text-neutral-500 mt-0.5">
                          {budgetResult.recommended_homestay.address}
                        </div>
                        <div className="text-sm font-bold text-[var(--secondary)] mt-1">
                          ₹{budgetResult.recommended_homestay.price?.toLocaleString("en-IN")} / night
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/homestays/${budgetResult.recommended_homestay.id}`)}
                        className="btn-primary px-6 py-2.5 text-sm font-bold rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        View Homestay &amp; Book
                      </button>
                    </div>
                  </div>
                )}

                {/* Alternative suggestions */}
                {budgetResult.suggestions && budgetResult.suggestions.length > 0 && (
                  <div className="mt-6">
                    <h5 className="text-sm font-bold uppercase tracking-wider text-neutral-500 mb-3">
                      More Affordable Alternatives in Destination
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {budgetResult.suggestions.map((alt: any) => (
                        <div
                          key={alt.id}
                          onClick={() => router.push(`/homestays/${alt.id}`)}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--primary)] transition cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{alt.title}</div>
                            <div className="text-xs text-neutral-400 truncate mt-0.5">{alt.address}</div>
                          </div>
                          <div className="text-xs font-bold text-[var(--primary)] mt-3">
                            ₹{alt.price_per_night?.toLocaleString("en-IN")} / night
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: AI TRAVEL PERSONALITY */}
        {/* =================================================================== */}
        {activeTab === "personality" && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-[var(--secondary)] flex items-center justify-center font-bold">
                  <Compass size={22} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Discover Your AI Travel Personality
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Take our 5-question lifestyle quiz to reveal your travel archetype, custom motto, and ideal Indian homestays.
                  </p>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--secondary)] text-white text-xs flex items-center justify-center font-extrabold">
                        {idx + 1}
                      </span>
                      {q.question}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt: any) => {
                        const selected = answers[q.id] === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectOption(q.id, opt.key)}
                            className={`p-3.5 rounded-xl text-left border-2 text-sm transition cursor-pointer flex items-center gap-3 ${selected
                              ? "border-[var(--primary)] bg-orange-50 dark:bg-orange-950/30 text-slate-900 dark:text-white font-semibold"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900"
                              }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${selected ? "bg-[var(--primary)] text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                              {opt.key}
                            </span>
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handlePersonalitySubmit}
                  disabled={personalityLoading}
                  className="btn-secondary px-8 py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {personalityLoading ? <RefreshCw className="animate-spin" size={16} /> : <Brain size={16} />}
                  {personalityLoading ? "Synthesizing Persona…" : "Analyze My Travel Personality"}
                </button>
              </div>
            </div>

            {/* Assessment Result Display */}
            {personalityResult && (
              <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 text-white border border-teal-800/40 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-teal-800/40">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                      Your Official TRACAL Archetype
                    </span>
                    <h3 className="text-3xl font-extrabold text-white mt-1">
                      {personalityResult.personality_type}
                    </h3>
                    <p className="text-white/80 text-sm mt-1">{personalityResult.tagline}</p>
                  </div>
                  <div className="bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-sm self-start sm:self-center">
                    <span className="text-xs text-white/70">Motto:</span>
                    <div className="font-semibold text-sm italic text-amber-200">
                      "{personalityResult.travel_motto}"
                    </div>
                  </div>
                </div>

                {/* Traits */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Signature Behavioral Traits</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {personalityResult.traits?.map((trait: string, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white/90 leading-relaxed flex items-start gap-2">
                        <CheckCircle2 size={16} className="text-teal-400 shrink-0 mt-0.5" />
                        <span>{trait}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-teal-800/40">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Recommended Destinations</h4>
                    <div className="flex flex-wrap gap-2">
                      {personalityResult.recommended_destinations?.map((dest: string, idx: number) => (
                        <span key={idx} className="bg-teal-500/20 text-teal-200 border border-teal-400/30 text-xs font-semibold px-3 py-1.5 rounded-full">
                          📍 {dest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">Recommended Homestay Styles</h4>
                    <div className="flex flex-wrap gap-2">
                      {personalityResult.recommended_homestay_styles?.map((style: string, idx: number) => (
                        <span key={idx} className="bg-orange-500/20 text-orange-200 border border-orange-400/30 text-xs font-semibold px-3 py-1.5 rounded-full">
                          🏡 {style}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Past History */}
            {personalityHistory.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <History size={18} className="text-neutral-500" /> Saved Travel Profiles
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personalityHistory.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.result?.personality_type}
                      </div>
                      <div className="text-xs text-neutral-500 italic mt-1">
                        "{item.result?.travel_motto}"
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                        Assessed on: {new Date(item.created_at || item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: LOCAL EXPLORER */}
        {/* =================================================================== */}
        {activeTab === "explorer" && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center font-bold">
                  <MapPin size={22} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Local Explorer
                  </h2>
                  <p className="text-sm text-neutral-500">
                    Discover attractions, dining, cafes, hospitals, ATMs, and shopping around destinations via live OpenStreetMap integration.
                  </p>
                </div>
              </div>

              <form onSubmit={handleExplorerSearch} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="Enter city or destination (e.g. Manali, Goa, Jaipur)..."
                  value={explorerDest}
                  onChange={(e) => setExplorerDest(e.target.value)}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-sm outline-none focus:border-[var(--primary)] dark:text-white flex-1"
                />

                <select
                  value={explorerCategory}
                  onChange={(e) => setExplorerCategory(e.target.value)}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-sm outline-none focus:border-[var(--primary)] dark:text-white"
                >
                  <option value="attractions">Tourist Attractions &amp; Sights</option>
                  <option value="restaurants">Restaurants &amp; Dining</option>
                  <option value="cafes">Cafes &amp; Bakeries</option>
                  <option value="hospitals">Hospitals &amp; Medical</option>
                  <option value="atms">ATMs &amp; Banking</option>
                  <option value="shopping">Shopping Locations &amp; Markets</option>
                </select>

                <button
                  type="submit"
                  disabled={explorerLoading}
                  className="btn-primary px-8 py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {explorerLoading ? <RefreshCw className="animate-spin" size={16} /> : <MapPin size={16} />}
                  {explorerLoading ? "Searching Places…" : "Explore Local Spots"}
                </button>
              </form>
            </div>

            {/* Results or Service Notice */}
            {explorerResult && (
              <div className="space-y-4">
                {explorerResult.status === "no_match" || explorerResult.status === "empty" ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl mx-auto">
                    <MapPin size={32} className="text-purple-600 mx-auto mb-2" />
                    <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">No Places Found</h4>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{explorerResult.message}</p>
                  </div>
                ) : explorerResult.places && explorerResult.places.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3 text-xs text-neutral-500">
                      <span>Found {explorerResult.places.length} verified places around <strong>{explorerResult.destination}</strong></span>
                      <span className="font-mono bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                        OpenStreetMap Live
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {explorerResult.places.map((place: any, idx: number) => (
                        <div key={idx} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-base text-slate-800 dark:text-slate-200 leading-snug">{place.name}</h4>
                              {place.distance && (
                                <span className="flex items-center gap-1 text-xs font-bold bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full shrink-0">
                                  {place.distance}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-2 line-clamp-2">{place.address}</p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md">
                              {place.category || "Point of Interest"}
                            </span>
                            <div className="flex items-center gap-2">
                              <a
                                href={place.maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                              >
                                View Map <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <p className="text-sm text-neutral-500">No places found matching your destination and category.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: TRUSTSCORE & REVIEW INTELLIGENCE GUIDE */}
        {/* =================================================================== */}
        {activeTab === "homestay_ai" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 text-[var(--secondary)] flex items-center justify-center font-bold mb-4">
                    <ShieldCheck size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Property TrustScore</h3>
                  <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                    A strictly verified 100-point rating calculated directly from admin-checked host ID documents, genuine guest review averages, and listing completeness.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-teal-600">✓ Displayed on every homestay listing</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-[var(--primary)] flex items-center justify-center font-bold mb-4">
                    <Brain size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">AI Review Intelligence</h3>
                  <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                    Synthesizes authentic reviews into concise summaries, highlighting common praise and concerns while always citing original review counts.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-[var(--primary)]">✓ Never synthesizes fake reviews</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold mb-4">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Reality Check</h3>
                  <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                    Compares marketing claims in the description with real guest observations to point out verified highlights and practical caveats.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-indigo-600">✓ Protects travellers from mismatched expectations</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-r from-orange-50 to-teal-50 dark:from-slate-900 dark:to-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200">Experience These Features on Any Homestay</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-xl">
                  Visit any homestay page to view its live TrustScore, AI Review Intelligence summary, and Reality Check audit card.
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="btn-primary px-8 py-3 text-sm font-bold rounded-xl cursor-pointer whitespace-nowrap"
              >
                Browse All Homestays
              </button>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

