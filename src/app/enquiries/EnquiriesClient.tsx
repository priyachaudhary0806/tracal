"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, MapPin, Clock } from "lucide-react";
import Container from "@/components/Container";

interface EnquiriesClientProps {
  initialEnquiries: any[];
  currentUser: any;
}

const EnquiriesClient: React.FC<EnquiriesClientProps> = ({
  initialEnquiries,
  currentUser,
}) => {
  const router = useRouter();
  const [enquiries] = useState<any[]>(initialEnquiries);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Container>
      <div className="pt-8 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
              Enquiry Inbox
            </h1>
            <p className="font-light text-neutral-500 mt-2">
              Messages sent by guests about your properties.
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold px-4 py-2 rounded-full">
              <MessageSquare size={15} />
              {enquiries.length} {enquiries.length === 1 ? "enquiry" : "enquiries"}
            </span>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-800 mt-6 mb-8" />

        {enquiries.length === 0 ? (
          <div className="h-[40vh] flex flex-col gap-2 justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-xl">
            <MessageSquare size={40} className="text-slate-300 dark:text-slate-600" />
            <div className="text-xl text-slate-800 dark:text-slate-200 font-bold mt-2">
              No enquiries yet
            </div>
            <div className="font-light text-neutral-500">
              When guests send you questions about your properties, they&apos;ll appear here.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {enquiries.map((enquiry) => (
              <div
                key={enquiry.id}
                className="flex flex-col gap-4 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition"
              >
                {/* Property name + date row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <button
                      onClick={() => router.push(`/homestays/${enquiry.homestayId}`)}
                      className="text-lg font-bold text-slate-800 dark:text-slate-200 hover:text-[var(--primary)] transition text-left"
                    >
                      {enquiry.homestayTitle || "Your Property"}
                    </button>
                    {enquiry.homestayAddress && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-neutral-500">
                        <MapPin size={13} />
                        {enquiry.homestayAddress}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-slate-500 shrink-0 mt-1 sm:mt-0">
                    <Clock size={12} />
                    {formatDate(enquiry.createdAt)}
                  </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* Sender info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6 text-sm">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      From:{" "}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">{enquiry.name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Email:{" "}
                    </span>
                    <a
                      href={`mailto:${enquiry.email}`}
                      className="text-[var(--primary)] hover:underline"
                    >
                      {enquiry.email}
                    </a>
                  </div>
                </div>

                {/* Message body */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {enquiry.message}
                  </p>
                </div>

                {/* Quick reply link */}
                <div className="flex items-center gap-3 mt-1">
                  <a
                    href={`mailto:${enquiry.email}?subject=Re: Your enquiry about ${encodeURIComponent(enquiry.homestayTitle || "my property")}&body=Hi ${encodeURIComponent(enquiry.name)},%0A%0AThank you for reaching out about my property.%0A%0A`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-[var(--secondary)] hover:bg-opacity-90 px-4 py-2 rounded-lg transition"
                  >
                    <MessageSquare size={14} />
                    Reply via Email
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

export default EnquiriesClient;
