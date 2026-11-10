"use client";

import { Menu, LogOut, User, LayoutDashboard, Sparkles } from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";
import MenuItem from "./MenuItem";
import useRegisterModal from "@/hooks/useRegisterModal";
import useLoginModal from "@/hooks/useLoginModal";
import useRentModal from "@/hooks/useRentModal";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import type { CurrentUser } from "@/actions/getCurrentUser";

interface UserMenuProps {
  currentUser?: CurrentUser | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const role = currentUser?.role ?? null;
  const isGuest = role === "guest";
  const isHost = role === "host";
  const isAdmin = role === "admin";

  const toggleOpen = useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = useCallback(() => {
    Cookies.remove("token");
    router.push("/");
    router.refresh();
  }, [router]);

  const close = () => setIsOpen(false);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex flex-row items-center gap-2">

        {/* ── LOGGED OUT: visible Login + Sign Up ── */}
        {!currentUser && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => loginModal.onOpen()}
              className="text-sm font-semibold py-2 px-4 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-slate-800 dark:text-slate-200"
            >
              Login
            </button>
            <button
              onClick={() => registerModal.onOpen()}
              className="text-sm font-semibold py-2 px-4 rounded-full bg-[var(--primary)] text-white hover:opacity-90 transition cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        )}

