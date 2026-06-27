/**
 * @jest-environment node
 */

/**
 * Tests for Secrets Manager client — startup validation and error handling.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSend = jest.fn<(...args: any[]) => any>();

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  GetSecretValueCommand: jest.fn().mockImplementation((input: unknown) => ({
    input,
  })),
}));

// ─── validateSecretFields (pure, synchronous) ───────────────────────────────

describe("validateSecretFields", () => {
  let validateSecretFields: typeof import("./secrets").validateSecretFields;

  beforeEach(async () => {
    jest.resetModules();
    jest.mock("@aws-sdk/client-secrets-manager", () => ({
      SecretsManagerClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockSend })),
      GetSecretValueCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
    }));
    const mod = await import("./secrets");
    validateSecretFields = mod.validateSecretFields;
  });

  it("passes when all required fields are present and non-empty", () => {
    const parsed = { tableName: "MyTable", region: "us-east-1" };
    expect(() =>
      validateSecretFields(
        parsed,
        ["tableName", "region"],
        "DynamoDB configuration",
        "test-secret",
      ),
    ).not.toThrow();
  });

  it("throws when a required field is missing", () => {
    const parsed = { tableName: "MyTable" };
    expect(() =>
      validateSecretFields(
        parsed,
        ["tableName", "region"],
        "DynamoDB configuration",
        "test-secret",
      ),
    ).toThrow(
      'Secret "DynamoDB configuration" (test-secret) is missing required field "region"',
    );
  });

  it("throws when a required field is null", () => {
    const parsed = { tableName: "MyTable", region: null };
    expect(() =>
      validateSecretFields(
        parsed,
        ["tableName", "region"],
        "DynamoDB configuration",
        "test-secret",
      ),
    ).toThrow(
      'Secret "DynamoDB configuration" (test-secret) is missing required field "region"',
    );
  });

  it("throws when a required field is empty string", () => {
    const parsed = { tableName: "", region: "us-east-1" };
    expect(() =>
      validateSecretFields(
        parsed,
        ["tableName", "region"],
        "DynamoDB configuration",
        "test-secret",
      ),
    ).toThrow(
      'Secret "DynamoDB configuration" (test-secret) has empty value for field "tableName"',
    );
  });

  it("throws when a required field is whitespace-only", () => {
    const parsed = { tableName: "   ", region: "us-east-1" };
    expect(() =>
      validateSecretFields(
        parsed,
        ["tableName", "region"],
        "DynamoDB configuration",
        "test-secret",
      ),
    ).toThrow(
      'Secret "DynamoDB configuration" (test-secret) has empty value for field "tableName"',
    );
  });

  it("passes with no required fields", () => {
    const parsed = { anyKey: "anyValue" };
    expect(() =>
      validateSecretFields(parsed, [], "API keys", "test-secret"),
    ).not.toThrow();
  });
});

// ─── loadSecrets ────────────────────────────────────────────────────────────

describe("loadSecrets", () => {
  beforeEach(async () => {
    jest.resetModules();
    mockSend.mockReset();
    jest.mock("@aws-sdk/client-secrets-manager", () => ({
      SecretsManagerClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockSend })),
      GetSecretValueCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
    }));
  });

  function setupValidSecrets() {
    mockSend
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          tableName: "PortfolioTable",
          region: "us-east-1",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          userPoolId: "us-east-1_abc",
          clientId: "client123",
          clientSecret: "secret456",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          bucketName: "my-bucket",
          region: "us-east-1",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({ someApiKey: "key-value" }),
      });
  }

  it("loads and returns all secrets when all are valid", async () => {
    setupValidSecrets();
    const { loadSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    const secrets = await loadSecrets();

    expect(secrets.dynamodb.tableName).toBe("PortfolioTable");
    expect(secrets.dynamodb.region).toBe("us-east-1");
    expect(secrets.cognito.userPoolId).toBe("us-east-1_abc");
    expect(secrets.cognito.clientId).toBe("client123");
    expect(secrets.cognito.clientSecret).toBe("secret456");
    expect(secrets.s3.bucketName).toBe("my-bucket");
    expect(secrets.s3.region).toBe("us-east-1");
    expect(secrets.apiKeys.someApiKey).toBe("key-value");
  });

  it("caches secrets after first successful load", async () => {
    setupValidSecrets();
    const { loadSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    await loadSecrets();
    await loadSecrets();

    // Only called 4 times (once per secret), not 8
    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  it("throws when a secret cannot be retrieved", async () => {
    mockSend.mockRejectedValueOnce(new Error("ResourceNotFoundException"));
    const { loadSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    await expect(loadSecrets()).rejects.toThrow(
      'Failed to retrieve secret "DynamoDB configuration"',
    );
  });

  it("throws when a secret has no SecretString", async () => {
    mockSend.mockResolvedValueOnce({ SecretString: undefined });
    const { loadSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    await expect(loadSecrets()).rejects.toThrow("has no string value");
  });

  it("throws when a secret contains invalid JSON", async () => {
    mockSend.mockResolvedValueOnce({ SecretString: "not-json{" });
    const { loadSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    await expect(loadSecrets()).rejects.toThrow("is not valid JSON");
  });

  it("throws when a required field is missing from a secret", async () => {
    // DynamoDB config missing 'region'
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ tableName: "Table" }),
    });
    const { loadSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    await expect(loadSecrets()).rejects.toThrow(
      'is missing required field "region"',
    );
  });

  it("throws when a required field is empty in a secret", async () => {
    mockSend.mockResolvedValueOnce({
      SecretString: JSON.stringify({ tableName: "", region: "us-east-1" }),
    });
    const { loadSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    await expect(loadSecrets()).rejects.toThrow(
      'has empty value for field "tableName"',
    );
  });
});

// ─── validateSecretsAtStartup ───────────────────────────────────────────────

describe("validateSecretsAtStartup", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    jest.mock("@aws-sdk/client-secrets-manager", () => ({
      SecretsManagerClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockSend })),
      GetSecretValueCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
    }));
  });

  it("succeeds when all secrets are valid", async () => {
    mockSend
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          tableName: "T",
          region: "us-east-1",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          userPoolId: "pool",
          clientId: "cid",
          clientSecret: "cs",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          bucketName: "bucket",
          region: "us-east-1",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({ key: "val" }),
      });

    const { validateSecretsAtStartup, clearSecretsCache } = await import(
      "./secrets"
    );
    clearSecretsCache();

    await expect(validateSecretsAtStartup()).resolves.toBeUndefined();
  });

  it("throws with startup failure message when secrets are invalid", async () => {
    mockSend.mockRejectedValueOnce(new Error("Access denied"));
    const { validateSecretsAtStartup, clearSecretsCache } = await import(
      "./secrets"
    );
    clearSecretsCache();

    await expect(validateSecretsAtStartup()).rejects.toThrow(
      "Application startup failed",
    );
  });
});

// ─── getSecrets ─────────────────────────────────────────────────────────────

describe("getSecrets", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();
    jest.mock("@aws-sdk/client-secrets-manager", () => ({
      SecretsManagerClient: jest
        .fn()
        .mockImplementation(() => ({ send: mockSend })),
      GetSecretValueCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
    }));
  });

  it("throws when secrets have not been loaded", async () => {
    const { getSecrets, clearSecretsCache } = await import("./secrets");
    clearSecretsCache();

    expect(() => getSecrets()).toThrow("Secrets have not been loaded");
  });

  it("returns cached secrets after loadSecrets is called", async () => {
    mockSend
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          tableName: "T",
          region: "us-east-1",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          userPoolId: "pool",
          clientId: "cid",
          clientSecret: "cs",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({
          bucketName: "bucket",
          region: "us-east-1",
        }),
      })
      .mockResolvedValueOnce({
        SecretString: JSON.stringify({ key: "val" }),
      });

    const { loadSecrets, getSecrets, clearSecretsCache } = await import(
      "./secrets"
    );
    clearSecretsCache();

    await loadSecrets();
    const secrets = getSecrets();

    expect(secrets.dynamodb.tableName).toBe("T");
    expect(secrets.cognito.userPoolId).toBe("pool");
    expect(secrets.s3.bucketName).toBe("bucket");
  });
});
