/**
 * Cognito authentication helpers.
 *
 * Provides JWT verification using Cognito JWKS, login/logout/token refresh
 * flows, and middleware helpers for extracting and validating tokens from
 * cookies or Authorization headers. Tokens are stored in HTTP-only cookies
 * for security.
 */

import "server-only";

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RevokeTokenCommand,
  GlobalSignOutCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload } from "jose";
import { cookies } from "next/headers";
import { loadSecrets } from "./secrets";

// ─── Client Initialization ─────────────────────────────────────────────────

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

// ─── Constants ──────────────────────────────────────────────────────────────

/** Session token expiration in seconds (1 hour per requirement 9.2). */
export const SESSION_EXPIRY_SECONDS = 3600;

/** Cookie names for auth tokens. */
export const AUTH_COOKIES = {
  idToken: "portfolio_id_token",
  accessToken: "portfolio_access_token",
  refreshToken: "portfolio_refresh_token",
} as const;

/** Admin routes path prefix. */
export const ADMIN_PATH_PREFIX = "/admin";

/** Login page path. */
export const LOGIN_PATH = "/admin/login";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Decoded Cognito JWT payload with standard claims. */
export interface CognitoTokenPayload extends JWTPayload {
  sub: string;
  email?: string;
  "cognito:username"?: string;
  token_use?: "id" | "access";
}

/** Result of a successful login. */
export interface LoginResult {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Result of a token refresh. */
export interface RefreshResult {
  idToken: string;
  accessToken: string;
  expiresIn: number;
}

/** Result of token verification. */
export interface VerifyResult {
  valid: boolean;
  payload?: CognitoTokenPayload;
  error?: string;
}

// ─── JWKS Cache ─────────────────────────────────────────────────────────────

/**
 * Cached JWKS (JSON Web Key Set) remote key set.
 * Lazily initialized on first verification call.
 */
let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedIssuer: string | null = null;

/**
 * Get or create the JWKS remote key set for the configured Cognito User Pool.
 */
async function getJWKS() {
  if (cachedJWKS && cachedIssuer) {
    return { jwks: cachedJWKS, issuer: cachedIssuer };
  }

  const secrets = await loadSecrets();
  const region = process.env.AWS_REGION ?? "us-east-1";
  const { userPoolId } = secrets.cognito;

  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);

  cachedJWKS = createRemoteJWKSet(jwksUrl);
  cachedIssuer = issuer;

  return { jwks: cachedJWKS, issuer: cachedIssuer };
}

// ─── Token Verification ─────────────────────────────────────────────────────

/**
 * Verify a Cognito JWT token using the JWKS endpoint.
 *
 * Validates the token signature, expiration, issuer, and token_use claim.
 *
 * @param token - The JWT string to verify
 * @param expectedTokenUse - Expected token_use claim ("id" or "access")
 * @returns Verification result with payload on success or error message on failure
 */
export async function verifyToken(
  token: string,
  expectedTokenUse: "id" | "access" = "access",
): Promise<VerifyResult> {
  try {
    const { jwks, issuer } = await getJWKS();
    const secrets = await loadSecrets();

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: expectedTokenUse === "id" ? secrets.cognito.clientId : undefined,
    });

    // Validate token_use claim
    if (payload.token_use !== expectedTokenUse) {
      return {
        valid: false,
        error: `Expected token_use "${expectedTokenUse}", got "${payload.token_use}"`,
      };
    }

    return {
      valid: true,
      payload: payload as CognitoTokenPayload,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Token verification failed";
    return { valid: false, error: message };
  }
}

// ─── Middleware Helpers ──────────────────────────────────────────────────────

/**
 * Extract the access token from the request.
 *
 * Resolution order:
 * 1. HTTP-only cookie (primary, for browser requests)
 * 2. Authorization header with "Bearer" prefix (fallback, for API clients)
 *
 * @param request - The incoming request (NextRequest from proxy or headers)
 * @returns The token string or null if not found
 */
