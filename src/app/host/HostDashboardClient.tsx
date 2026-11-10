"use client";

import { useRouter } from "next/navigation";
import {
  Home,
  CalendarCheck,
  MessageSquare,
  PlusCircle,
  TrendingUp,
  Shield,
  IndianRupee,
  Users,
  Sparkles,
} from "lucide-react";
import Container from "@/components/Container";
import useRentModal from "@/hooks/useRentModal";
import useLoginModal from "@/hooks/useLoginModal";
import { useState } from "react";
import AvailabilityCalendar from '@/components/host/AvailabilityCalendar';
import AIHostInsights from '@/components/host/AIHostInsights';

interface HostDashboardClientProps {
  currentUser: any;
}

const QUICK_LINKS = [
  {
    href: "/properties",
    icon: Home,
    label: "My Properties",
    description: "View, edit and manage all your listed homestays.",
    color: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
    iconColor: "text-teal-600",
  },
  {
    href: "#ai-host-insights",
    icon: Sparkles,
    label: "AI Host Insights",
    description: "Audit TrustScore, analyze guest reviews & reality check.",
    color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    iconColor: "text-[var(--primary)]",
  },
  {
    href: "/reservations",
    icon: CalendarCheck,
    label: "Bookings",
    description: "Track upcoming, past and pending bookings.",
    color: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600",
  },
  {
    href: "/enquiries",
    icon: MessageSquare,
    label: "Enquiry Inbox",
    description: "Communicate with prospective guests quickly.",
    color: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600",
  },
];

const WHY_HOST = [
  {
    icon: IndianRupee,
    title: "Earn in Rupees",
    body: "You set your own nightly price in ₹. Payments and conversations stay direct between you and your guest.",
  },
  {
    icon: Users,
    title: "Meet Real Travellers",
    body: "Connect with guests who genuinely want an authentic local experience — not just a hotel room.",
  },
  {
    icon: Shield,
    title: "You Stay in Control",
    body: "Approve or reject every booking. You decide who stays in your home, always.",
  },
  {
    icon: TrendingUp,
    title: "Grow at Your Pace",
    body: "Start with one room or one property. Scale only when you're ready.",
  },
];

const HostDashboardClient: React.FC<HostDashboardClientProps> = ({ currentUser }) => {
  const router = useRouter();
  const rentModal = useRentModal();
  const loginModal = useLoginModal();

  const [selectedHomestay, setSelectedHomestay] = useState<string>('');

  const handleSelect = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('homestayId') as HTMLInputElement;
    setSelectedHomestay(input.value.trim());
  };

  const handleListProperty = () => {
    if (!currentUser) {
      loginModal.onOpen();
    } else {
      rentModal.onOpen();
    }
  };

  return (
    <div className="pb-24">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[var(--secondary)] to-teal-700 text-white">
        <Container>
          <div className="py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="max-w-xl">
              <span className="inline-block bg-white/20 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                Host Dashboard
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
                {currentUser ? `Welcome back, ${currentUser.name.split(" ")[0]} 👋` : "Earn From Your Home"}
              </h1>
              <p className="text-white/85 text-lg font-medium">
                List your property, manage bookings and answer guest enquiries — all from one place.
              </p>
            </div>
            <button
              onClick={handleListProperty}
              className="flex-shrink-0 flex items-center gap-2 bg-white text-[var(--secondary)] font-bold px-8 py-4 rounded-2xl hover:bg-teal-50 transition shadow-xl text-base self-start md:self-auto"
            >
              <PlusCircle size={20} />
              {currentUser ? "List a New Property" : "Get Started — It's Free"}
            </button>
          </div>
        </Container>
      </div>

      <Container>
        {/* Quick-action cards (only for logged-in hosts) */}
        {currentUser && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">Your Host Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {QUICK_LINKS.map(({ href, icon: Icon, label, description, color, iconColor }) => (
                <button
                  key={href}
                  onClick={() => {
                    if (href.startsWith("#")) {
                      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
                    } else {
                      router.push(href);
                    }
                  }}
                  className={`flex flex-col gap-3 p-6 rounded-2xl border-2 text-left hover:shadow-md transition cursor-pointer ${color}`}
                >
                  <Icon size={28} className={iconColor} />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-lg">{label}</div>
                    <div className="font-light text-neutral-500 text-sm mt-1">{description}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* AI Host Insights Section */}
            <AIHostInsights currentUser={currentUser} />
          </div>
        )}

        {/* Availability Management */}
        <form onSubmit={handleSelect} className="mt-8 flex gap-2 items-center">
          <input
            type="text"
            name="homestayId"
            placeholder="Enter Homestay ID"
            className="border p-2 rounded flex-1"
            required
          />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
            Manage Availability
          </button>
        </form>
        {selectedHomestay && (
          <div className="mt-6">
            <AvailabilityCalendar homestayId={selectedHomestay} />
          </div>
        )}

        {/* Why host section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Why Host on Tracal?</h2>
          <p className="text-neutral-500 font-light mb-8">
            Join local homeowners across India who are already earning.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_HOST.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col gap-3 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                  <Icon size={20} className="text-[var(--secondary)]" />
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{title}</div>
                <div className="text-sm font-light text-neutral-500 leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-16 bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-8 text-center">How Hosting Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[{
              step: "1",
              title: "List Your Space",
              body: `Click "List a New Property", add photos, describe your space and set your nightly price in ₹. Takes under 5 minutes.`,
            }, {
              step: "2",
              title: "Accept Bookings",
              body: "Guests send booking requests. You review their details and approve or reject — no obligation to accept anyone.",
            }, {
              step: "3",
              title: "Welcome Guests",
              body: "Once approved, coordinate directly with your guest by phone, WhatsApp or email. You handle payment your way.",
            }].map(({ step, title, body }) => (
              <div key={step} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--secondary)] text-white font-extrabold text-xl flex items-center justify-center shadow">
                  {step}
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-lg">{title}</div>
                <div className="text-sm font-light text-neutral-500 leading-relaxed">{body}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10">
            <button onClick={handleListProperty} className="btn-secondary px-10 py-3 text-base font-bold rounded-full cursor-pointer">
              {currentUser ? "List Your Property Now" : "Sign Up & Start Hosting"}
            </button>
          </div>
        </div>

      </Container>
    </div>
  );
};

export default HostDashboardClient;
