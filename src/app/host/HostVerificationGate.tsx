"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, CheckCircle, Clock, XCircle, Upload, AlertTriangle } from "lucide-react";
import Container from "@/components/Container";
import useLoginModal from "@/hooks/useLoginModal";
import useRentModal from "@/hooks/useRentModal";
import HostDashboardClient from "./HostDashboardClient";
import api from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

interface HostVerificationGateProps {
  currentUser: any;
  verificationStatus: any;
}

const HostVerificationGate: React.FC<HostVerificationGateProps> = ({
  currentUser,
  verificationStatus,
}) => {
  const loginModal = useLoginModal();
  const rentModal = useRentModal();
  const router = useRouter();

  // ── Unauthenticated: show the marketing page + prompt to login/signup
  if (!currentUser) {
    return <HostDashboardClient currentUser={null} />;
  }

  // ── Verified host: show the full host dashboard
  if (currentUser.host_verified && currentUser.role === "host") {
    return <HostDashboardClient currentUser={currentUser} />;
  }

  // ── Admin: also show full dashboard
  if (currentUser.role === "admin") {
    return <HostDashboardClient currentUser={currentUser} />;
  }

  // ── Determine verification state
  const status = verificationStatus?.status;

  // Pending verification
  if (status === "pending") {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center py-16">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-2xl p-10 flex flex-col items-center gap-6 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
              <Clock size={28} className="text-amber-500" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Verification Pending</h2>
              <p className="font-light text-neutral-500 mt-2">
                Your host verification documents are under review. We'll notify you once an admin has reviewed your application.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-4 font-medium">
                Submitted on {new Date(verificationStatus.submittedAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric"
                })}
              </p>
            </div>
            <div className="w-full bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-sm text-amber-700 dark:text-amber-300 text-center">
                You can still browse properties and make bookings as a guest while your verification is being reviewed.
              </p>
            </div>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-[var(--primary)] text-white font-semibold rounded-xl hover:opacity-90 transition cursor-pointer"
            >
              Browse Homestays
            </button>
          </div>
        </div>
      </Container>
    );
  }

  // Rejected verification
  if (status === "rejected") {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center py-16">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-2xl p-10 flex flex-col items-center gap-6 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
              <XCircle size={28} className="text-rose-500" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Verification Rejected</h2>
              <p className="font-light text-neutral-500 mt-2">
                Unfortunately, your host verification was not approved.
              </p>
            </div>
            {verificationStatus.rejectionReason && (
              <div className="w-full bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                <p className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide mb-1">Reason</p>
                <p className="text-sm text-rose-600 dark:text-rose-400">{verificationStatus.rejectionReason}</p>
              </div>
            )}
            <p className="text-sm text-neutral-500 text-center">
              Please address the issues above and resubmit your verification documents.
            </p>
            <VerificationForm currentUser={currentUser} isResubmission />
          </div>
        </div>
      </Container>
    );
  }

  // Not submitted yet — show the verification form
  return (
    <Container>
      <div className="py-12 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={28} className="text-[var(--secondary)]" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Become a Host</h1>
        </div>
        <p className="text-neutral-500 font-light mb-8">
          To list properties on Tracal, we need to verify your identity. This is a one-time process to ensure the safety of our community.
        </p>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { step: "1", title: "Submit Documents", body: "Provide your ID and a proof of property ownership." },
            { step: "2", title: "Admin Review", body: "Our team reviews your submission within 24-48 hours." },
            { step: "3", title: "Start Hosting", body: "Once approved, list your property and start earning." },
          ].map(({ step, title, body }) => (
            <div key={step} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="w-8 h-8 rounded-full bg-[var(--secondary)] text-white font-bold flex items-center justify-center mb-3 text-sm">
                {step}
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">{title}</div>
              <div className="text-sm text-neutral-500 font-light">{body}</div>
            </div>
          ))}
        </div>

        <VerificationForm currentUser={currentUser} />
      </div>
    </Container>
  );
};

// ---------------------------------------------------------------------------
// Verification submission form
// ---------------------------------------------------------------------------

interface VerificationFormProps {
  currentUser: any;
  isResubmission?: boolean;
}

const VerificationForm: React.FC<VerificationFormProps> = ({ currentUser, isResubmission }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: currentUser?.name || "",
    phone: "",
    id_type: "passport",
    address: "",
  });
  const [idDocument, setIdDocument] = useState<File | null>(null);
  const [ownershipProof, setOwnershipProof] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!idDocument || !ownershipProof) {
      toast.error("Please upload both required documents");
      return;
    }

    setIsLoading(true);
    const token = Cookies.get("token");

    try {
      const formData = new FormData();
      formData.append("full_name", form.full_name);
      formData.append("phone", form.phone);
      formData.append("id_type", form.id_type);
      formData.append("address", form.address);
      formData.append("id_document", idDocument);
      formData.append("ownership_proof", ownershipProof);

      await api.post("/host-verification/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Verification submitted! We'll review it within 24-48 hours.");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to submit verification. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={18} className="text-amber-500" />
        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          {isResubmission ? "Resubmit your verification documents" : "Complete host verification"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
          <input
            type="text"
            required
            value={form.full_name}
            onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
            className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number *</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Address *</label>
        <textarea
          required
          rows={2}
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          placeholder="Your complete address including city, state and pincode"
          className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white resize-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ID Type *</label>
        <select
          value={form.id_type}
          onChange={(e) => setForm((p) => ({ ...p, id_type: e.target.value }))}
          className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white"
        >
          <option value="passport">Passport</option>
          <option value="aadhaar">Aadhaar Card</option>
          <option value="pan">PAN Card</option>
          <option value="driver_license">Driver's License</option>
          <option value="voter_id">Voter ID</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            ID Document *
            <span className="text-xs text-neutral-400 font-normal ml-1">(PDF, JPG, PNG)</span>
          </label>
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <Upload size={20} className="text-slate-400 mb-1" />
            <span className="text-xs text-slate-500">{idDocument ? idDocument.name : "Click to upload"}</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setIdDocument(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ownership Proof *
            <span className="text-xs text-neutral-400 font-normal ml-1">(utility bill, deed, etc.)</span>
          </label>
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            <Upload size={20} className="text-slate-400 mb-1" />
            <span className="text-xs text-slate-500">{ownershipProof ? ownershipProof.name : "Click to upload"}</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => setOwnershipProof(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-[var(--secondary)] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
      >
        {isLoading ? "Submitting…" : isResubmission ? "Resubmit Verification" : "Submit for Verification"}
      </button>
    </form>
  );
};

export default HostVerificationGate;
