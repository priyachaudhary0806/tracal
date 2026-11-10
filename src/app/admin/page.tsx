import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import RoleGuard from "@/components/auth/RoleGuard";
import AdminDashboardClient from "./AdminDashboardClient";
import { getAdminContext } from "@/lib/adminPageGuard";

export default async function AdminPage() {
  const { currentUser, token, API_URL } = await getAdminContext();

  if (!currentUser) {
    return <ClientOnly><AuthGuard title="Admin Login Required" message="Please login with an admin account." /></ClientOnly>;
  }
  if (currentUser.role !== "admin") {
    return <ClientOnly><RoleGuard title="Admin Access Only" message="This page is restricted to Tracal administrators." backHref="/" backLabel="Return to Homepage" /></ClientOnly>;
  }

  // Fetch quick-stats and pending verifications in parallel
  const [statsRes, verifRes] = await Promise.allSettled([
    fetch(`${API_URL}/api/admin/analytics?period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    fetch(`${API_URL}/api/host-verification/admin?status=pending`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  const stats = statsRes.status === "fulfilled" && statsRes.value.ok
    ? await statsRes.value.json() : null;
  const pendingVerifications = verifRes.status === "fulfilled" && verifRes.value.ok
    ? await verifRes.value.json() : [];

  return (
    <ClientOnly>
      <AdminDashboardClient
        currentUser={currentUser}
        pendingVerifications={pendingVerifications}
        stats={stats}
      />
    </ClientOnly>
  );
}
