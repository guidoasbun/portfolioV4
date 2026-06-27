/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPutItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
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

// Mock crypto.randomUUID
const mockUUID = "11111111-2222-4333-a444-555555555555";
jest.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);

// ─── POST /api/skills ───────────────────────────────────────────────────────

describe("POST /api/skills", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a skill successfully", async () => {
    const categoryId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    // Category exists
    mockGetItem.mockResolvedValueOnce({
      PK: `SKILLCAT#${categoryId}`,
      SK: "META",
      id: categoryId,
      label: "Languages",
    });
    // putItem succeeds
    mockPutItem.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TypeScript", categoryId }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(mockUUID);
    expect(body.data.name).toBe("TypeScript");
    expect(body.data.categoryId).toBe(categoryId);
    expect(body.data.createdAt).toBeDefined();
    expect(body.data.updatedAt).toBeDefined();

    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        PK: `SKILL#${mockUUID}`,
        SK: "META",
        GSI1PK: `SKILLS#${categoryId}`,
        GSI1SK: "NAME#TypeScript",
        type: "skill",
        id: mockUUID,
        name: "TypeScript",
        categoryId,
      }),
    );
  });

  it("returns 400 for invalid body (missing name)", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
    expect(body.errors.name).toBeDefined();
  });

  it("returns 400 for invalid body (missing categoryId)", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TypeScript" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
    expect(body.errors.categoryId).toBeDefined();
  });

  it("returns 400 when category does not exist", async () => {
    const categoryId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    mockGetItem.mockResolvedValueOnce(null);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TypeScript", categoryId }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Category not found");
  });

  it("returns 400 for malformed JSON", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 500 when DynamoDB fails", async () => {
    const categoryId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    mockGetItem.mockResolvedValueOnce({ id: categoryId });
    mockPutItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TypeScript", categoryId }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to create skill");
  });
});
