"use client";

import { Lock } from "lucide-react";
import useLoginModal from "@/hooks/useLoginModal";
import useRegisterModal from "@/hooks/useRegisterModal";
import Container from "@/components/Container";

interface AuthGuardProps {
  /** Custom heading shown in the prompt. Defaults to "Login Required". */
  title?: string;
  /** Custom sub-text explaining why login is needed. */
  message?: string;
}

/**
 * Drop-in replacement for the inline "Unauthorized" text shown on protected pages.
 * Shows a friendly card with Login and Sign Up buttons that open the existing modals.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({
  title = "Login Required",
  message = "Please login or create a free account to continue.",
}) => {
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();

  return (
    <Container>
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-16">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-6 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <Lock size={28} className="text-[var(--primary)]" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h2>
            <p className="font-light text-neutral-500 mt-2">{message}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              onClick={() => loginModal.onOpen()}
              className="flex-1 py-3 bg-[var(--primary)] text-white font-semibold rounded-xl hover:opacity-90 transition cursor-pointer text-center"
            >
              Login
            </button>
            <button
              onClick={() => registerModal.onOpen()}
              className="flex-1 py-3 border-2 border-[var(--primary)] text-[var(--primary)] font-semibold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/10 transition cursor-pointer text-center"
            >
              Create Account
            </button>
          </div>

          <p className="text-xs text-neutral-400 text-center">
            It&apos;s free. No credit card required.
          </p>
        </div>
      </div>
    </Container>
  );
};

export default AuthGuard;
