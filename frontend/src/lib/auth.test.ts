/**
 * @jest-environment node
 */

/**
 * Tests for Cognito authentication helpers — token verification,
 * token extraction, login/logout flows, and cookie management.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCognitoSend = jest.fn<(...args: any[]) => any>();

jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: jest
    .fn()
    .mockImplementation(() => ({ send: mockCognitoSend })),
  InitiateAuthCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  RevokeTokenCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
  GlobalSignOutCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockJwtVerify = jest.fn<(...args: any[]) => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreateRemoteJWKSet = jest.fn<(...args: any[]) => any>(() => "mock-jwks");

jest.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
  createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
}));

const mockCookieStore = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: jest.fn<(...args: any[]) => any>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set: jest.fn<(...args: any[]) => any>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: jest.fn<(...args: any[]) => any>(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  has: jest.fn<(...args: any[]) => any>(),
};

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => mockCookieStore),
}));

jest.mock("./secrets", () => ({
  loadSecrets: jest.fn(async () => ({
    cognito: {
      userPoolId: "us-east-1_TestPool",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
    },
    dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
    s3: { bucketName: "portfolio-assets", region: "us-east-1" },
    apiKeys: {},
  })),
}));

// ─── extractTokenFromRequest ────────────────────────────────────────────────

describe("extractTokenFromRequest", () => {
  let extractTokenFromRequest: typeof import("./auth").extractTokenFromRequest;

  beforeEach(async () => {
    jest.resetModules();
    jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
      CognitoIdentityProviderClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockCognitoSend })),
      InitiateAuthCommand: jest.fn(),
      RevokeTokenCommand: jest.fn(),
      GlobalSignOutCommand: jest.fn(),
    }));
    jest.mock("jose", () => ({
      jwtVerify: mockJwtVerify,
      createRemoteJWKSet: mockCreateRemoteJWKSet,
    }));
    jest.mock("next/headers", () => ({
      cookies: jest.fn(async () => mockCookieStore),
    }));
    jest.mock("./secrets", () => ({
      loadSecrets: jest.fn(async () => ({
        cognito: {
          userPoolId: "us-east-1_TestPool",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
        },
        dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
        s3: { bucketName: "portfolio-assets", region: "us-east-1" },
        apiKeys: {},
      })),
    }));
    const mod = await import("./auth");
    extractTokenFromRequest = mod.extractTokenFromRequest;
  });

  it("extracts token from cookies when present", () => {
    const request = new Request("http://localhost/admin", {
      headers: {
        cookie: "portfolio_access_token=my-access-token; other=value",
      },
    });

    expect(extractTokenFromRequest(request)).toBe("my-access-token");
  });

  it("extracts token from Authorization header as fallback", () => {
    const request = new Request("http://localhost/admin", {
      headers: {
        authorization: "Bearer my-bearer-token",
      },
    });

    expect(extractTokenFromRequest(request)).toBe("my-bearer-token");
  });

  it("prefers cookie over Authorization header", () => {
    const request = new Request("http://localhost/admin", {
      headers: {
        cookie: "portfolio_access_token=cookie-token",
        authorization: "Bearer header-token",
      },
    });

    expect(extractTokenFromRequest(request)).toBe("cookie-token");
  });

  it("returns null when no token is found", () => {
    const request = new Request("http://localhost/admin");
    expect(extractTokenFromRequest(request)).toBeNull();
  });

  it("returns null for Authorization header without Bearer prefix", () => {
    const request = new Request("http://localhost/admin", {
      headers: {
        authorization: "Basic abc123",
      },
    });

    expect(extractTokenFromRequest(request)).toBeNull();
  });

  it("handles cookie values containing equals signs", () => {
    const request = new Request("http://localhost/admin", {
      headers: {
        cookie: "portfolio_access_token=token.with=equals.in.jwt",
      },
    });

    expect(extractTokenFromRequest(request)).toBe("token.with=equals.in.jwt");
  });
});

// ─── isProtectedRoute ───────────────────────────────────────────────────────

describe("isProtectedRoute", () => {
  let isProtectedRoute: typeof import("./auth").isProtectedRoute;

  beforeEach(async () => {
    jest.resetModules();
    jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
      CognitoIdentityProviderClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockCognitoSend })),
      InitiateAuthCommand: jest.fn(),
      RevokeTokenCommand: jest.fn(),
      GlobalSignOutCommand: jest.fn(),
    }));
    jest.mock("jose", () => ({
      jwtVerify: mockJwtVerify,
      createRemoteJWKSet: mockCreateRemoteJWKSet,
    }));
    jest.mock("next/headers", () => ({
      cookies: jest.fn(async () => mockCookieStore),
    }));
    jest.mock("./secrets", () => ({
      loadSecrets: jest.fn(async () => ({
        cognito: {
          userPoolId: "us-east-1_TestPool",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
        },
        dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
        s3: { bucketName: "portfolio-assets", region: "us-east-1" },
        apiKeys: {},
      })),
    }));
    const mod = await import("./auth");
    isProtectedRoute = mod.isProtectedRoute;
  });

  it("returns true for admin dashboard", () => {
    expect(isProtectedRoute("/admin")).toBe(true);
  });

  it("returns true for nested admin routes", () => {
    expect(isProtectedRoute("/admin/projects")).toBe(true);
    expect(isProtectedRoute("/admin/messages")).toBe(true);
    expect(isProtectedRoute("/admin/about")).toBe(true);
  });

  it("returns false for the login page", () => {
    expect(isProtectedRoute("/admin/login")).toBe(false);
  });

  it("returns false for public routes", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/resume")).toBe(false);
    expect(isProtectedRoute("/api/projects")).toBe(false);
  });
});

// ─── verifyToken ────────────────────────────────────────────────────────────

describe("verifyToken", () => {
  let verifyToken: typeof import("./auth").verifyToken;

  beforeEach(async () => {
    jest.resetModules();
    mockJwtVerify.mockReset();
    mockCreateRemoteJWKSet.mockReset();
    mockCreateRemoteJWKSet.mockReturnValue("mock-jwks");
    jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
      CognitoIdentityProviderClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockCognitoSend })),
      InitiateAuthCommand: jest.fn(),
      RevokeTokenCommand: jest.fn(),
      GlobalSignOutCommand: jest.fn(),
    }));
    jest.mock("jose", () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jwtVerify: (...args: any[]) => mockJwtVerify(...args),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createRemoteJWKSet: (...args: any[]) => mockCreateRemoteJWKSet(...args),
    }));
    jest.mock("next/headers", () => ({
      cookies: jest.fn(async () => mockCookieStore),
    }));
    jest.mock("./secrets", () => ({
      loadSecrets: jest.fn(async () => ({
        cognito: {
          userPoolId: "us-east-1_TestPool",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
        },
        dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
        s3: { bucketName: "portfolio-assets", region: "us-east-1" },
        apiKeys: {},
      })),
    }));
    const mod = await import("./auth");
    verifyToken = mod.verifyToken;
  });

  it("returns valid result when token is verified successfully", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-123",
        email: "admin@example.com",
        token_use: "access",
        "cognito:username": "admin",
      },
    });

    const result = await verifyToken("valid-token", "access");

    expect(result.valid).toBe(true);
    expect(result.payload?.sub).toBe("user-123");
    expect(result.payload?.email).toBe("admin@example.com");
  });

  it("returns invalid result when token_use does not match expected", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-123",
        token_use: "id",
      },
    });

    const result = await verifyToken("valid-token", "access");

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Expected token_use "access"');
  });

  it("returns invalid result when jose throws an error", async () => {
    mockJwtVerify.mockRejectedValue(new Error("Token expired"));

    const result = await verifyToken("expired-token", "access");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("Token expired");
  });

  it("constructs JWKS URL from cognito config", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: "user-123", token_use: "access" },
    });

    await verifyToken("some-token", "access");

    expect(mockCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL(
        "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool/.well-known/jwks.json",
      ),
    );
  });
});

// ─── login ──────────────────────────────────────────────────────────────────

describe("login", () => {
  let login: typeof import("./auth").login;

  beforeEach(async () => {
    jest.resetModules();
    mockCognitoSend.mockReset();
    jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
      CognitoIdentityProviderClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockCognitoSend })),
      InitiateAuthCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
      RevokeTokenCommand: jest.fn(),
      GlobalSignOutCommand: jest.fn(),
    }));
    jest.mock("jose", () => ({
      jwtVerify: mockJwtVerify,
      createRemoteJWKSet: mockCreateRemoteJWKSet,
    }));
    jest.mock("next/headers", () => ({
      cookies: jest.fn(async () => mockCookieStore),
    }));
    jest.mock("./secrets", () => ({
      loadSecrets: jest.fn(async () => ({
        cognito: {
          userPoolId: "us-east-1_TestPool",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
        },
        dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
        s3: { bucketName: "portfolio-assets", region: "us-east-1" },
        apiKeys: {},
      })),
    }));
    const mod = await import("./auth");
    login = mod.login;
  });

  it("returns tokens on successful authentication", async () => {
    mockCognitoSend.mockResolvedValue({
      AuthenticationResult: {
        IdToken: "id-token-value",
        AccessToken: "access-token-value",
        RefreshToken: "refresh-token-value",
        ExpiresIn: 3600,
      },
    });

    const result = await login("admin@example.com", "password123");

    expect(result.idToken).toBe("id-token-value");
    expect(result.accessToken).toBe("access-token-value");
    expect(result.refreshToken).toBe("refresh-token-value");
    expect(result.expiresIn).toBe(3600);
  });

  it("throws when AuthenticationResult is missing", async () => {
    mockCognitoSend.mockResolvedValue({});

    await expect(login("admin@example.com", "wrong-password")).rejects.toThrow(
      "Authentication failed: no result returned",
    );
  });

  it("throws when tokens are incomplete", async () => {
    mockCognitoSend.mockResolvedValue({
      AuthenticationResult: {
        IdToken: "id-token",
        AccessToken: "access-token",
        // Missing RefreshToken
      },
    });

    await expect(login("admin@example.com", "password")).rejects.toThrow(
      "Authentication failed: incomplete token set",
    );
  });
});

// ─── logout ─────────────────────────────────────────────────────────────────

describe("logout", () => {
  let logout: typeof import("./auth").logout;

  beforeEach(async () => {
    jest.resetModules();
    mockCognitoSend.mockReset();
    mockCookieStore.delete.mockReset();
    jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
      CognitoIdentityProviderClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockCognitoSend })),
      InitiateAuthCommand: jest.fn(),
      RevokeTokenCommand: jest.fn(),
      GlobalSignOutCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
    }));
    jest.mock("jose", () => ({
      jwtVerify: mockJwtVerify,
      createRemoteJWKSet: mockCreateRemoteJWKSet,
    }));
    jest.mock("next/headers", () => ({
      cookies: jest.fn(async () => mockCookieStore),
    }));
    jest.mock("./secrets", () => ({
      loadSecrets: jest.fn(async () => ({
        cognito: {
          userPoolId: "us-east-1_TestPool",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
        },
        dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
        s3: { bucketName: "portfolio-assets", region: "us-east-1" },
        apiKeys: {},
      })),
    }));
    const mod = await import("./auth");
    logout = mod.logout;
  });

  it("calls GlobalSignOut and clears cookies", async () => {
    mockCognitoSend.mockResolvedValue({});

    await logout("access-token-value");

    expect(mockCognitoSend).toHaveBeenCalled();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("portfolio_id_token");
    expect(mockCookieStore.delete).toHaveBeenCalledWith(
      "portfolio_access_token",
    );
    expect(mockCookieStore.delete).toHaveBeenCalledWith(
      "portfolio_refresh_token",
    );
  });

  it("clears cookies even if GlobalSignOut fails", async () => {
    mockCognitoSend.mockRejectedValue(new Error("Token expired"));

    await logout("expired-access-token");

    // Should still clear cookies
    expect(mockCookieStore.delete).toHaveBeenCalledWith("portfolio_id_token");
    expect(mockCookieStore.delete).toHaveBeenCalledWith(
      "portfolio_access_token",
    );
    expect(mockCookieStore.delete).toHaveBeenCalledWith(
      "portfolio_refresh_token",
    );
  });
});

// ─── setAuthCookies ─────────────────────────────────────────────────────────

describe("setAuthCookies", () => {
  let setAuthCookies: typeof import("./auth").setAuthCookies;

  beforeEach(async () => {
    jest.resetModules();
    mockCookieStore.set.mockReset();
    jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
      CognitoIdentityProviderClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockCognitoSend })),
      InitiateAuthCommand: jest.fn(),
      RevokeTokenCommand: jest.fn(),
      GlobalSignOutCommand: jest.fn(),
    }));
    jest.mock("jose", () => ({
      jwtVerify: mockJwtVerify,
      createRemoteJWKSet: mockCreateRemoteJWKSet,
    }));
    jest.mock("next/headers", () => ({
      cookies: jest.fn(async () => mockCookieStore),
    }));
    jest.mock("./secrets", () => ({
      loadSecrets: jest.fn(async () => ({
        cognito: {
          userPoolId: "us-east-1_TestPool",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
        },
        dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
        s3: { bucketName: "portfolio-assets", region: "us-east-1" },
        apiKeys: {},
      })),
    }));
    const mod = await import("./auth");
    setAuthCookies = mod.setAuthCookies;
  });

  it("sets all three cookies for a login result", async () => {
    await setAuthCookies({
      idToken: "id-token",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
    });

    expect(mockCookieStore.set).toHaveBeenCalledTimes(3);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "portfolio_id_token",
      "id-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      }),
    );
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "portfolio_access_token",
      "access-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 3600,
      }),
    );
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "portfolio_refresh_token",
      "refresh-token",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      }),
    );
  });

  it("sets only id and access cookies for a refresh result", async () => {
    await setAuthCookies({
      idToken: "new-id-token",
      accessToken: "new-access-token",
      expiresIn: 3600,
    });

    expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "portfolio_id_token",
      "new-id-token",
      expect.objectContaining({ maxAge: 3600 }),
    );
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "portfolio_access_token",
      "new-access-token",
      expect.objectContaining({ maxAge: 3600 }),
    );
  });
});

// ─── refreshSession ─────────────────────────────────────────────────────────

describe("refreshSession", () => {
  let refreshSession: typeof import("./auth").refreshSession;

  beforeEach(async () => {
    jest.resetModules();
    mockCognitoSend.mockReset();
    jest.mock("@aws-sdk/client-cognito-identity-provider", () => ({
      CognitoIdentityProviderClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockCognitoSend })),
      InitiateAuthCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
      RevokeTokenCommand: jest.fn(),
      GlobalSignOutCommand: jest.fn(),
    }));
    jest.mock("jose", () => ({
      jwtVerify: mockJwtVerify,
      createRemoteJWKSet: mockCreateRemoteJWKSet,
    }));
    jest.mock("next/headers", () => ({
      cookies: jest.fn(async () => mockCookieStore),
    }));
    jest.mock("./secrets", () => ({
      loadSecrets: jest.fn(async () => ({
        cognito: {
          userPoolId: "us-east-1_TestPool",
          clientId: "test-client-id",
          clientSecret: "test-client-secret",
        },
        dynamodb: { tableName: "PortfolioTable", region: "us-east-1" },
        s3: { bucketName: "portfolio-assets", region: "us-east-1" },
        apiKeys: {},
      })),
    }));
    const mod = await import("./auth");
    refreshSession = mod.refreshSession;
  });

  it("returns new tokens on successful refresh", async () => {
    mockCognitoSend.mockResolvedValue({
      AuthenticationResult: {
        IdToken: "new-id-token",
        AccessToken: "new-access-token",
        ExpiresIn: 3600,
      },
    });

    const result = await refreshSession("valid-refresh-token", "test-user-sub");

    expect(result.idToken).toBe("new-id-token");
    expect(result.accessToken).toBe("new-access-token");
    expect(result.expiresIn).toBe(3600);
  });

  it("throws when refresh fails", async () => {
    mockCognitoSend.mockResolvedValue({});

    await expect(refreshSession("invalid-refresh-token", "test-user-sub")).rejects.toThrow(
      "Token refresh failed: no result returned",
    );
  });
});
