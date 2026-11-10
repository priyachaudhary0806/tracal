import { cookies } from "next/headers";
import getCurrentUser from "@/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import AuthGuard from "@/components/auth/AuthGuard";
import FavoritesClient from "./FavoritesClient";

// Server-side only
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export default async function FavoritesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <AuthGuard
          title="Login to View Saved Homestays"
          message="Your favorite properties are saved to your account. Please login to see them."
        />
      </ClientOnly>
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  let initialFavorites: any[] = [];

  if (token) {
    try {
      const res = await fetch(`${API_URL}/api/auth/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        initialFavorites = await res.json();
      }
    } catch (error) {
      console.error("Failed to fetch favorites", error);
    }
  }

  return (
    <ClientOnly>
      <FavoritesClient
        initialFavorites={initialFavorites}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
}
