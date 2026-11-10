// Server-side only — not exposed to the browser bundle.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface IListingsParams {
  userId?: string;
  guestCount?: number;
  roomCount?: number;
  bathroomCount?: number;
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  locationValue?: string;
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  minRating?: number;
  amenities?: string; // comma‑separated list
  sortBy?: string;    // price_asc, price_desc, rating_desc, reviews_desc
  ids?: string;       // comma‑separated IDs
}

export default async function getListings(
  params: IListingsParams
) {
  try {
    const {
      category,
      userId,
      locationValue,
      maxPrice,
      minPrice,
      guestCount,
      roomCount,
      bathroomCount,
      startDate,
      endDate,
      minRating,
      amenities,
      sortBy,
      ids,
    } = params;

    let url = `${API_URL}/api/homestays?`;

    if (ids) {
      url += `ids=${encodeURIComponent(ids)}\u0026`;
    }
    if (category) {
      url += `category=${encodeURIComponent(category)}\u0026`;
    }
    if (userId) {
      url += `userId=${encodeURIComponent(userId)}\u0026`;
    }
    if (locationValue) {
      url += `location=${encodeURIComponent(locationValue)}\u0026`;
    }
    if (maxPrice !== undefined) {
      url += `maxPrice=${encodeURIComponent(maxPrice.toString())}\u0026`;
    }
    if (minPrice !== undefined) {
      url += `minPrice=${encodeURIComponent(minPrice.toString())}\u0026`;
    }
    if (guestCount !== undefined) {
      url += `guestCount=${encodeURIComponent(guestCount.toString())}\u0026`;
    }
    if (roomCount !== undefined) {
      url += `roomCount=${encodeURIComponent(roomCount.toString())}\u0026`;
    }
    if (bathroomCount !== undefined) {
      url += `bathroomCount=${encodeURIComponent(bathroomCount.toString())}\u0026`;
    }
    if (startDate) {
      url += `check_in=${encodeURIComponent(startDate)}\u0026`;
    }
    if (endDate) {
      url += `check_out=${encodeURIComponent(endDate)}\u0026`;
    }
    if (minRating !== undefined) {
      url += `minRating=${encodeURIComponent(minRating.toString())}\u0026`;
    }
    if (amenities) {
      url += `amenities=${encodeURIComponent(amenities)}\u0026`;
    }
    if (sortBy) {
      url += `sort_by=${encodeURIComponent(sortBy)}\u0026`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const listings = await response.json();
    return listings;
  } catch (error: any) {
    console.error("Failed to fetch listings", error);
    return [];
  }
}
