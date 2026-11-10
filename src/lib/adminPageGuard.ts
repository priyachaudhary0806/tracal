import { cookies } from "next/headers";
import getCurrentUser from "@/actions/getCurrentUser";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

/**
 * Helper used by every admin page.tsx to:
 *  1. Get the current user
 *  2. Read the cookie token
 *  3. Return both so the page can do authenticated API calls
 *
 * Returns { currentUser, token }
 */
export async function getAdminContext() {
  const currentUser = await getCurrentUser();
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value ?? "";
  return { currentUser, token, API_URL };
}
