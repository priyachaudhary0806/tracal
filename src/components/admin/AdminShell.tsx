"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Home,
  CalendarCheck,
  ShieldCheck,
  ScrollText,
  Star,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Container from "@/components/Container";

interface AdminShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const NAV_ITEMS = [
  { href: "/admin",               icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/analytics",     icon: BarChart3,        label: "Analytics" },
  { href: "/admin/users",         icon: Users,            label: "Users" },
  { href: "/admin/homestays",     icon: Home,             label: "Homestays" },
  { href: "/admin/bookings",      icon: CalendarCheck,    label: "Bookings" },
  { href: "/admin/verifications", icon: ShieldCheck,      label: "Verifications" },
  { href: "/admin/reviews",       icon: Star,             label: "Reviews" },
  { href: "/admin/ai-monitoring", icon: Sparkles,         label: "AI Monitoring" },
  { href: "/admin/logs",          icon: ScrollText,       label: "Activity Log" },
];

const AdminShell: React.FC<AdminShellProps> = ({ children, title, subtitle }) => {
  const router  = useRouter();
  const path    = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white sticky top-20 z-10">
        <Container>
          <div className="flex items-center gap-4 py-3 overflow-x-auto">
            {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
              const active = path === href || (href !== "/admin" && path.startsWith(href));
              return (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? "bg-white/25 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              );
            })}
          </div>
        </Container>
      </div>

      {/* Page header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <Container>
          <div className="py-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{title}</h1>
              {subtitle && (
                <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {path !== "/admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
              >
                <ArrowLeft size={14} /> Dashboard
              </button>
            )}
          </div>
        </Container>
      </div>

      {/* Content */}
      <Container>
        <div className="py-8 pb-24">
          {children}
        </div>
      </Container>
    </div>
  );
};

export default AdminShell;