export function extractTokenFromRequest(request: Request): string | null {
  // 1. Try cookies first
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const tokenCookie = parseCookieValue(cookieHeader, AUTH_COOKIES.accessToken);
    if (tokenCookie) {
      return tokenCookie;
    }
  }

  // 2. Fallback to Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

/**
 * Parse a specific cookie value from a cookie header string.
 *
 * @param cookieHeader - The raw Cookie header string
 * @param name - The cookie name to extract
 * @returns The cookie value or null
 */
function parseCookieValue(cookieHeader: string, name: string): string | null {
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [cookieName, ...valueParts] = cookie.split("=");
    if (cookieName?.trim() === name) {
      return valueParts.join("=") || null;
    }
  }
  return null;
}

/**
 * Validate the authentication state of an incoming request.
 *
 * Extracts the token from the request and verifies it. Used by the proxy
 * (formerly middleware) to protect admin routes.
 *
 * @param request - The incoming request
 * @returns Verification result indicating if the request is authenticated
 */
export async function validateRequest(request: Request): Promise<VerifyResult> {
  const token = extractTokenFromRequest(request);

  if (!token) {
    return { valid: false, error: "No authentication token found" };
  }

  return verifyToken(token, "access");
}

// ─── Login Flow ─────────────────────────────────────────────────────────────

/**
 * Authenticate a user with email and password via Cognito.
 *
 * Uses the USER_PASSWORD_AUTH flow (InitiateAuth) to obtain JWT tokens.
 * On success, returns the tokens for cookie storage.
 *
 * @param email - The user's email address
 * @param password - The user's password
 * @returns Login result with tokens on success
 * @throws {Error} If authentication fails (invalid credentials, account locked, etc.)
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const secrets = await loadSecrets();
  const { clientId, clientSecret } = secrets.cognito;

  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
      ...(clientSecret && { SECRET_HASH: await computeSecretHash(email, clientId, clientSecret) }),
    },
  });

  const response = await cognitoClient.send(command);

  if (!response.AuthenticationResult) {
    throw new Error("Authentication failed: no result returned");
  }

  const {
    IdToken,
    AccessToken,
    RefreshToken,
    ExpiresIn,
  } = response.AuthenticationResult;

  if (!IdToken || !AccessToken || !RefreshToken) {
    throw new Error("Authentication failed: incomplete token set");
  }

  return {
    idToken: IdToken,
    accessToken: AccessToken,
    refreshToken: RefreshToken,
    expiresIn: ExpiresIn ?? SESSION_EXPIRY_SECONDS,
  };
}

// ─── Logout Flow ────────────────────────────────────────────────────────────

/**
 * Revoke the user's tokens and clear auth cookies.
 *
 * Calls Cognito's GlobalSignOut to invalidate all tokens for the user,
 * then clears the auth cookies from the browser.
 *
 * @param accessToken - The current access token to identify the user session
 */
export async function logout(accessToken: string): Promise<void> {
  // Attempt to revoke the token server-side (best effort)
  try {
    await cognitoClient.send(
      new GlobalSignOutCommand({
        AccessToken: accessToken,
      }),
    );
  } catch {
    // Token may already be expired/invalid — proceed with cookie cleanup
  }

  // Clear auth cookies
  await clearAuthCookies();
}

/**
 * Clear all authentication cookies.
 * Used during logout and when tokens are found to be invalid.
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_COOKIES.idToken);
  cookieStore.delete(AUTH_COOKIES.accessToken);
  cookieStore.delete(AUTH_COOKIES.refreshToken);
}

// ─── Token Refresh Flow ─────────────────────────────────────────────────────

/**
 * Refresh the session using the stored refresh token.
 *
 * Uses Cognito's REFRESH_TOKEN_AUTH flow to obtain new id and access tokens
 * without requiring the user to re-enter credentials.
 *
 * @param refreshToken - The refresh token from the initial login
 * @returns Refresh result with new tokens on success
 * @throws {Error} If the refresh token is invalid or expired
 */
