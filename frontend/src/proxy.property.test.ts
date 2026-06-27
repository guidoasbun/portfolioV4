/**
 * @jest-environment node
 */

/**
 * Property-based tests for Admin Route Protection.
 *
 * Feature: portfolio-rebuild
 * Property 10: Admin Route Protection
 *
 * Validates: Requirements 9.5, 14.5
 *
 * For any request to an admin panel route that lacks a valid authentication
 * token, the application SHALL respond with a redirect to the login page
 * and SHALL NOT return protected content.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockJwtVerify = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockCreateRemoteJWKSet = jest.fn<(...args: unknown[]) => unknown>(
  () => "mock-jwks",
);

jest.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
  createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(
  url: string,
  options?: { method?: string; cookie?: string; authorization?: string },
): NextRequest {
  const { method = "GET", cookie, authorization } = options ?? {};
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  if (authorization) headers.set("authorization", authorization);

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
  });
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a random path segment: alphanumeric strings with dashes/underscores.
 * Avoids empty segments and special characters that would break URL parsing.
 */
const pathSegmentArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-z0-9][a-z0-9_-]{0,19}$/)
  .filter((s) => s.length >= 1);

/**
 * Generate a random admin page path that is NOT /admin/login.
 * Produces paths like /admin/dashboard, /admin/projects/edit, etc.
 */
const adminPagePathArb: fc.Arbitrary<string> = fc
  .array(pathSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => `/admin/${segments.join("/")}`)
  .filter((path) => path !== "/admin/login");

/**
 * Generate a random protected API path with a write method (POST, PUT, DELETE).
 * These are paths under /api/ that are NOT in the public API routes list.
 */
const protectedApiPathArb: fc.Arbitrary<string> = fc
  .array(pathSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => `/api/${segments.join("/")}`)
  .filter((path) => {
    // Exclude public GET routes
    const publicGetPatterns = [
      /^\/api\/projects$/,
      /^\/api\/projects\/[^/]+$/,
      /^\/api\/experience$/,
      /^\/api\/skills$/,
      /^\/api\/about$/,
      /^\/api\/resumes\/preferred$/,
    ];
    return !publicGetPatterns.some((p) => p.test(path));
  })
  // Also exclude /api/contact since POST to it is public
  .filter((path) => path !== "/api/contact");

/**
 * HTTP methods that require auth on API routes.
 */
const writeMethodArb: fc.Arbitrary<string> = fc.constantFrom("POST", "PUT", "DELETE");

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 10: Admin Route Protection", () => {
  let proxy: (request: NextRequest) => Promise<import("next/server").NextResponse | undefined>;

  beforeEach(async () => {
    jest.resetModules();
    mockJwtVerify.mockReset();
    mockCreateRemoteJWKSet.mockReset();
    mockCreateRemoteJWKSet.mockReturnValue("mock-jwks");

    // Always reject tokens — simulates missing/invalid auth
    mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

    // Set required env vars
    process.env.COGNITO_USER_POOL_ID = "us-east-1_testpool";
    process.env.AWS_REGION = "us-east-1";

    // Re-mock after resetModules
    jest.mock("jose", () => ({
      jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
      createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
    }));

    const mod = await import("./proxy");
    proxy = mod.proxy;
  });

  it("redirects to /admin/login for any admin page path without valid auth", () => {
    return fc.assert(
      fc.asyncProperty(adminPagePathArb, async (adminPath) => {
        const request = createRequest(adminPath);
        const response = await proxy(request);

        expect(response).toBeDefined();
        // Should redirect (307) to /admin/login
        expect(response!.status).toBe(307);
        const location = response!.headers.get("location");
        expect(location).toContain("/admin/login");
      }),
      { numRuns: 100 },
    );
  });

  it("redirects to /admin/login for admin page paths with invalid token in cookie", () => {
    return fc.assert(
      fc.asyncProperty(adminPagePathArb, async (adminPath) => {
        const request = createRequest(adminPath, {
          cookie: "portfolio_access_token=invalid-token-value",
        });
        const response = await proxy(request);

        expect(response).toBeDefined();
        expect(response!.status).toBe(307);
        const location = response!.headers.get("location");
        expect(location).toContain("/admin/login");
      }),
      { numRuns: 100 },
    );
  });

  it("returns 401 for protected API routes with write methods without valid auth", () => {
    return fc.assert(
      fc.asyncProperty(
        protectedApiPathArb,
        writeMethodArb,
        async (apiPath, method) => {
          const request = createRequest(apiPath, { method });
          const response = await proxy(request);

          expect(response).toBeDefined();
          expect(response!.status).toBe(401);

          const body = await response!.json();
          expect(body.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("never returns protected content for unauthenticated admin requests", () => {
    return fc.assert(
      fc.asyncProperty(adminPagePathArb, async (adminPath) => {
        const request = createRequest(adminPath);
        const response = await proxy(request);

        expect(response).toBeDefined();
        // Must NOT be a 200 pass-through
        expect(response!.status).not.toBe(200);
      }),
      { numRuns: 100 },
    );
  });
});
