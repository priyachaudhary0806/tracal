import { cookies } from "next/headers";
import getCurrentUser from "@/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import EnquiriesClient from "./EnquiriesClient";

// Server-side only
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export default async function EnquiriesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <AuthGuard
          title="Login to View Enquiries"
          message="Your enquiry inbox is only visible to you. Please login to continue."
        />
      </ClientOnly>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let initialEnquiries: any[] = [];

  if (token) {
    try {
      const res = await fetch(`${API_URL}/api/enquiries/owner`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        initialEnquiries = await res.json();
      }
    } catch (error) {
      console.error("Failed to fetch enquiries", error);
    }
  }

  return (
    <ClientOnly>
      <EnquiriesClient
        initialEnquiries={initialEnquiries}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
}
