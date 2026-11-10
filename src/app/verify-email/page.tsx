"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import Container from "@/components/Container";
import useLoginModal from "@/hooks/useLoginModal";
import toast from "react-hot-toast";
import { CheckCircle2, AlertCircle, Clock, Mail, ArrowRight, RefreshCw } from "lucide-react";

type VerificationStatus = "loading" | "success" | "expired" | "error" | "idle";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginModal = useLoginModal();

  const token = searchParams.get("token");

  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [message, setMessage] = useState<string>("");
  const [resendEmail, setResendEmail] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!token) {
      setStatus("idle");
      setMessage("No verification token was provided. Please enter your email below to request a new verification link.");
      return;
    }

    let isMounted = true;

    api.post("/auth/verify-email", { token })
      .then((res) => {
        if (!isMounted) return;
        setStatus("success");
        setMessage(res.data?.message || "Email verified successfully! You can now log in to your account.");
        toast.success("Email verified successfully!");
      })
      .catch((err) => {
        if (!isMounted) return;
        const detail = err.response?.data?.detail || "Verification failed.";
        if (detail.toLowerCase().includes("expired")) {
          setStatus("expired");
          setMessage("Your verification link has expired (15-minute validity). Please request a fresh verification link below.");
        } else {
          setStatus("error");
          setMessage(detail);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resendEmail.trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    setIsResending(true);
    try {
      const res = await api.post("/auth/resend-verification", { email: targetEmail });
      toast.success(res.data?.message || "Verification link sent! Check your inbox.");
      setResendCooldown(60);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to resend verification link.";
      toast.error(detail);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Container>
      <div className="min-h-[75vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center transition-all">
          
          {/* Loading State */}
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Verifying your email...
              </h2>
              <p className="text-slate-500 text-sm">
                Please wait while we validate your one-time verification link.
              </p>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Email Verified!
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {message}
              </p>
              <div className="w-full mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    loginModal.onOpen();
                    router.push("/");
                  }}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all"
                >
                  Log in to Tracal
                  <ArrowRight size={18} />
                </button>
                <Link
                  href="/"
                  className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-2"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}

          {/* Expired State */}
          {status === "expired" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-full flex items-center justify-center">
                <Clock size={36} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                Verification Link Expired
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {message}
              </p>
              <form onSubmit={handleResend} className="w-full mt-4 flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResending || resendCooldown > 0}
                  className="w-full py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend available in ${resendCooldown}s`
                  ) : (
                    "Send Fresh Verification Link"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Generic Error / Invalid State */}
          {(status === "error" || status === "idle") && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-full flex items-center justify-center">
                <AlertCircle size={36} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {status === "idle" ? "Verify Your Email" : "Verification Failed"}
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {message}
              </p>
              <form onSubmit={handleResend} className="w-full mt-4 flex flex-col gap-3">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResending || resendCooldown > 0}
                  className="w-full py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend available in ${resendCooldown}s`
                  ) : (
                    "Resend Verification Email"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loginModal.onOpen();
                    router.push("/");
                  }}
                  className="w-full py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:underline"
                >
                  Already verified? Log in here
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </Container>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Container>
        <div className="min-h-[75vh] flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        </div>
      </Container>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

