/**
 * @jest-environment node
 */

/**
 * Tests for the Next.js Proxy (admin route protection).
 *
 * Verifies that:
 * - Admin page routes redirect to login when unauthenticated
 * - Admin API routes return 401 when unauthenticated
 * - Public routes pass through without auth
 * - Valid tokens allow access
 * - Invalid tokens are rejected
 *
 * Requirements: 9.5, 14.5
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("proxy", () => {
  let proxy: typeof import("./proxy").proxy;

  beforeEach(async () => {
    jest.resetModules();
    mockJwtVerify.mockReset();
    mockCreateRemoteJWKSet.mockReset();
    mockCreateRemoteJWKSet.mockReturnValue("mock-jwks");

    process.env.AWS_REGION = "us-east-1";
    process.env.COGNITO_USER_POOL_ID = "us-east-1_TestPool";

    jest.mock("jose", () => ({
      jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
      createRemoteJWKSet: (...args: unknown[]) =>
        mockCreateRemoteJWKSet(...args),
    }));

    const mod = await import("./proxy");
    proxy = mod.proxy;
  });

  // ─── Login Page ─────────────────────────────────────────────────────────

  describe("login page", () => {
    it("allows access to /admin/login without auth", async () => {
      const request = createRequest("http://localhost:3000/admin/login");
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });
  });

  // ─── Protected Admin Page Routes ───────────────────────────────────────

  describe("protected admin page routes", () => {
    it("redirects to login when no token is present on /admin", async () => {
      const request = createRequest("http://localhost:3000/admin");
      const response = await proxy(request);

      expect(response?.status).toBe(307);
      expect(response?.headers.get("location")).toBe(
        "http://localhost:3000/admin/login",
      );
    });

    it("redirects to login when no token is present on /admin/projects", async () => {
      const request = createRequest("http://localhost:3000/admin/projects");
      const response = await proxy(request);

      expect(response?.status).toBe(307);
      expect(response?.headers.get("location")).toBe(
        "http://localhost:3000/admin/login",
      );
    });

    it("redirects to login when token is invalid", async () => {
      mockJwtVerify.mockRejectedValue(new Error("Token expired"));

      const request = createRequest("http://localhost:3000/admin/projects", {
        cookie: "portfolio_access_token=expired-token",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(307);
      expect(response?.headers.get("location")).toBe(
        "http://localhost:3000/admin/login",
      );
    });

    it("redirects to login when token_use is not access", async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-123", token_use: "id" },
      });

      const request = createRequest("http://localhost:3000/admin/projects", {
        cookie: "portfolio_access_token=wrong-type-token",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(307);
      expect(response?.headers.get("location")).toBe(
        "http://localhost:3000/admin/login",
      );
    });

    it("allows access when token is valid", async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-123", token_use: "access" },
      });

      const request = createRequest("http://localhost:3000/admin/projects", {
        cookie: "portfolio_access_token=valid-token",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows access with Bearer token in Authorization header", async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-123", token_use: "access" },
      });

      const request = createRequest("http://localhost:3000/admin/messages", {
        authorization: "Bearer valid-token",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });
  });

  // ─── Protected API Routes ─────────────────────────────────────────────

  describe("protected API routes", () => {
    it("returns 401 JSON for POST /api/projects without auth", async () => {
      const request = createRequest("http://localhost:3000/api/projects", {
        method: "POST",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(401);
      const body = await response?.json();
      expect(body).toEqual({
        success: false,
        error: "Authentication required",
      });
    });

    it("returns 401 JSON for PUT /api/projects/123 without auth", async () => {
      const request = createRequest("http://localhost:3000/api/projects/123", {
        method: "PUT",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(401);
      const body = await response?.json();
      expect(body).toEqual({
        success: false,
        error: "Authentication required",
      });
    });

    it("returns 401 JSON for DELETE /api/projects/123 without auth", async () => {
      const request = createRequest("http://localhost:3000/api/projects/123", {
        method: "DELETE",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(401);
      const body = await response?.json();
      expect(body).toEqual({
        success: false,
        error: "Authentication required",
      });
    });

    it("returns 401 JSON for POST /api/experience without auth", async () => {
      const request = createRequest("http://localhost:3000/api/experience", {
        method: "POST",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(401);
    });

    it("returns 401 JSON for POST /api/skills without auth", async () => {
      const request = createRequest("http://localhost:3000/api/skills", {
        method: "POST",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(401);
    });

    it("returns 401 JSON when token is invalid on protected API route", async () => {
      mockJwtVerify.mockRejectedValue(new Error("Token expired"));

      const request = createRequest("http://localhost:3000/api/projects", {
        method: "POST",
        cookie: "portfolio_access_token=expired-token",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(401);
      const body = await response?.json();
      expect(body).toEqual({
        success: false,
        error: "Invalid or expired token",
      });
    });

    it("allows access to protected API route with valid token", async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-123", token_use: "access" },
      });

      const request = createRequest("http://localhost:3000/api/projects", {
        method: "POST",
        cookie: "portfolio_access_token=valid-token",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });
  });

  // ─── Public API Routes ────────────────────────────────────────────────

  describe("public API routes", () => {
    it("allows GET /api/projects without auth", async () => {
      const request = createRequest("http://localhost:3000/api/projects");
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows GET /api/projects/some-id without auth", async () => {
      const request = createRequest(
        "http://localhost:3000/api/projects/some-id",
      );
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows GET /api/experience without auth", async () => {
      const request = createRequest("http://localhost:3000/api/experience");
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows GET /api/skills without auth", async () => {
      const request = createRequest("http://localhost:3000/api/skills");
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows GET /api/about without auth", async () => {
      const request = createRequest("http://localhost:3000/api/about");
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows GET /api/resumes/preferred without auth", async () => {
      const request = createRequest(
        "http://localhost:3000/api/resumes/preferred",
      );
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });

    it("allows POST /api/contact without auth", async () => {
      const request = createRequest("http://localhost:3000/api/contact", {
        method: "POST",
      });
      const response = await proxy(request);

      expect(response?.status).toBe(200);
      expect(response?.headers.get("x-middleware-next")).toBe("1");
    });
  });

  // ─── Config ───────────────────────────────────────────────────────────

  describe("config", () => {
    it("has matcher for admin and api routes", async () => {
      jest.resetModules();
      jest.mock("jose", () => ({
        jwtVerify: mockJwtVerify,
        createRemoteJWKSet: mockCreateRemoteJWKSet,
      }));
      const mod = await import("./proxy");

      expect(mod.config).toEqual({
        matcher: ["/admin/:path*", "/api/:path*"],
      });
    });
  });

  // ─── Token Extraction Priority ────────────────────────────────────────

  describe("token extraction priority", () => {
    it("prefers cookie token over Authorization header", async () => {
      mockJwtVerify.mockResolvedValue({
        payload: { sub: "user-123", token_use: "access" },
      });

      const request = createRequest("http://localhost:3000/admin/dashboard", {
        cookie: "portfolio_access_token=cookie-token",
        authorization: "Bearer header-token",
      });
      await proxy(request);

      // Verify the cookie token was used (first call to jwtVerify)
      expect(mockJwtVerify).toHaveBeenCalledWith(
        "cookie-token",
        "mock-jwks",
        expect.any(Object),
      );
    });
  });

  // ─── Environment Configuration ────────────────────────────────────────

  describe("environment configuration", () => {
    it("treats token as invalid when COGNITO_USER_POOL_ID is not set", async () => {
      delete process.env.COGNITO_USER_POOL_ID;

      jest.resetModules();
      jest.mock("jose", () => ({
        jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
        createRemoteJWKSet: (...args: unknown[]) =>
          mockCreateRemoteJWKSet(...args),
      }));

      const mod = await import("./proxy");

      // Admin page route — should redirect to login
      const request = createRequest("http://localhost:3000/admin/dashboard", {
        cookie: "portfolio_access_token=some-token",
      });
      const response = await mod.proxy(request);

      expect(response?.status).toBe(307);
      expect(response?.headers.get("location")).toBe(
        "http://localhost:3000/admin/login",
      );
    });

    it("returns 401 for API route when COGNITO_USER_POOL_ID is not set", async () => {
      delete process.env.COGNITO_USER_POOL_ID;

      jest.resetModules();
      jest.mock("jose", () => ({
        jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
        createRemoteJWKSet: (...args: unknown[]) =>
          mockCreateRemoteJWKSet(...args),
      }));

      const mod = await import("./proxy");

      const request = createRequest("http://localhost:3000/api/projects", {
        method: "POST",
        cookie: "portfolio_access_token=some-token",
      });
      const response = await mod.proxy(request);

      expect(response?.status).toBe(401);
      const body = await response?.json();
      expect(body).toEqual({
        success: false,
        error: "Invalid or expired token",
      });
    });
  });
});