        {/* ── LOGGED IN: name chip + Logout ── */}
        {currentUser && (
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-full">
              <User size={14} className="text-[var(--primary)]" />
              <span>{currentUser.name?.split(" ")[0]}</span>
              {/* Role badge */}
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ml-1 ${isAdmin ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : isHost ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                }`}>
                {role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-semibold py-2 px-4 rounded-full border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition cursor-pointer"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}

        {/* AI Travel Assistant shortcut button */}
        <button
          onClick={() => router.push("/travel-assistant")}
          className="hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-semibold py-2 px-3.5 rounded-full bg-gradient-to-r from-orange-500/10 to-teal-500/10 hover:from-orange-500/20 hover:to-teal-500/20 text-slate-800 dark:text-slate-200 border border-orange-200 dark:border-orange-800/40 transition cursor-pointer"
        >
          <Sparkles size={14} className="text-amber-500" />
          <span>AI Assistant</span>
        </button>

        {/* "Host your home" text — only for non-admins */}
        {!isAdmin && (
          <div
            onClick={() => {
              if (!currentUser) return router.push("/host");
              if (isGuest) return router.push("/host"); // guest sees onboarding
              rentModal.onOpen(); // host opens the listing modal directly
            }}
            className="hidden lg:block text-sm font-semibold py-2 px-4 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-slate-800 dark:text-slate-200 whitespace-nowrap"
          >
            Host your home
          </div>
        )}

        {/* Admin Dashboard shortcut */}
        {isAdmin && (
          <button
            onClick={() => router.push("/admin")}
            className="hidden lg:flex items-center gap-1.5 text-sm font-semibold py-2 px-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition cursor-pointer"
          >
            <LayoutDashboard size={14} />
            Admin
          </button>
        )}

        {/* Hamburger */}
        <div
          onClick={toggleOpen}
          className="p-3 md:py-1 md:px-2 border border-slate-200 dark:border-slate-700 flex flex-row items-center gap-2 rounded-full cursor-pointer hover:shadow-md transition bg-white dark:bg-slate-900"
        >
          <Menu size={18} className="text-slate-600 dark:text-slate-300" />
          <div className="h-7 w-7 rounded-full bg-slate-300 dark:bg-slate-600 overflow-hidden md:hidden">
            <svg className="h-full w-full text-slate-400 dark:text-slate-500 mt-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── DROPDOWN ── */}
      {isOpen && (
        <div className="absolute rounded-xl shadow-lg w-56 bg-white dark:bg-slate-900 overflow-hidden right-0 top-12 text-sm border border-slate-200 dark:border-slate-800 z-50">
          <div className="flex flex-col">

            {/* ── NOT LOGGED IN ── */}
            {!currentUser && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Welcome to Tracal</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Sign in to book or list a property</p>
                </div>
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Login as</span>
                </div>
                <button
                  onClick={() => { close(); loginModal.onOpen(); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                    <span className="text-base">🧳</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Traveller</div>
                    <div className="text-xs text-neutral-400">Browse &amp; book homestays</div>
                  </div>
                </button>
                <button
                  onClick={() => { close(); loginModal.onOpen(); }}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
                    <span className="text-base">🏠</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Host</div>
                    <div className="text-xs text-neutral-400">List &amp; manage your property</div>
                  </div>
                </button>
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => { close(); registerModal.onOpen(); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-[var(--primary)] font-semibold hover:bg-orange-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Create an account
                </button>
                <MenuItem onClick={() => { close(); router.push("/host"); }} label="Learn about hosting" />
              </>
            )}

            {/* ── LOGGED IN: GUEST ── */}
            {currentUser && isGuest && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                  <p className="text-xs text-neutral-400 truncate">{currentUser.email}</p>
                </div>
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Guest</span>
                </div>
                <MenuItem onClick={() => { close(); router.push("/"); }} label="Explore Homestays" />
                <MenuItem onClick={() => { close(); router.push("/reservations"); }} label="My Bookings" />
                <MenuItem onClick={() => { close(); router.push("/favorites"); }} label="Saved Homestays" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">AI Travel Assistant</span>
                </div>
                <MenuItem onClick={() => { close(); router.push("/travel-assistant"); }} label="✨ AI Travel Assistant" />
                <MenuItem onClick={() => { close(); router.push("/travel-assistant?tab=budget"); }} label="🧮 Smart Budget Planner" />
                <MenuItem onClick={() => { close(); router.push("/travel-assistant?tab=personality"); }} label="🧭 AI Travel Personality" />
                <MenuItem onClick={() => { close(); router.push("/travel-assistant?tab=explorer"); }} label="🗺️ Local Explorer" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Become a Host</span>
                </div>
                <MenuItem onClick={() => { close(); router.push("/host"); }} label="Host Your Home" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => { close(); handleLogout(); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-semibold transition cursor-pointer"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            )}

            {/* ── LOGGED IN: HOST ── */}
            {currentUser && isHost && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                  <p className="text-xs text-teal-500 truncate">Host Account</p>
                </div>
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Explore</span>
                </div>
                <MenuItem onClick={() => { close(); router.push("/"); }} label="Browse Homestays" />
                <MenuItem onClick={() => { close(); router.push("/reservations"); }} label="My Bookings" />
                <MenuItem onClick={() => { close(); router.push("/favorites"); }} label="Saved Homestays" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">Host Management</span>
                </div>
                <MenuItem onClick={() => { close(); router.push("/host"); }} label="Host Dashboard" />
                <MenuItem onClick={() => { close(); router.push("/host#ai-host-insights"); }} label="✨ AI Host Insights" />
                <MenuItem onClick={() => { close(); router.push("/properties"); }} label="My Properties" />
                <MenuItem onClick={() => { close(); router.push("/reservations"); }} label="Manage Bookings" />
                <MenuItem onClick={() => { close(); router.push("/enquiries"); }} label="Enquiry Inbox" />
                <MenuItem onClick={() => { close(); rentModal.onOpen(); }} label="List a Property" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <MenuItem onClick={() => { close(); router.push("/travel-assistant"); }} label="✨ AI Travel Assistant" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => { close(); handleLogout(); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-semibold transition cursor-pointer"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            )}

            {/* ── LOGGED IN: ADMIN ── */}
            {currentUser && isAdmin && (
              <>
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</p>
                  <p className="text-xs text-purple-500 truncate">Administrator</p>
                </div>
                <div className="px-3 pt-3 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Admin</span>
                </div>
                <MenuItem onClick={() => { close(); router.push("/admin"); }} label="Admin Dashboard" />
                <MenuItem onClick={() => { close(); router.push("/admin/ai-monitoring"); }} label="✨ AI Management" />
                <MenuItem onClick={() => { close(); router.push("/admin/users"); }} label="Manage Users" />
                <MenuItem onClick={() => { close(); router.push("/admin/verifications"); }} label="Host Verifications" />
                <MenuItem onClick={() => { close(); router.push("/admin/homestays"); }} label="Manage Homestays" />
                <MenuItem onClick={() => { close(); router.push("/admin/bookings"); }} label="Manage Bookings" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <MenuItem onClick={() => { close(); router.push("/travel-assistant"); }} label="✨ AI Travel Assistant" />
                <hr className="border-slate-100 dark:border-slate-800 my-1" />
                <button
                  onClick={() => { close(); handleLogout(); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-semibold transition cursor-pointer"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
