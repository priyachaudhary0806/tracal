import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import RoleGuard from "@/components/auth/RoleGuard";
import AnalyticsClient from "./AnalyticsClient";
import { getAdminContext } from "@/lib/adminPageGuard";

export default async function AnalyticsPage() {
  const { currentUser, token, API_URL } = await getAdminContext();

  if (!currentUser) return <ClientOnly><AuthGuard title="Admin Login Required" message="Please login as admin." /></ClientOnly>;
  if (currentUser.role !== "admin") return <ClientOnly><RoleGuard title="Admin Only" message="Admins only." /></ClientOnly>;

  async function fetchStats(period: string) {
    try {
      const res = await fetch(`${API_URL}/api/admin/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) return res.json();
    } catch { /* ignore */ }
    return null;
  }

  const stats = await fetchStats("30d");

  return (
    <ClientOnly>
      <AnalyticsClient currentUser={currentUser} initialStats={stats} initialPeriod="30d" />
    </ClientOnly>
  );
}
