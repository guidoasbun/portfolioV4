/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { NextRequest } from "next/server";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPutItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  Keys: {
    skillCategory: {
      gsi1pk: () => "SKILLCATS",
      gsi1sk: (order: number) => `ORDER#${String(order).padStart(5, "0")}`,
      pk: (id: string) => `SKILLCAT#${id}`,
      sk: () => "META",
    },
    skill: {
      gsi1pk: (category: string) => `SKILLS#${category}`,
      gsi1sk: (name: string) => `NAME#${name}`,
      pk: (id: string) => `SKILL#${id}`,
      sk: () => "META",
    },
  },
}));

// ─── PUT /api/skills/categories/[id] ────────────────────────────────────────

describe("PUT /api/skills/categories/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const existingCategory = {
    PK: "SKILLCAT#cat-1",
    SK: "META",
    id: "cat-1",
    label: "Languages",
    displayOrder: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  it("updates category label without GSI change", async () => {
    mockGetItem.mockResolvedValueOnce(existingCategory);
    mockPutItem.mockResolvedValueOnce(undefined);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Programming Languages" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.label).toBe("Programming Languages");
    expect(body.data.displayOrder).toBe(0);
    // Label change does NOT change GSI key, so no delete needed
    expect(mockDeleteItem).not.toHaveBeenCalled();
    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Programming Languages",
        GSI1SK: "ORDER#00000",
      }),
    );
  });

  it("updates displayOrder (triggers GSI key change: delete+put)", async () => {
    mockGetItem.mockResolvedValueOnce(existingCategory);
    mockDeleteItem.mockResolvedValueOnce(undefined);
    mockPutItem.mockResolvedValueOnce(undefined);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayOrder: 5 }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.displayOrder).toBe(5);
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "SKILLCAT#cat-1",
      SK: "META",
    });
    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        GSI1SK: "ORDER#00005",
        displayOrder: 5,
      }),
    );
  });

  it("returns 404 when category does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "New Label" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Category not found");
  });

  it("returns 400 when no fields provided", async () => {
    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("At least one field must be provided for update");
  });

  it("returns 400 for malformed JSON", async () => {
    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 500 when DynamoDB fails", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Updated" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to update skill category");
  });
});

// ─── DELETE /api/skills/categories/[id] ─────────────────────────────────────

describe("DELETE /api/skills/categories/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes a category with no skills", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "SKILLCAT#cat-1",
      SK: "META",
      id: "cat-1",
      label: "Languages",
      displayOrder: 0,
    });
    // No skills in this category
    mockQueryItems.mockResolvedValueOnce({ items: [] });
    mockDeleteItem.mockResolvedValueOnce(undefined);

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "DELETE",
    }) as unknown as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Category deleted successfully");
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "SKILLCAT#cat-1",
      SK: "META",
    });
  });

  it("rejects deletion when category has skills (409 Conflict)", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "SKILLCAT#cat-1",
      SK: "META",
      id: "cat-1",
      label: "Languages",
      displayOrder: 0,
    });
    // Category has a skill
    mockQueryItems.mockResolvedValueOnce({
      items: [{ PK: "SKILL#s1", SK: "META", id: "s1", name: "TypeScript" }],
    });

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "DELETE",
    }) as unknown as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Cannot delete category that has skills assigned");
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("returns 404 when category does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/nonexistent", {
      method: "DELETE",
    }) as unknown as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Category not found");
  });

  it("checks skills using correct GSI query", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "SKILLCAT#cat-1",
      SK: "META",
      id: "cat-1",
      label: "Languages",
      displayOrder: 0,
    });
    mockQueryItems.mockResolvedValueOnce({ items: [] });
    mockDeleteItem.mockResolvedValueOnce(undefined);

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "DELETE",
    }) as unknown as NextRequest;

    await DELETE(request, { params: Promise.resolve({ id: "cat-1" }) });

    expect(mockQueryItems).toHaveBeenCalledWith({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": "SKILLS#cat-1",
      },
      limit: 1,
    });
  });

  it("returns 500 when DynamoDB fails", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories/cat-1", {
      method: "DELETE",
    }) as unknown as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "cat-1" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to delete skill category");
  });
});
