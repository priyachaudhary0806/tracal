import { cookies } from "next/headers";

// Server-side only — not exposed to the browser bundle.
const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

const VALID_ROLES = ["guest", "host", "admin"] as const;
export type UserRole = typeof VALID_ROLES[number];

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  favoriteIds: string[];
  role: UserRole;
  host_verified: boolean;
}

export default async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const response = await fetch(`${API_URL}/api/auth/me?token=${token}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Guard: FastAPI validation errors come back as an array [{type,loc,msg,...}].
    // A valid user is always a plain object with an "id" string field.
    if (!data || typeof data !== "object" || Array.isArray(data) || !data.id) {
      return null;
    }

    // Ensure favoriteIds is always an array on the frontend
    if (!Array.isArray(data.favoriteIds)) {
      data.favoriteIds = [];
    }

    // Ensure role is always valid
    if (!VALID_ROLES.includes(data.role)) {
      data.role = "guest";
    }

    // Ensure host_verified is a boolean
    if (typeof data.host_verified !== "boolean") {
      data.host_verified = false;
    }

    return data as CurrentUser;
  } catch {
    return null;
  }
}
