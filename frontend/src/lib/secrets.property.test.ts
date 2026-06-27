/**
 * @jest-environment node
 */

/**
 * Property-based tests for Secrets Manager startup validation.
 *
 * Feature: portfolio-rebuild
 * Property 14: Secret Startup Validation
 *
 * Validates: Requirements 14.6, 14.8
 *
 * For any application configuration where one or more required secrets are
 * missing or contain empty/unparseable values, the application startup function
 * SHALL fail and SHALL produce an error message identifying which specific
 * secret is missing or invalid.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSend = jest.fn<(...args: any[]) => any>();

jest.mock("@aws-sdk/client-secrets-manager", () => ({
  SecretsManagerClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  GetSecretValueCommand: jest
    .fn()
    .mockImplementation((input: unknown) => ({ input })),
}));

jest.mock("server-only", () => ({}));

// ─── Constants ──────────────────────────────────────────────────────────────

/**
 * Secret definitions matching the implementation's SECRET_DEFINITIONS.
 * Each secret has a label (used in error messages) and required fields.
 */
const SECRETS = [
  {
    key: "dynamodb",
    label: "DynamoDB configuration",
    requiredFields: ["tableName", "region"],
  },
  {
    key: "cognito",
    label: "Cognito configuration",
    requiredFields: ["userPoolId", "clientId", "clientSecret"],
  },
  {
    key: "s3",
    label: "S3 configuration",
    requiredFields: ["bucketName", "region"],
  },
  {
    key: "apiKeys",
    label: "API keys",
    requiredFields: [] as string[],
  },
] as const;

// ─── Types ──────────────────────────────────────────────────────────────────

type InvalidState =
  | "throws" // Secret retrieval throws (simulating missing secret)
  | "no-secret-string" // Secret has no SecretString (empty)
  | "invalid-json" // Secret contains invalid JSON (unparseable)
  | "missing-field" // Secret is valid JSON but missing required fields
  | "empty-field"; // Secret has required fields with empty/whitespace values

interface SecretConfig {
  index: number; // Which secret (0-3)
  invalidState: InvalidState;
  /** For missing-field: which field index to omit */
  fieldIndex?: number;
  /** For empty-field: which field index to make empty */
  emptyFieldIndex?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a valid secret JSON string for the given secret index.
 */
function buildValidSecret(secretIndex: number): string {
  switch (secretIndex) {
    case 0: // dynamodb
      return JSON.stringify({ tableName: "TestTable", region: "us-east-1" });
    case 1: // cognito
      return JSON.stringify({
        userPoolId: "us-east-1_test",
        clientId: "testClientId",
        clientSecret: "testClientSecret",
      });
    case 2: // s3
      return JSON.stringify({ bucketName: "test-bucket", region: "us-east-1" });
    case 3: // apiKeys
      return JSON.stringify({ testKey: "testValue" });
    default:
      return JSON.stringify({});
  }
}

/**
 * Build an invalid secret response based on the invalid state.
 * Returns either a mock response object or a thrown error behavior.
 */
function configureMockForSecret(
  secretIndex: number,
  config: SecretConfig | null,
): { response?: { SecretString?: string }; throws?: Error } {
  // Valid secret - return proper response
  if (!config) {
    return { response: { SecretString: buildValidSecret(secretIndex) } };
  }

  const secret = SECRETS[secretIndex];

  switch (config.invalidState) {
    case "throws":
      return { throws: new Error("ResourceNotFoundException: secret not found") };

    case "no-secret-string":
      return { response: { SecretString: undefined } };

    case "invalid-json":
      return { response: { SecretString: "{not valid json[[[" } };

    case "missing-field": {
      if (secret.requiredFields.length === 0) {
        // apiKeys has no required fields, so "missing-field" is treated as valid JSON
        // but we still want to test it - use a different approach
        return { response: { SecretString: JSON.stringify({}) } };
      }
      const fieldIdx = (config.fieldIndex ?? 0) % secret.requiredFields.length;
      const fields: Record<string, string> = {};
      for (let i = 0; i < secret.requiredFields.length; i++) {
        if (i !== fieldIdx) {
          fields[secret.requiredFields[i]] = "validValue";
        }
      }
      return { response: { SecretString: JSON.stringify(fields) } };
    }

    case "empty-field": {
      if (secret.requiredFields.length === 0) {
        return { response: { SecretString: JSON.stringify({}) } };
      }
      const fieldIdx =
        (config.emptyFieldIndex ?? 0) % secret.requiredFields.length;
      const fields: Record<string, string> = {};
      for (let i = 0; i < secret.requiredFields.length; i++) {
        if (i === fieldIdx) {
          fields[secret.requiredFields[i]] = "   "; // whitespace-only
        } else {
          fields[secret.requiredFields[i]] = "validValue";
        }
      }
      return { response: { SecretString: JSON.stringify(fields) } };
    }
  }
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a secret index (0-3) that has required fields for field-level tests.
 * Only secrets with required fields (dynamodb=0, cognito=1, s3=2) are eligible.
 */
const secretWithFieldsArb = fc.integer({ min: 0, max: 2 });

/**
 * Generate an invalid state that applies to all secrets (including apiKeys).
 */
const universalInvalidStateArb: fc.Arbitrary<InvalidState> = fc.constantFrom(
  "throws" as const,
  "no-secret-string" as const,
  "invalid-json" as const,
);

/**
 * Generate an invalid state that only applies to secrets with required fields.
 */
const fieldInvalidStateArb: fc.Arbitrary<InvalidState> = fc.constantFrom(
  "missing-field" as const,
  "empty-field" as const,
);

/**
 * Generate a random invalid secret configuration for property testing.
 * Ensures we test across all secret types and all invalid states.
 */
const invalidSecretConfigArb: fc.Arbitrary<SecretConfig> = fc.oneof(
  // Any secret can throw, have no SecretString, or have invalid JSON
  fc
    .record({
      index: fc.integer({ min: 0, max: 3 }),
      invalidState: universalInvalidStateArb,
    })
    .map((r) => ({ ...r })),
  // Only secrets with required fields can have missing/empty field issues
  fc
    .record({
      index: secretWithFieldsArb,
      invalidState: fieldInvalidStateArb,
      fieldIndex: fc.integer({ min: 0, max: 10 }),
    })
    .map((r) => ({
      index: r.index,
      invalidState: r.invalidState,
      fieldIndex: r.fieldIndex,
      emptyFieldIndex: r.fieldIndex,
    })),
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 14: Secret Startup Validation", () => {
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
    jest.mock("server-only", () => ({}));
  });

