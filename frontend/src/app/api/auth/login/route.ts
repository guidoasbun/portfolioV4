/**
 * POST /api/auth/login
 *
 * Authenticates admin user with email and password via Cognito.
 * On success, sets auth cookies (HTTP-only) and returns success.
 * On failure, returns a generic 401 error without revealing which
 * credential is wrong (requirement 9.3).
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import { login, setAuthCookies } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return Response.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    const tokens = await login(email, password);
    await setAuthCookies(tokens);

    return Response.json({ success: true });
  } catch (error: unknown) {
    // Log the actual error for debugging
    console.error("[auth/login] Login failed:", error instanceof Error ? error.message : error);
    // Generic error — never reveal which field is incorrect (req 9.3)
    return Response.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 },
    );
  }
}
