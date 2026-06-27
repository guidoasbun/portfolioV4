/**
 * @jest-environment node
 */

/**
 * Unit tests for GET /api/messages/[id] and DELETE /api/messages/[id] route handlers.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpdateItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
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

const createMockRequest = () => ({}) as NextRequest;

function createMessageDynamoItem(overrides: Partial<Record<string, unknown>> = {}) {
  const id = (overrides.id as string) ?? "msg-1";
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

describe("GET /api/messages/[id]", () => {
  let GET: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    mockGetItem.mockReset();
    mockUpdateItem.mockReset();
    mockDeleteItem.mockReset();

    jest.mock("@/lib/dynamodb", () => ({
      getItem: (...args: unknown[]) => mockGetItem(...args),
      deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
      updateItem: (...args: unknown[]) => mockUpdateItem(...args),
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

  it("returns a full message when found", async () => {
    mockGetItem.mockResolvedValueOnce(
      createMessageDynamoItem({
        id: "msg-42",
        name: "Alice",
        email: "alice@example.com",
        body: "This is the full message body that is not truncated at all.",
        isRead: false,
        submittedAt: "2024-03-10T12:00:00Z",
      }),
    );
    mockUpdateItem.mockResolvedValueOnce(null);

    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "msg-42" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual({
      id: "msg-42",
      name: "Alice",
      email: "alice@example.com",
      body: "This is the full message body that is not truncated at all.",
      isRead: true,
      submittedAt: "2024-03-10T12:00:00Z",
    });
  });

  it("marks an unread message as read", async () => {
    mockGetItem.mockResolvedValueOnce(
      createMessageDynamoItem({ id: "msg-1", isRead: false }),
    );
    mockUpdateItem.mockResolvedValueOnce(null);

    await GET(createMockRequest(), {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(mockUpdateItem).toHaveBeenCalledWith({
      key: {
        PK: "MSG#msg-1",
        SK: "META",
      },
      updateExpression: "SET isRead = :isRead",
      expressionAttributeValues: {
        ":isRead": true,
      },
    });
  });

  it("does not update an already-read message", async () => {
    mockGetItem.mockResolvedValueOnce(
      createMessageDynamoItem({ id: "msg-1", isRead: true }),
    );

    await GET(createMockRequest(), {
      params: Promise.resolve({ id: "msg-1" }),
    });

    expect(mockUpdateItem).not.toHaveBeenCalled();
  });

  it("returns 404 when message does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Message not found");
  });

  it("fetches message using correct DynamoDB key", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    await GET(createMockRequest(), {
      params: Promise.resolve({ id: "test-id-123" }),
    });

    expect(mockGetItem).toHaveBeenCalledWith({
      PK: "MSG#test-id-123",
      SK: "META",
    });
  });

  it("returns 500 when DynamoDB throws an error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("Connection timeout"));

    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "msg-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to fetch message");
  });
});

describe("DELETE /api/messages/[id]", () => {
  let DELETE: (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    mockGetItem.mockReset();
    mockDeleteItem.mockReset();
    mockUpdateItem.mockReset();

    jest.mock("@/lib/dynamodb", () => ({
      getItem: (...args: unknown[]) => mockGetItem(...args),
      deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
      updateItem: (...args: unknown[]) => mockUpdateItem(...args),
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
    DELETE = mod.DELETE;
  });

  it("deletes an existing message and returns success", async () => {
    mockGetItem.mockResolvedValueOnce(createMessageDynamoItem({ id: "msg-1" }));
    mockDeleteItem.mockResolvedValueOnce(undefined);

    const response = await DELETE(createMockRequest(), {
      params: Promise.resolve({ id: "msg-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Message deleted successfully");
  });

  it("calls deleteItem with correct key", async () => {
    mockGetItem.mockResolvedValueOnce(createMessageDynamoItem({ id: "msg-99" }));
    mockDeleteItem.mockResolvedValueOnce(undefined);

    await DELETE(createMockRequest(), {
      params: Promise.resolve({ id: "msg-99" }),
    });

    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "MSG#msg-99",
      SK: "META",
    });
  });

  it("returns 404 when message does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const response = await DELETE(createMockRequest(), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Message not found");
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("returns 500 when DynamoDB throws an error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB unavailable"));

    const response = await DELETE(createMockRequest(), {
      params: Promise.resolve({ id: "msg-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to delete message");
  });

  it("returns 500 when deleteItem fails", async () => {
    mockGetItem.mockResolvedValueOnce(createMessageDynamoItem({ id: "msg-1" }));
    mockDeleteItem.mockRejectedValueOnce(new Error("Delete failed"));

    const response = await DELETE(createMockRequest(), {
      params: Promise.resolve({ id: "msg-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to delete message");
  });
});