export async function refreshSession(refreshToken: string): Promise<RefreshResult> {
  const secrets = await loadSecrets();
  const { clientId, clientSecret } = secrets.cognito;

  const authParameters: Record<string, string> = {
    REFRESH_TOKEN: refreshToken,
  };

  if (clientSecret) {
    // For REFRESH_TOKEN_AUTH, SECRET_HASH uses the sub from the token
    // but we can pass the clientId-based hash as a workaround
    authParameters.SECRET_HASH = await computeSecretHash(
      clientId,
      clientId,
      clientSecret,
    );
  }

  const command = new InitiateAuthCommand({
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: clientId,
    AuthParameters: authParameters,
  });

  const response = await cognitoClient.send(command);

  if (!response.AuthenticationResult) {
    throw new Error("Token refresh failed: no result returned");
  }

  const { IdToken, AccessToken, ExpiresIn } = response.AuthenticationResult;

  if (!IdToken || !AccessToken) {
    throw new Error("Token refresh failed: incomplete token set");
  }

  return {
    idToken: IdToken,
    accessToken: AccessToken,
    expiresIn: ExpiresIn ?? SESSION_EXPIRY_SECONDS,
  };
}

// ─── Cookie Management ──────────────────────────────────────────────────────

/**
 * Store authentication tokens in HTTP-only cookies.
 *
 * Sets secure cookies with appropriate options:
 * - HttpOnly: prevents client-side JavaScript access
 * - Secure: only sent over HTTPS
 * - SameSite: lax for CSRF protection while allowing navigation
 * - Path: / for site-wide access
 * - MaxAge: 1 hour for id/access tokens, 30 days for refresh token
 *
 * @param tokens - The login or refresh result containing tokens
 */
export async function setAuthCookies(
  tokens: LoginResult | (RefreshResult & { refreshToken?: string }),
): Promise<void> {
  const cookieStore = await cookies();
  const isSecure = process.env.NODE_ENV === "production";

  const commonOptions = {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
  };

  // Set id token (1 hour expiry)
  cookieStore.set(AUTH_COOKIES.idToken, tokens.idToken, {
    ...commonOptions,
    maxAge: tokens.expiresIn,
  });

  // Set access token (1 hour expiry)
  cookieStore.set(AUTH_COOKIES.accessToken, tokens.accessToken, {
    ...commonOptions,
    maxAge: tokens.expiresIn,
  });

  // Set refresh token if available (30 days expiry)
  if ("refreshToken" in tokens && tokens.refreshToken) {
    cookieStore.set(AUTH_COOKIES.refreshToken, tokens.refreshToken, {
      ...commonOptions,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Compute the SECRET_HASH required by Cognito when a client secret is configured.
 *
 * The hash is calculated as: Base64(HMAC_SHA256(clientSecret, username + clientId))
 *
 * @param username - The username (email) of the user
 * @param clientId - The Cognito app client ID
 * @param clientSecret - The Cognito app client secret
 * @returns Base64-encoded HMAC-SHA256 hash
 */
async function computeSecretHash(
  username: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(clientSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(username + clientId),
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Check if a given pathname is an admin route that requires authentication.
 *
 * @param pathname - The URL pathname to check
 * @returns true if the path requires authentication
 */
export function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PATH_PREFIX) && pathname !== LOGIN_PATH;
}

/**
 * Get the current authenticated user's token payload from cookies.
 * Returns null if no valid session exists.
 *
 * @returns The decoded token payload or null
 */
export async function getCurrentUser(): Promise<CognitoTokenPayload | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;

  if (!accessToken) {
    return null;
  }

  const result = await verifyToken(accessToken, "access");
  return result.valid ? (result.payload ?? null) : null;
}
