import getCurrentUser from "@/actions/getCurrentUser";
import getListings from "@/actions/getListings";
import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import PropertiesClient from "./PropertiesClient";

export default async function PropertiesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <AuthGuard
          title="Login to View Your Properties"
          message="Manage your listings after logging in to your host account."
        />
      </ClientOnly>
    );
  }

  const listings = await getListings({ userId: currentUser.id });

  return (
    <ClientOnly>
      <PropertiesClient
        listings={listings}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
}
