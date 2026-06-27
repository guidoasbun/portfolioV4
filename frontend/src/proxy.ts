/**
 * Next.js Proxy (formerly Middleware) for admin route protection.
 *
 * Verifies Cognito JWT tokens for protected admin pages and API routes.
 * Public routes pass through without authentication checks.
 *
 * Requirements: 9.5, 14.5
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

// ─── Constants ──────────────────────────────────────────────────────────────

const LOGIN_PATH = "/admin/login";
const ACCESS_TOKEN_COOKIE = "portfolio_access_token";

/**
 * Public API routes that do NOT require authentication.
 * Defined as [method, pathPattern] tuples.
 */
const PUBLIC_API_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/api\/projects$/ },
  { method: "GET", pattern: /^\/api\/projects\/[^/]+$/ },
  { method: "GET", pattern: /^\/api\/experience$/ },
  { method: "GET", pattern: /^\/api\/skills$/ },
  { method: "GET", pattern: /^\/api\/about$/ },
  { method: "GET", pattern: /^\/api\/resumes\/preferred$/ },
  { method: "POST", pattern: /^\/api\/contact$/ },
];

// ─── JWKS Cache ─────────────────────────────────────────────────────────────

let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedIssuer: string | null = null;

function getJWKS(): { jwks: ReturnType<typeof createRemoteJWKSet>; issuer: string } {
  if (cachedJWKS && cachedIssuer) {
    return { jwks: cachedJWKS, issuer: cachedIssuer };
  }

  const region = process.env.AWS_REGION ?? "us-east-1";
  const userPoolId = process.env.COGNITO_USER_POOL_ID;

  if (!userPoolId) {
    throw new Error("COGNITO_USER_POOL_ID environment variable is not configured");
  }

  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);

  cachedJWKS = createRemoteJWKSet(jwksUrl);
  cachedIssuer = issuer;

  return { jwks: cachedJWKS, issuer: cachedIssuer };
}

// ─── Token Helpers ──────────────────────────────────────────────────────────

/**
 * Extract the access token from the request.
 * Checks cookies first, then Authorization header.
 */
function extractToken(request: NextRequest): string | null {
  // 1. Try cookie
  const tokenCookie = request.cookies.get(ACCESS_TOKEN_COOKIE);
  if (tokenCookie?.value) {
    return tokenCookie.value;
  }

  // 2. Fallback to Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Verify a Cognito access token using JWKS.
 * Returns true if the token is valid, false otherwise.
 */
async function verifyAccessToken(token: string): Promise<boolean> {
  try {
    const { jwks, issuer } = getJWKS();

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
    });

    // Validate token_use claim
    if (payload.token_use !== "access") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// ─── Route Classification ───────────────────────────────────────────────────

/**
 * Check if a request targets a public API route (no auth required).
 */
function isPublicApiRoute(method: string, pathname: string): boolean {
  return PUBLIC_API_ROUTES.some(
    (route) => route.method === method && route.pattern.test(pathname),
  );
}

/**
 * Check if a pathname is the admin login page.
 */
function isLoginPage(pathname: string): boolean {
  return pathname === LOGIN_PATH;
}

/**
 * Check if a pathname is a protected admin page route.
 */
function isAdminPageRoute(pathname: string): boolean {
  return pathname.startsWith("/admin") && !isLoginPage(pathname);
}

/**
 * Check if a request targets a protected API route.
 */
function isProtectedApiRoute(method: string, pathname: string): boolean {
  return pathname.startsWith("/api/") && !isPublicApiRoute(method, pathname);
}

// ─── Proxy Function ─────────────────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse | undefined> {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Allow login page through without auth check
  if (isLoginPage(pathname)) {
    return NextResponse.next();
  }

  // Determine if this route needs protection
  const needsAdminPageAuth = isAdminPageRoute(pathname);
  const needsApiAuth = isProtectedApiRoute(method, pathname);

  if (!needsAdminPageAuth && !needsApiAuth) {
    return NextResponse.next();
  }

  // Extract and verify token
  const token = extractToken(request);

  if (!token) {
    if (needsAdminPageAuth) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }

  const isValid = await verifyAccessToken(token);

  if (!isValid) {
    if (needsAdminPageAuth) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }
    return NextResponse.json(
      { success: false, error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  // Token is valid — allow request through
  return NextResponse.next();
}

// ─── Matcher Configuration ──────────────────────────────────────────────────

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
