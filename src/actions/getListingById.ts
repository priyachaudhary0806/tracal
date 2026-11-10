// Server-side only — not exposed to the browser bundle.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export default async function getListingById(params: { listingId?: string }) {
  try {
    const { listingId } = params;

    if (!listingId) {
      return null;
    }

    const response = await fetch(`${API_URL}/api/homestays/${listingId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store", 
    });

    if (!response.ok) {
      return null;
    }

    const listing = await response.json();
    
    // Construct fake user object matching frontend interface
    const user = {
      _id: listing.userId || "",
      name: listing.owner_name || "Unknown",
      email: listing.email || "",
      image: "", // Placeholder
    };

    return {
      ...listing,
      _id: listing.id,
      user,
    };
  } catch (error: any) {
    console.error("error fetching homestay", error);
    return null;
  }
}
