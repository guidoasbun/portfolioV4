/**
 * @jest-environment node
 */

/**
 * Unit tests for GET /api/messages route handler.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(queryParams: Record<string, string> = {}): Request {
  const url = new URL("http://localhost:3000/api/messages");
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new Request(url.toString(), { method: "GET" });
}

function createMessageItem(overrides: Partial<Record<string, unknown>> = {}) {
  const id = overrides.id ?? "msg-1";
  const submittedAt = (overrides.submittedAt as string) ?? "2024-01-15T10:00:00Z";
  return {
    PK: `MSG#${id}`,
    SK: "META",
    GSI1PK: "MESSAGES",
    GSI1SK: `DATE#${submittedAt}`,
    type: "message",
    id,
    name: overrides.name ?? "John Doe",
    email: overrides.email ?? "john@example.com",
    body: overrides.body ?? "Hello, this is a test message.",
    isRead: overrides.isRead ?? false,
    submittedAt,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/messages", () => {
  let GET: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    mockQueryAllItems.mockReset();
    mockQueryAllItems.mockResolvedValue([]);

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

  describe("pagination", () => {
    it("returns paginated response with default page and pageSize", async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        createMessageItem({ id: `msg-${i}`, submittedAt: `2024-01-${String(15 - i).padStart(2, "0")}T10:00:00Z` }),
      );
      mockQueryAllItems.mockResolvedValueOnce(items);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(5);
      expect(data.data.total).toBe(5);
      expect(data.data.page).toBe(1);
      expect(data.data.pageSize).toBe(20);
      expect(data.data.totalPages).toBe(1);
    });

    it("paginates results correctly when there are more items than pageSize", async () => {
      const items = Array.from({ length: 25 }, (_, i) =>
        createMessageItem({ id: `msg-${i}` }),
      );
      mockQueryAllItems.mockResolvedValueOnce(items);

      const response = await GET(createRequest({ page: "2", pageSize: "10" }));
      const data = await response.json();

      expect(data.data.items).toHaveLength(10);
      expect(data.data.total).toBe(25);
      expect(data.data.page).toBe(2);
      expect(data.data.pageSize).toBe(10);
      expect(data.data.totalPages).toBe(3);
    });

    it("caps pageSize at 20", async () => {
      const items = Array.from({ length: 30 }, (_, i) =>
        createMessageItem({ id: `msg-${i}` }),
      );
      mockQueryAllItems.mockResolvedValueOnce(items);

      const response = await GET(createRequest({ pageSize: "50" }));
      const data = await response.json();

      expect(data.data.pageSize).toBe(20);
      expect(data.data.items).toHaveLength(20);
    });

    it("returns empty items for page beyond total pages", async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        createMessageItem({ id: `msg-${i}` }),
      );
      mockQueryAllItems.mockResolvedValueOnce(items);

      const response = await GET(createRequest({ page: "10" }));
      const data = await response.json();

      expect(data.data.items).toHaveLength(0);
      expect(data.data.total).toBe(5);
      expect(data.data.page).toBe(10);
    });

    it("defaults page to 1 for invalid page values", async () => {
      mockQueryAllItems.mockResolvedValueOnce([]);

      const response = await GET(createRequest({ page: "abc" }));
      const data = await response.json();

      expect(data.data.page).toBe(1);
    });
  });

  describe("body truncation", () => {
    it("truncates message body longer than 100 characters", async () => {
      const longBody = "a".repeat(150);
      mockQueryAllItems.mockResolvedValueOnce([
        createMessageItem({ body: longBody }),
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.data.items[0].body).toBe("a".repeat(100) + "...");
      expect(data.data.items[0].body.length).toBe(103);
    });

    it("does not truncate body with exactly 100 characters", async () => {
      const exactBody = "b".repeat(100);
      mockQueryAllItems.mockResolvedValueOnce([
        createMessageItem({ body: exactBody }),
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.data.items[0].body).toBe(exactBody);
    });

    it("does not truncate short message bodies", async () => {
      const shortBody = "Hello there!";
      mockQueryAllItems.mockResolvedValueOnce([
        createMessageItem({ body: shortBody }),
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.data.items[0].body).toBe(shortBody);
    });
  });

  describe("query parameters", () => {
    it("queries GSI1 with correct key condition for descending sort", async () => {
      mockQueryAllItems.mockResolvedValueOnce([]);

      await GET(createRequest());

      expect(mockQueryAllItems).toHaveBeenCalledWith({
        indexName: "GSI1",
        keyConditionExpression: "GSI1PK = :gsi1pk",
        expressionAttributeValues: {
          ":gsi1pk": "MESSAGES",
        },
        scanIndexForward: false,
      });
    });
  });

  describe("error handling", () => {
    it("returns 500 when DynamoDB throws an error", async () => {
      mockQueryAllItems.mockRejectedValueOnce(new Error("DynamoDB error"));

      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Failed to fetch messages");
    });
  });

  describe("response mapping", () => {
    it("maps DynamoDB items to Message entities correctly", async () => {
      mockQueryAllItems.mockResolvedValueOnce([
        createMessageItem({
          id: "msg-42",
          name: "Alice",
          email: "alice@example.com",
          body: "Test message body",
          isRead: true,
          submittedAt: "2024-03-10T12:00:00Z",
        }),
      ]);

      const response = await GET(createRequest());
      const data = await response.json();

      expect(data.data.items[0]).toEqual({
        id: "msg-42",
        name: "Alice",
        email: "alice@example.com",
        body: "Test message body",
        isRead: true,
        submittedAt: "2024-03-10T12:00:00Z",
      });
    });
  });
});
