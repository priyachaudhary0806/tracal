import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import RoleGuard from "@/components/auth/RoleGuard";
import AdminAIMonitoringClient from "./AdminAIMonitoringClient";
import { getAdminContext } from "@/lib/adminPageGuard";

export default async function AdminAIMonitoringPage() {
  const { currentUser, token, API_URL } = await getAdminContext();

  if (!currentUser) {
    return <ClientOnly><AuthGuard title="Admin Login Required" message="Please login as an administrator." /></ClientOnly>;
  }
  if (currentUser.role !== "admin") {
    return <ClientOnly><RoleGuard title="Admin Access Only" message="This section is restricted to administrators." /></ClientOnly>;
  }

  let initialData: any = null;
  try {
    const res = await fetch(`${API_URL}/api/admin/ai-monitoring`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) initialData = await res.json();
  } catch {
    /* fallback to client fetch */
  }

  return (
    <ClientOnly>
      <AdminAIMonitoringClient currentUser={currentUser} initialData={initialData} />
    </ClientOnly>
  );
}

