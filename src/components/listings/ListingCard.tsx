"use client";

import { useMemo, useState, useCallback } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface ListingCardProps {
  data: any;
  reservation?: any;
  onAction?: (id: string) => void;
  disabled?: boolean;
  actionLabel?: string;
  actionId?: string;
  currentUser?: any | null;
}

const ListingCard: React.FC<ListingCardProps> = ({
  data,
  reservation,
  onAction,
  disabled,
  actionLabel,
  actionId = "",
  currentUser,
}) => {
  const router = useRouter();
  const listingId: string = data.id || data._id || "";

  // Derive initial favorited state from currentUser.favoriteIds
  const initialFavorited = useMemo(
    () =>
      currentUser?.favoriteIds
        ? (currentUser.favoriteIds as string[]).includes(listingId)
        : false,
    [currentUser, listingId]
  );

  const [isFavorited, setIsFavorited] = useState<boolean>(initialFavorited);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const handleFavoriteToggle = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation(); // prevent card navigation
      e.preventDefault();

      if (!currentUser) {
        toast.error("Please login to save favorites");
        return;
      }
      if (favoriteLoading) return;

      // Optimistic update
      setIsFavorited((prev) => !prev);
      setFavoriteLoading(true);

      const token = Cookies.get("token");
      try {
        await api.patch(`/auth/favorites/${listingId}`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Revert on failure
        setIsFavorited((prev) => !prev);
        toast.error("Failed to update favorites");
      } finally {
        setFavoriteLoading(false);
      }
    },
    [currentUser, favoriteLoading, listingId]
  );

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    onAction?.(actionId);
  };

  const price = useMemo(() => {
    if (reservation) return reservation.totalPrice;
    return data.price;
  }, [reservation, data.price]);

  const reservationDate = useMemo(() => {
    if (!reservation) return null;
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    return `${format(start, "PP")} - ${format(end, "PP")}`;
  }, [reservation]);

  return (
    <div
      onClick={() => router.push(`/homestays/${listingId}`)}
      className="col-span-1 cursor-pointer group"
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="aspect-square w-full relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <img
            src={
              (data.images && data.images[0]) ||
              (data.imageSrc && data.imageSrc[0]) ||
              "/images/placeholder.jpg"
            }
            alt="Listing"
            className="object-cover h-full w-full group-hover:scale-110 transition shrink-0 bg-slate-200 dark:bg-slate-800"
          />
          {/* Favorite / Heart button */}
          <div className="absolute top-3 right-3">
            <button
              onClick={handleFavoriteToggle}
              disabled={favoriteLoading}
              aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-white/70 dark:bg-black/40 backdrop-blur-sm hover:scale-110 transition-transform disabled:opacity-60 cursor-pointer"
            >
              {isFavorited ? (
                /* Filled heart — favorited */
                <svg
                  viewBox="0 0 24 24"
                  fill="var(--primary)"
                  className="w-5 h-5 drop-shadow-sm"
                >
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                /* Outline heart — not favorited */
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={2}
                  className="w-5 h-5 drop-shadow-md"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="font-bold text-lg text-slate-800 dark:text-slate-200 mt-2 truncate">
          {data.title || data.address || data.locationValue}
        </div>
        <div className="font-light text-neutral-500 line-clamp-1">
          {reservationDate || data.category}
        </div>
        <div className="flex flex-row items-center gap-1">
          <div className="font-semibold text-[var(--secondary)]">₹ {price}</div>
          {!reservation && (
            <div className="font-light text-slate-500 dark:text-slate-400">night</div>
          )}
        </div>
        {onAction && actionLabel && (
          <button
            disabled={disabled}
            onClick={handleCancel}
            className="w-full mt-2 btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default ListingCard;
