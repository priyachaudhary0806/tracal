import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import RoleGuard from "@/components/auth/RoleGuard";
import AdminReviewsClient from "./AdminReviewsClient";
import { getAdminContext } from "@/lib/adminPageGuard";

export default async function AdminReviewsPage() {
  const { currentUser, token, API_URL } = await getAdminContext();

  if (!currentUser) {
    return <ClientOnly><AuthGuard title="Admin Login Required" message="Please login as an administrator." /></ClientOnly>;
  }
  if (currentUser.role !== "admin") {
    return <ClientOnly><RoleGuard title="Admin Access Only" message="This section is restricted to administrators." /></ClientOnly>;
  }

  let initialData: any = null;
  try {
    const res = await fetch(`${API_URL}/api/admin/reviews?limit=20&page=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) initialData = await res.json();
  } catch {
    /* fallback to client fetch */
  }

  return (
    <ClientOnly>
      <AdminReviewsClient currentUser={currentUser} initialData={initialData} />
    </ClientOnly>
  );
}

