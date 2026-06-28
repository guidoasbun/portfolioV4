/**
 * POST /api/auth/logout
 *
 * Invalidates the current session and clears auth cookies.
 * Calls Cognito GlobalSignOut and removes HTTP-only cookies.
 *
 * Requirements: 9.6
 */

import { cookies } from "next/headers";
import { logout, clearAuthCookies, AUTH_COOKIES } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;

    if (accessToken) {
      await logout(accessToken);
    } else {
      // No token — just clear any stale cookies
      await clearAuthCookies();
    }

    return Response.json({ success: true });
  } catch {
    // Even if Cognito signout fails, clear cookies locally
    await clearAuthCookies();
    return Response.json({ success: true });
  }
}
