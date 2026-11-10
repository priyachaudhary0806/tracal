import getCurrentUser from "@/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import RoleGuard from "@/components/auth/RoleGuard";
import { cookies } from "next/headers";
import AdminVerificationsClient from "./AdminVerificationsClient";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export default async function AdminVerificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <ClientOnly><AuthGuard title="Admin Login Required" message="Please login as admin." /></ClientOnly>;
  }
  if (currentUser.role !== "admin") {
    return <ClientOnly><RoleGuard title="Admin Only" message="This page is for administrators only." /></ClientOnly>;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let verifications: any[] = [];

  try {
    const res = await fetch(`${API_URL}/api/host-verification/admin`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) verifications = await res.json();
  } catch { /* ignore */ }

  return (
    <ClientOnly>
      <AdminVerificationsClient
        currentUser={currentUser}
        initialVerifications={verifications}
      />
    </ClientOnly>
  );
}
