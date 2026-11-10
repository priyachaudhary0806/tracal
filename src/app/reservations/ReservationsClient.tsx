"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

import Container from "@/components/Container";
import api from "@/lib/api";

interface ReservationsClientProps {
  initialReservations: any[];
  initialTrips: any[];
  currentUser: any;
}

const ReservationsClient: React.FC<ReservationsClientProps> = ({
  initialReservations,
  initialTrips,
  currentUser,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reservations" | "trips">("reservations");
  const [reservations, setReservations] = useState<any[]>(initialReservations);
  const [trips, setTrips] = useState<any[]>(initialTrips);
  const [loadingId, setLoadingId] = useState("");

  const updateStatus = useCallback(
    async (bookingId: string, status: "approved" | "rejected" | "cancelled", isTrip = false) => {
      setLoadingId(bookingId);
      const token = Cookies.get("token");

      try {
        await api.patch(
          `/bookings/${bookingId}/status?status=${status}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        toast.success(`Booking status updated to ${status}`);

        // Update local state for responsiveness
        if (isTrip) {
          setTrips((prev) =>
            prev.map((t) => (t.id === bookingId ? { ...t, status } : t))
          );
        } else {
          setReservations((prev) =>
            prev.map((r) => (r.id === bookingId ? { ...r, status } : r))
          );
        }

        router.refresh();
      } catch (error: any) {
        toast.error(error?.response?.data?.detail || "Something went wrong.");
      } finally {
        setLoadingId("");
      }
    },
    [router]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400";
      case "cancelled":
        return "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-400";
      default:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    }
  };

  return (
    <Container>
      <div className="pt-8 pb-16">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          Bookings & Trips
        </h1>
        <p className="font-light text-neutral-500 mt-2">
          Manage booking requests for your properties and track your own trips.
        </p>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mt-8 gap-4">
          <button
            onClick={() => setActiveTab("reservations")}
            className={`pb-4 text-lg font-semibold transition border-b-2 cursor-pointer ${
              activeTab === "reservations"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Reservations Received ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab("trips")}
            className={`pb-4 text-lg font-semibold transition border-b-2 cursor-pointer ${
              activeTab === "trips"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            My Booked Trips ({trips.length})
          </button>
        </div>

        {/* Reservations Tab Content */}
        {activeTab === "reservations" && (
          <div className="mt-8">
            {reservations.length === 0 ? (
              <div className="h-[40vh] flex flex-col gap-2 justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-xl text-slate-800 dark:text-slate-200 font-bold">
                  No reservations found
                </div>
                <div className="font-light text-neutral-500">
                  You haven't received any booking requests on your homestays yet.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {reservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col md:flex-row gap-6 p-6 border border-slate-200 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition hover:shadow-md"
                  >
                    {/* Homestay Thumbnail */}
                    <div className="w-full md:w-48 h-32 relative rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={res.homestayImage || "/images/placeholder.jpg"}
                        alt="Homestay"
                        className="object-cover w-full h-full"
                      />
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {res.homestayTitle || "Property"}
                          </h2>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full uppercase ${getStatusBadgeClass(
                              res.status
                            )}`}
                          >
                            {res.status}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                          {res.homestayAddress}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 mt-4 text-sm text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="font-semibold">Guest:</span> {res.name}
                          </div>
                          <div>
                            <span className="font-semibold">Email:</span> {res.email}
                          </div>
                          <div>
                            <span className="font-semibold">Phone:</span> {res.phone}
                          </div>
                          <div>
                            <span className="font-semibold">Dates:</span> {formatDate(res.startDate)} – {formatDate(res.endDate)}
                          </div>
                          <div>
                            <span className="font-semibold">Guests Count:</span> {res.guestCount}
                          </div>
                          <div>
                            <span className="font-semibold">Requested:</span> {formatDate(res.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons for Host */}
                      {res.status === "pending" && (
                        <div className="flex flex-row items-center gap-3 mt-4 self-end md:self-start">
                          <button
                            disabled={loadingId === res.id}
                            onClick={() => updateStatus(res.id, "approved")}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Approve
                          </button>
                          <button
                            disabled={loadingId === res.id}
                            onClick={() => updateStatus(res.id, "rejected")}
                            className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trips Tab Content */}
        {activeTab === "trips" && (
          <div className="mt-8">
            {trips.length === 0 ? (
              <div className="h-[40vh] flex flex-col gap-2 justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="text-xl text-slate-800 dark:text-slate-200 font-bold">
                  No trips booked yet
                </div>
                <div className="font-light text-neutral-500">
                  Looks like you haven't made any booking requests yet.
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex flex-col md:flex-row gap-6 p-6 border border-slate-200 dark:border-slate-850 rounded-2xl bg-white dark:bg-slate-900 shadow-sm transition hover:shadow-md"
                  >
                    {/* Homestay Thumbnail */}
                    <div className="w-full md:w-48 h-32 relative rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={trip.homestayImage || "/images/placeholder.jpg"}
                        alt="Homestay"
                        className="object-cover w-full h-full"
                      />
                    </div>

                    {/* Trip Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                            {trip.homestayTitle || "Property"}
                          </h2>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full uppercase ${getStatusBadgeClass(
                              trip.status
                            )}`}
                          >
                            {trip.status}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                          {trip.homestayAddress}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mt-4 text-sm text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="font-semibold">Booking Dates:</span> {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                          </div>
                          <div>
                            <span className="font-semibold">Guests Count:</span> {trip.guestCount}
                          </div>
                          <div>
                            <span className="font-semibold">Booked For:</span> {trip.name}
                          </div>
                          <div>
                            <span className="font-semibold">Created At:</span> {formatDate(trip.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Cancel Button */}
                      {trip.status === "pending" && (
                        <div className="flex flex-row items-center mt-4 self-end md:self-start">
                          <button
                            disabled={loadingId === trip.id}
                            onClick={() => updateStatus(trip.id, "cancelled", true)}
                            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition font-semibold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  );
};

export default ReservationsClient;
