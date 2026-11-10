"use client";

import { useState, useCallback } from "react";
import { Heart } from "lucide-react";
import Container from "@/components/Container";
import ListingCard from "@/components/listings/ListingCard";
import Cookies from "js-cookie";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface FavoritesClientProps {
  initialFavorites: any[];
  currentUser: any;
}

const FavoritesClient: React.FC<FavoritesClientProps> = ({
  initialFavorites,
  currentUser,
}) => {
  const [favorites, setFavorites] = useState<any[]>(initialFavorites);

  // When the user un-hearts a card directly from this page, remove it from the list.
  const handleUnfavorite = useCallback(async (listingId: string) => {
    const token = Cookies.get("token");
    try {
      await api.patch(`/auth/favorites/${listingId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites((prev) => prev.filter((f) => (f.id || f._id) !== listingId));
    } catch {
      toast.error("Failed to remove from favorites");
    }
  }, []);

  // Build a currentUser clone with the live favoriteIds so ListingCard
  // renders the hearts as filled for everything shown on this page.
  const enrichedUser = {
    ...currentUser,
    favoriteIds: favorites.map((f) => f.id || f._id),
  };

  return (
    <Container>
      <div className="pt-8 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Heart size={28} className="text-[var(--primary)] fill-[var(--primary)]" />
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            Saved Homestays
          </h1>
        </div>
        <p className="font-light text-neutral-500 mt-1 mb-8">
          Properties you've hearted — all in one place.
        </p>

        {favorites.length === 0 ? (
          <div className="h-[40vh] flex flex-col gap-2 justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-xl">
            <Heart size={40} className="text-slate-300 dark:text-slate-600" />
            <div className="text-xl text-slate-800 dark:text-slate-200 font-bold mt-2">
              No saved homestays yet
            </div>
            <div className="font-light text-neutral-500">
              Tap the heart icon on any listing to save it here.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {favorites.map((listing) => (
              <ListingCard
                key={listing.id || listing._id}
                data={listing}
                currentUser={enrichedUser}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
};

export default FavoritesClient;
