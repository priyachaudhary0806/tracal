import { cookies } from "next/headers";
import getCurrentUser from "@/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import ReservationsClient from "./ReservationsClient";

// Server-side only
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export default async function ReservationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <AuthGuard
          title="Login to View Bookings"
          message="Your trips and reservations are linked to your account. Please login to continue."
        />
      </ClientOnly>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let initialReservations = [];
  let initialTrips = [];

  if (token) {
    try {
      // Fetch received booking requests (as host)
      const resReservations = await fetch(`${API_URL}/api/bookings/owner`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (resReservations.ok) {
        initialReservations = await resReservations.json();
      }

      // Fetch booked trips (as guest)
      const resTrips = await fetch(`${API_URL}/api/bookings/my-trips`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (resTrips.ok) {
        initialTrips = await resTrips.json();
      }
    } catch (error) {
      console.error("Failed to fetch bookings or trips", error);
    }
  }

  return (
    <ClientOnly>
      <ReservationsClient
        initialReservations={initialReservations}
        initialTrips={initialTrips}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
}
