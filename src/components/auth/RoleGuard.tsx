"use client";

import { ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";

interface RoleGuardProps {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}

/**
 * Shown when a user is authenticated but lacks the required role for a page.
 * e.g. a guest trying to access the host dashboard.
 */
const RoleGuard: React.FC<RoleGuardProps> = ({
  title = "Access Denied",
  message = "You don't have permission to view this page.",
  backHref = "/",
  backLabel = "Go to Homepage",
}) => {
  const router = useRouter();

  return (
    <Container>
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-16">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center gap-6 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
            <ShieldX size={28} className="text-rose-500" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h2>
            <p className="font-light text-neutral-500 mt-2">{message}</p>
          </div>
          <button
            onClick={() => router.push(backHref)}
            className="w-full py-3 bg-[var(--primary)] text-white font-semibold rounded-xl hover:opacity-90 transition cursor-pointer"
          >
            {backLabel}
          </button>
        </div>
      </div>
    </Container>
  );
};

export default RoleGuard;
