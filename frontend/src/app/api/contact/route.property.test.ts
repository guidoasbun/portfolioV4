/**
 * @jest-environment node
 */

/**
 * Property-based tests for Message Persistence Integrity.
 *
 * Feature: portfolio-rebuild
 * Property 9: Message Persistence Integrity
 *
 * Validates: Requirements 8.4
 *
 * For any valid contact message (name, email, body), after successful save
 * the stored record SHALL contain the original name, email, body unchanged,
 * and a submission timestamp that is a valid ISO 8601 datetime.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPutItem = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock("@/lib/dynamodb", () => ({
  putItem: (...args: unknown[]) => mockPutItem(...args),
  Keys: {
    message: {
      pk: (id: string) => `MSG#${id}`,
      sk: () => "META" as const,
      gsi1pk: () => "MESSAGES" as const,
      gsi1sk: (timestamp: string) => `DATE#${timestamp}`,
    },
  },
}));

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid name: non-empty string ≤100 characters that has
 * non-whitespace content after trimming.
 */
const validNameArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate a valid email address that passes Zod's .email() validation.
 * Constructed from safe characters to avoid RFC-valid but Zod-rejected patterns.
 */
const validEmailArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,14}$/).filter((s) => s.length >= 1),
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/).filter((s) => s.length >= 1),
    fc.constantFrom("com", "org", "net", "io", "co"),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/**
 * Generate a valid message body: non-empty string ≤2000 characters that has
 * non-whitespace content after trimming.
 */
const validMessageArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 2000 })
  .filter((s) => s.trim().length > 0);

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Validate that a string is a valid ISO 8601 datetime.
 * A valid ISO 8601 datetime parses to a valid Date and round-trips via toISOString().
 */
function isValidISO8601(value: string): boolean {
  const date = new Date(value);
  if (isNaN(date.getTime())) return false;
  // Verify it matches the ISO 8601 format produced by toISOString()
  return date.toISOString() === value;
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 9: Message Persistence Integrity", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    mockPutItem.mockReset();
    mockPutItem.mockResolvedValue(undefined);

    jest.mock("@/lib/dynamodb", () => ({
      putItem: (...args: unknown[]) => mockPutItem(...args),
      Keys: {
        message: {
          pk: (id: string) => `MSG#${id}`,
          sk: () => "META" as const,
          gsi1pk: () => "MESSAGES" as const,
          gsi1sk: (timestamp: string) => `DATE#${timestamp}`,
        },
      },
    }));

    const mod = await import("./route");
    POST = mod.POST;
  });

  it("stored name equals input name (trimmed)", () => {
    return fc.assert(
      fc.asyncProperty(validNameArb, validEmailArb, validMessageArb, async (name, email, message) => {
        mockPutItem.mockReset();
        mockPutItem.mockResolvedValue(undefined);

        const request = createRequest({ name, email, message });
        await POST(request);

        expect(mockPutItem).toHaveBeenCalledTimes(1);
        const savedItem = mockPutItem.mock.calls[0]![0] as Record<string, unknown>;
        expect(savedItem.name).toBe(name.trim());
      }),
      { numRuns: 100 },
    );
  });

  it("stored email equals input email (trimmed)", () => {
    return fc.assert(
      fc.asyncProperty(validNameArb, validEmailArb, validMessageArb, async (name, email, message) => {
        mockPutItem.mockReset();
        mockPutItem.mockResolvedValue(undefined);

        const request = createRequest({ name, email, message });
        await POST(request);

        expect(mockPutItem).toHaveBeenCalledTimes(1);
        const savedItem = mockPutItem.mock.calls[0]![0] as Record<string, unknown>;
        expect(savedItem.email).toBe(email.trim());
      }),
      { numRuns: 100 },
    );
  });

  it("stored body equals input message (trimmed)", () => {
    return fc.assert(
      fc.asyncProperty(validNameArb, validEmailArb, validMessageArb, async (name, email, message) => {
        mockPutItem.mockReset();
        mockPutItem.mockResolvedValue(undefined);

        const request = createRequest({ name, email, message });
        await POST(request);

        expect(mockPutItem).toHaveBeenCalledTimes(1);
        const savedItem = mockPutItem.mock.calls[0]![0] as Record<string, unknown>;
        expect(savedItem.body).toBe(message.trim());
      }),
      { numRuns: 100 },
    );
  });

  it("submittedAt is a valid ISO 8601 datetime", () => {
    return fc.assert(
      fc.asyncProperty(validNameArb, validEmailArb, validMessageArb, async (name, email, message) => {
        mockPutItem.mockReset();
        mockPutItem.mockResolvedValue(undefined);

        const request = createRequest({ name, email, message });
        await POST(request);

        expect(mockPutItem).toHaveBeenCalledTimes(1);
        const savedItem = mockPutItem.mock.calls[0]![0] as Record<string, unknown>;
        expect(typeof savedItem.submittedAt).toBe("string");
        expect(isValidISO8601(savedItem.submittedAt as string)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("isRead is false for newly submitted messages", () => {
    return fc.assert(
      fc.asyncProperty(validNameArb, validEmailArb, validMessageArb, async (name, email, message) => {
        mockPutItem.mockReset();
        mockPutItem.mockResolvedValue(undefined);

        const request = createRequest({ name, email, message });
        await POST(request);

        expect(mockPutItem).toHaveBeenCalledTimes(1);
        const savedItem = mockPutItem.mock.calls[0]![0] as Record<string, unknown>;
        expect(savedItem.isRead).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("response status is 201 with success: true", () => {
    return fc.assert(
      fc.asyncProperty(validNameArb, validEmailArb, validMessageArb, async (name, email, message) => {
        mockPutItem.mockReset();
        mockPutItem.mockResolvedValue(undefined);

        const request = createRequest({ name, email, message });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
