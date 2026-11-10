import getCurrentUser from "@/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import HostDashboardClient from "./HostDashboardClient";
import HostVerificationGate from "./HostVerificationGate";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export default async function HostPage() {
  const currentUser = await getCurrentUser();

  // Fetch verification status for logged-in users
  let verificationStatus: any = null;
  if (currentUser) {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;
      if (token) {
        const res = await fetch(`${API_URL}/api/host-verification/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.ok) {
          verificationStatus = await res.json();
        }
      }
    } catch {
      // silently ignore — verification status is best-effort
    }
  }

  return (
    <ClientOnly>
      <HostVerificationGate
        currentUser={currentUser}
        verificationStatus={verificationStatus}
      />
    </ClientOnly>
  );
}
