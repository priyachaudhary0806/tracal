"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { X, Calendar, Users, Phone, Mail, MessageSquare } from "lucide-react";
import { DateRangePicker } from "react-date-range";
import { addDays, format } from "date-fns";

import Container from "@/components/Container";
import api from "@/lib/api";
import useLoginModal from "@/hooks/useLoginModal";
import useRegisterModal from "@/hooks/useRegisterModal";
import HomestayAIPanel from "@/components/homestay/HomestayAIPanel";

interface HomestayClientProps {
  listing: any;
  currentUser: any;
}

const HomestayClient: React.FC<HomestayClientProps> = ({ listing, currentUser }) => {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [dateRange, setDateRange] = useState([
    { startDate: addDays(today, 1), endDate: addDays(today, 2), key: "selection" },
  ]);

  const [bookingForm, setBookingForm] = useState({
    guestCount: 1,
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: "",
  });

  const [enquiryForm, setEnquiryForm] = useState({ name: "", email: "", message: "" });
  const [enquiryLoading, setEnquiryLoading] = useState(false);

  const images = listing.images || ["/images/placeholder.jpg"];

  const cleanWhatsAppNumber = (n: string) => n.replace(/\D/g, "");
  const cleanedWhatsApp = cleanWhatsAppNumber(listing.whatsapp || listing.phone || "");
  const whatsAppUrl = cleanedWhatsApp
    ? `https://wa.me/${cleanedWhatsApp}?text=${encodeURIComponent(
        `Hi! I am interested in booking your homestay "${listing.title}" located in ${listing.address}.`
      )}`
    : "";

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const selectedStart = dateRange[0].startDate;
  const selectedEnd = dateRange[0].endDate;
  const nights =
    selectedStart && selectedEnd
      ? Math.max(1, Math.round((selectedEnd.getTime() - selectedStart.getTime()) / 86400000))
      : 0;
  const totalPrice = nights * (listing.price || 0);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryForm.name.trim()) return toast.error("Please enter your name");
    if (!validateEmail(enquiryForm.email)) return toast.error("Please enter a valid email address");
    if (!enquiryForm.message.trim()) return toast.error("Please enter a message");

    setEnquiryLoading(true);
    try {
      await api.post("/enquiries/", {
        homestayId: listing.id || listing._id,
        name: enquiryForm.name,
        email: enquiryForm.email,
        message: enquiryForm.message,
      });
      toast.success("Enquiry sent successfully!");
      setEnquiryForm({ name: "", email: "", message: "" });
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to send enquiry.");
    } finally {
      setEnquiryLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Double-guard — should never reach here unauthenticated, but just in case
    if (!currentUser) {
      loginModal.onOpen();
      return;
    }

    if (!selectedStart || !selectedEnd) return toast.error("Please select dates");
    if (selectedStart >= selectedEnd) return toast.error("Check-out must be after check-in");
    if (bookingForm.guestCount < 1) return toast.error("Guest count must be at least 1");
    if (!bookingForm.name.trim()) return toast.error("Please enter your name");
    if (!validateEmail(bookingForm.email)) return toast.error("Please enter a valid email");
    if (!bookingForm.phone.trim()) return toast.error("Please enter a phone number");

    setBookingLoading(true);
    const token = Cookies.get("token");
    try {
      await api.post(
        "/bookings/",
        {
          homestayId: listing.id || listing._id,
          name: bookingForm.name,
          email: bookingForm.email,
          phone: bookingForm.phone,
          startDate: selectedStart.toISOString(),
          endDate: selectedEnd.toISOString(),
          guestCount: Number(bookingForm.guestCount),
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      toast.success("Booking request sent! Host will review it.");
      setIsBookingModalOpen(false);
      setDateRange([{ startDate: addDays(today, 1), endDate: addDays(today, 2), key: "selection" }]);
      setBookingForm({ guestCount: 1, name: currentUser?.name || "", email: currentUser?.email || "", phone: "" });
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to send booking request.");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <Container>
      <div className="max-w-screen-lg mx-auto">
        <div className="flex flex-col gap-6 pt-24 pb-8">

          {/* Title & Location */}
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
              {listing.title || listing.address}
            </h1>
            <div className="font-light text-neutral-500 mt-2">
              {listing.address} • {listing.category}
            </div>
          </div>

          {/* Image Gallery */}
          <div className="w-full h-[35vh] sm:h-[45vh] md:h-[60vh] overflow-hidden rounded-xl relative flex gap-2">
            <div className="flex-1 relative h-full">
              <Image fill className="object-cover" src={images[0]} alt="Main Image" priority />
            </div>
            {images.length > 1 && (
              <div className="hidden md:grid flex-1 grid-cols-2 grid-rows-2 gap-2 h-full">
                {images.slice(1, 5).map((img: string, idx: number) => (
                  <div key={idx} className="relative h-full w-full">
                    <Image fill className="object-cover" src={img} alt={`Gallery ${idx + 1}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-6">

            {/* Main Content */}
            <div className="col-span-4 flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <div className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  Hosted by {listing.owner_name || listing.user?.name}
                </div>
                <div className="flex flex-row items-center gap-4 font-light text-neutral-500">
                  <div>{listing.guestCount || 2} guests</div>
                  <div>{listing.roomCount || 1} rooms</div>
                  <div>{listing.bathroomCount || 1} bathrooms</div>
                </div>
              </div>
              <hr className="border-neutral-200 dark:border-slate-800" />
              <div className="text-lg font-light text-slate-600 dark:text-slate-400">
                {listing.description}
              </div>
              <hr className="border-neutral-200 dark:border-slate-800" />
              {/* TRACAL AI Property Intelligence Panel */}
              <HomestayAIPanel
                homestayId={listing.id || listing._id}
                homestayTitle={listing.title || ""}
                homestayAddress={listing.address || ""}
              />

              <hr className="border-neutral-200 dark:border-slate-800" />
              <div>
                <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-200">Location</h2>
                <div className="w-full h-[300px] sm:h-[400px] rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-inner">
                  <span className="text-slate-500 font-semibold text-center px-4">
                    {listing.address}
                  </span>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-span-3 order-first md:order-last mb-10 md:mb-0">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xl sticky top-24">
                <h3 className="text-2xl font-bold mb-4 text-[var(--secondary)]">
                  ₹{listing.price}{" "}
                  <span className="text-sm font-light text-neutral-500">/ night</span>
                </h3>
                <hr className="my-4 border-slate-200 dark:border-slate-800" />
                <h4 className="font-semibold text-xl mb-4 text-slate-800 dark:text-slate-200">Contact Owner</h4>
                <div className="mb-4">
                  <a
                    href={`/trustscore/${listing.id || listing._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition"
                  >
                    🛡️ Verified Property TrustScore &rarr;
                  </a>
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <p className="text-slate-600 dark:text-slate-400"><strong>Name:</strong> {listing.owner_name}</p>
                  <p className="text-slate-600 dark:text-slate-400"><strong>Phone:</strong> {listing.phone || "Not provided"}</p>
                  {listing.whatsapp && (
                    <p className="text-slate-600 dark:text-slate-400"><strong>WhatsApp:</strong> {listing.whatsapp}</p>
                  )}
                  <p className="text-slate-600 dark:text-slate-400"><strong>Email:</strong> {listing.email || "Not provided"}</p>
                </div>
                <div className="mt-8 flex flex-col gap-3">
                  {currentUser ? (
                    <button
                      onClick={() => setIsBookingModalOpen(true)}
                      className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer py-2.5 font-semibold text-sm"
                    >
                      📅 Book Now
                    </button>
                  ) : (
                    /* Not logged in — show inline prompt instead of just a button */
                    <div className="border-2 border-dashed border-[var(--primary)]/40 rounded-xl p-4 flex flex-col gap-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                        Login or create an account to book this homestay
                      </p>
                      <button
                        onClick={() => loginModal.onOpen()}
                        className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer py-2.5 font-semibold text-sm"
                      >
                        🔑 Login to Book
                      </button>
                      <button
                        onClick={() => registerModal.onOpen()}
                        className="w-full flex items-center justify-center gap-2 cursor-pointer py-2.5 font-semibold text-sm border border-[var(--primary)] text-[var(--primary)] rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition"
                      >
                        ✨ Create Account
                      </button>
                    </div>
                  )}
                  {whatsAppUrl && (
                    <a
                      href={whatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 w-full transition text-sm"
                    >
                      <MessageSquare size={16} /> Chat on WhatsApp
                    </a>
                  )}
                  <a
                    href={`tel:${listing.phone}`}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 w-full transition text-sm"
                  >
                    📞 Call Host
                  </a>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-neutral-200 dark:border-slate-800 my-10" />

          {/* Enquiry Form */}
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Have Questions?</h2>
            <p className="text-neutral-500 font-light mb-6">
              Send an enquiry to the owner regarding dates, pricing, or custom queries.
            </p>
            <form onSubmit={handleEnquirySubmit} className="flex flex-col gap-4">
              {[
                { label: "Name", key: "name", type: "text", placeholder: "Your full name" },
                { label: "Email Address", key: "email", type: "email", placeholder: "name@example.com" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
                  <input
                    type={type}
                    value={(enquiryForm as any)[key]}
                    onChange={(e) => setEnquiryForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 transition dark:text-white"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Message</label>
                <textarea
                  rows={4}
                  value={enquiryForm.message}
                  onChange={(e) => setEnquiryForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Ask about availability, pricing, custom requests…"
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 transition dark:text-white resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={enquiryLoading}
                className="btn-secondary self-start px-8 py-3 cursor-pointer disabled:opacity-50 text-sm font-bold mt-2"
              >
                {enquiryLoading ? "Sending…" : "Send Enquiry"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Book Now Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setIsBookingModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2">
              <Calendar className="text-[var(--primary)]" size={20} /> Book this Homestay
            </h2>
            <p className="text-neutral-500 font-light text-sm mb-5">
              Select your dates and fill in your contact info to request a reservation.
            </p>

            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
              {/* Date Range Picker */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Dates</label>
                <div className="tracal-date-picker rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <DateRangePicker
                    ranges={dateRange}
                    onChange={(item: any) => setDateRange([item.selection])}
                    minDate={addDays(today, 1)}
                    rangeColors={["var(--primary)"]}
                    showDateDisplay={false}
                    direction="horizontal"
                    months={1}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {format(selectedStart, "MMM d, yyyy")}
                  </span>
                  <span>→</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {format(selectedEnd, "MMM d, yyyy")}
                  </span>
                  <span className="ml-auto font-semibold text-[var(--primary)]">
                    {nights} night{nights !== 1 ? "s" : ""} · ₹{totalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Guests */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Users size={12} /> Number of Guests
                </label>
                <input
                  type="number" min={1} required
                  value={bookingForm.guestCount}
                  onChange={(e) => setBookingForm((p) => ({ ...p, guestCount: Number(e.target.value) }))}
                  className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white"
                />
              </div>

              <hr className="border-slate-100 dark:border-slate-800 my-1" />

              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Name</label>
                <input
                  type="text" required
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Your full name"
                  className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white"
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Mail size={12} /> Email Address
                </label>
                <input
                  type="email" required
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="name@example.com"
                  className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Phone size={12} /> Phone Number
                </label>
                <input
                  type="tel" required
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-[var(--primary)] bg-white dark:bg-slate-900 text-sm dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg font-semibold text-slate-700 dark:text-slate-200 transition text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="flex-1 py-2.5 btn-primary text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? "Sending…" : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Container>
  );
};

export default HomestayClient;
