import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import RoleGuard from "@/components/auth/RoleGuard";
import AdminHomestaysClient from "./AdminHomestaysClient";
import { getAdminContext } from "@/lib/adminPageGuard";

export default async function AdminHomestaysPage() {
  const { currentUser, token, API_URL } = await getAdminContext();

  if (!currentUser) return <ClientOnly><AuthGuard title="Admin Login Required" message="Please login as admin." /></ClientOnly>;
  if (currentUser.role !== "admin") return <ClientOnly><RoleGuard title="Admin Only" message="Admins only." /></ClientOnly>;

  let initialData: any = null;
  try {
    const res = await fetch(`${API_URL}/api/admin/homestays?limit=20&page=1`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) initialData = await res.json();
  } catch { /* ignore */ }

  return (
    <ClientOnly>
      <AdminHomestaysClient currentUser={currentUser} initialData={initialData} />
    </ClientOnly>
  );
}
