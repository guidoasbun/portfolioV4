/**
 * @jest-environment node
 */

/**
 * Property-based tests for Message Listing Order and Pagination.
 *
 * Feature: portfolio-rebuild
 * Property 13: Message Listing Order and Pagination
 *
 * Validates: Requirements 11.1, 11.2
 *
 * For any set of messages with submission timestamps and any page number,
 * the message listing SHALL return messages sorted by submission timestamp
 * in descending order, with at most 20 messages per page, and each entry
 * SHALL show the message body truncated to 100 characters.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryAllItems = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();

jest.mock("@/lib/dynamodb", () => ({
  queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
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
 * Generate a random ISO timestamp within a reasonable range.
 * Uses integer milliseconds to avoid invalid date issues with fc.date().
 */
const isoTimestampArb: fc.Arbitrary<string> = fc
  .integer({
    min: new Date("2020-01-01T00:00:00Z").getTime(),
    max: new Date("2025-12-31T23:59:59Z").getTime(),
  })
  .map((ms) => new Date(ms).toISOString());

/**
 * Generate a random message body with length between 0 and 500 characters.
 */
const messageBodyArb: fc.Arbitrary<string> = fc.string({ minLength: 0, maxLength: 500 });

/**
 * Generate a single DynamoDB-style message item (already sorted by GSI1SK desc).
 */
function messageItemArb(index: number) {
  return fc
    .record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      email: fc.constant(`user${index}@example.com`),
      body: messageBodyArb,
      isRead: fc.boolean(),
      submittedAt: isoTimestampArb,
    })
    .map((fields) => ({
      PK: `MSG#msg-${index}`,
      SK: "META" as const,
      GSI1PK: "MESSAGES",
      GSI1SK: `DATE#${fields.submittedAt}`,
      type: "message",
      id: `msg-${index}`,
      ...fields,
    }));
}

/**
 * Generate an array of 1-50 message items, pre-sorted by submittedAt descending
 * (simulating DynamoDB GSI1 with scanIndexForward: false).
 */
const messagesArb = fc
  .integer({ min: 1, max: 50 })
  .chain((count) =>
    fc.tuple(...Array.from({ length: count }, (_, i) => messageItemArb(i))),
  )
  .map((items) =>
    [...items].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    ),
  );

/**
 * Generate a random page number between 1 and 10.
 */
const pageArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 10 });

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(queryParams: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/messages");
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString(), { method: "GET" });
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 13: Message Listing Order and Pagination", () => {
  let GET: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    mockQueryAllItems.mockReset();

    jest.mock("@/lib/dynamodb", () => ({
      queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
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
    GET = mod.GET;
  });

  it("returns messages sorted by submittedAt descending", () => {
    return fc.assert(
      fc.asyncProperty(messagesArb, pageArb, async (messages, page) => {
        mockQueryAllItems.mockReset();
        mockQueryAllItems.mockResolvedValue(messages);

        const response = await GET(createRequest({ page: String(page) }));
        const data = await response.json();

        expect(data.success).toBe(true);

        const items = data.data.items as { submittedAt: string }[];
        for (let i = 0; i < items.length - 1; i++) {
          const current = new Date(items[i]!.submittedAt).getTime();
          const next = new Date(items[i + 1]!.submittedAt).getTime();
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("returns at most 20 items per page", () => {
    return fc.assert(
      fc.asyncProperty(messagesArb, pageArb, async (messages, page) => {
        mockQueryAllItems.mockReset();
        mockQueryAllItems.mockResolvedValue(messages);

        const response = await GET(createRequest({ page: String(page) }));
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.items.length).toBeLessThanOrEqual(20);
      }),
      { numRuns: 100 },
    );
  });

  it("truncates message body to at most 103 characters (100 + '...')", () => {
    return fc.assert(
      fc.asyncProperty(messagesArb, pageArb, async (messages, page) => {
        mockQueryAllItems.mockReset();
        mockQueryAllItems.mockResolvedValue(messages);

        const response = await GET(createRequest({ page: String(page) }));
        const data = await response.json();

        expect(data.success).toBe(true);

        const items = data.data.items as { body: string }[];
        for (const item of items) {
          expect(item.body.length).toBeLessThanOrEqual(103);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("appends '...' when original body exceeds 100 characters", () => {
    return fc.assert(
      fc.asyncProperty(messagesArb, pageArb, async (messages, page) => {
        mockQueryAllItems.mockReset();
        mockQueryAllItems.mockResolvedValue(messages);

        const response = await GET(createRequest({ page: String(page) }));
        const data = await response.json();

        expect(data.success).toBe(true);

        const pageSize = 20;
        const startIndex = (page - 1) * pageSize;
        const pageItems = messages.slice(startIndex, startIndex + pageSize);
        const responseItems = data.data.items as { body: string }[];

        for (let i = 0; i < responseItems.length; i++) {
          const originalBody = pageItems[i]!.body;
          if (originalBody.length > 100) {
            expect(responseItems[i]!.body).toBe(originalBody.slice(0, 100) + "...");
          } else {
            expect(responseItems[i]!.body).toBe(originalBody);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("total matches the number of all messages", () => {
    return fc.assert(
      fc.asyncProperty(messagesArb, pageArb, async (messages, page) => {
        mockQueryAllItems.mockReset();
        mockQueryAllItems.mockResolvedValue(messages);

        const response = await GET(createRequest({ page: String(page) }));
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.data.total).toBe(messages.length);
      }),
      { numRuns: 100 },
    );
  });

  it("totalPages equals Math.ceil(total / pageSize)", () => {
    return fc.assert(
      fc.asyncProperty(messagesArb, pageArb, async (messages, page) => {
        mockQueryAllItems.mockReset();
        mockQueryAllItems.mockResolvedValue(messages);

        const response = await GET(createRequest({ page: String(page) }));
        const data = await response.json();

        expect(data.success).toBe(true);
        const expectedTotalPages = Math.ceil(messages.length / data.data.pageSize);
        expect(data.data.totalPages).toBe(expectedTotalPages);
      }),
      { numRuns: 100 },
    );
  });
});