  it("loadSecrets() rejects and identifies the failing secret for any invalid configuration", async () => {
    await fc.assert(
      fc.asyncProperty(invalidSecretConfigArb, async (config) => {
        // Reset for each iteration
        mockSend.mockReset();

        // Set up mock responses for all 4 secrets in order
        for (let i = 0; i < 4; i++) {
          const mockConfig =
            i === config.index ? config : null;
          const behavior = configureMockForSecret(i, mockConfig);

          if (behavior.throws) {
            mockSend.mockRejectedValueOnce(behavior.throws);
          } else {
            mockSend.mockResolvedValueOnce(behavior.response);
          }
        }

        // Re-import to get fresh module (bypass cache)
        jest.resetModules();
        jest.mock("@aws-sdk/client-secrets-manager", () => ({
          SecretsManagerClient: jest
            .fn()
            .mockImplementation(() => ({ send: mockSend })),
          GetSecretValueCommand: jest
            .fn()
            .mockImplementation((input: unknown) => ({ input })),
        }));
        jest.mock("server-only", () => ({}));

        const { loadSecrets, clearSecretsCache } = await import("./secrets");
        clearSecretsCache();

        const secret = SECRETS[config.index];

        // Skip field-level tests for apiKeys (no required fields)
        if (
          secret.requiredFields.length === 0 &&
          (config.invalidState === "missing-field" ||
            config.invalidState === "empty-field")
        ) {
          // apiKeys with no required fields and valid JSON won't fail on field validation
          // but it should still succeed - this is expected, skip this case
          return;
        }

        // The loadSecrets call MUST reject
        let thrownError: Error | undefined;
        try {
          await loadSecrets();
        } catch (e) {
          thrownError = e as Error;
        }

        // Assertion 1: loadSecrets must throw
        expect(thrownError).toBeDefined();

        // Assertion 2: Error message must identify which secret failed
        const errorMessage = thrownError!.message;
        const identifiesSecret =
          errorMessage.includes(secret.label) ||
          errorMessage.includes(secret.key);
        expect(identifiesSecret).toBe(true);

        // Assertion 3: Error message indicates the nature of the failure
        let indicatesNature = false;
        switch (config.invalidState) {
          case "throws":
            indicatesNature =
              errorMessage.includes("Failed to retrieve") ||
              errorMessage.includes("retrieve");
            break;
          case "no-secret-string":
            indicatesNature =
              errorMessage.includes("no string value") ||
              errorMessage.includes("has no");
            break;
          case "invalid-json":
            indicatesNature =
              errorMessage.includes("not valid JSON") ||
              errorMessage.includes("JSON");
            break;
          case "missing-field":
            indicatesNature =
              errorMessage.includes("missing required field") ||
              errorMessage.includes("missing");
            break;
          case "empty-field":
            indicatesNature =
              errorMessage.includes("empty value") ||
              errorMessage.includes("empty");
            break;
        }
        expect(indicatesNature).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
