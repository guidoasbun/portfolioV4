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

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  Keys: {
    skillCategory: {
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

// ─── PUT /api/skills/[id] ───────────────────────────────────────────────────

describe("PUT /api/skills/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const existingSkill = {
    PK: "SKILL#skill-1",
    SK: "META",
    id: "skill-1",
    name: "TypeScript",
    categoryId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };

  it("updates skill name (GSI key change triggers delete+put)", async () => {
    mockGetItem.mockResolvedValueOnce(existingSkill);
    mockDeleteItem.mockResolvedValueOnce(undefined);
    mockPutItem.mockResolvedValueOnce(undefined);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "JavaScript" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("JavaScript");
    expect(body.data.categoryId).toBe("a1b2c3d4-e5f6-4890-abcd-ef1234567890");

    // Should delete the old item
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "SKILL#skill-1",
      SK: "META",
    });
    // Should put new item with updated GSI1SK
    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        PK: "SKILL#skill-1",
        SK: "META",
        GSI1PK: "SKILLS#a1b2c3d4-e5f6-4890-abcd-ef1234567890",
        GSI1SK: "NAME#JavaScript",
        name: "JavaScript",
      }),
    );
  });

  it("updates skill categoryId (GSI key change triggers delete+put)", async () => {
    mockGetItem
      .mockResolvedValueOnce(existingSkill) // existing skill
      .mockResolvedValueOnce({ id: "a1b2c3d4-e5f6-4890-abcd-ef1234567891", label: "Frameworks" }); // new category exists
    mockDeleteItem.mockResolvedValueOnce(undefined);
    mockPutItem.mockResolvedValueOnce(undefined);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "a1b2c3d4-e5f6-4890-abcd-ef1234567891" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.categoryId).toBe("a1b2c3d4-e5f6-4890-abcd-ef1234567891");
    expect(mockDeleteItem).toHaveBeenCalled();
    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        GSI1PK: "SKILLS#a1b2c3d4-e5f6-4890-abcd-ef1234567891",
      }),
    );
  });

  it("returns 404 when skill does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/nonexistent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Skill not found");
  });

  it("returns 400 when new categoryId does not exist", async () => {
    mockGetItem
      .mockResolvedValueOnce(existingSkill) // existing skill
      .mockResolvedValueOnce(null); // new category not found

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: "a1b2c3d4-e5f6-4890-abcd-ef1234567892" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Category not found");
  });

  it("returns 400 when no fields provided", async () => {
    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("At least one field must be provided for update");
  });

  it("returns 400 for malformed JSON", async () => {
    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Invalid request body");
  });

  it("returns 500 when DynamoDB fails", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    }) as unknown as NextRequest;

    const response = await PUT(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to update skill");
  });
});

// ─── DELETE /api/skills/[id] ────────────────────────────────────────────────

describe("DELETE /api/skills/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes a skill successfully", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "SKILL#skill-1",
      SK: "META",
      id: "skill-1",
      name: "TypeScript",
      categoryId: "cat-1",
    });
    mockDeleteItem.mockResolvedValueOnce(undefined);

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "DELETE",
    }) as unknown as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Skill deleted successfully");
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "SKILL#skill-1",
      SK: "META",
    });
  });

  it("returns 404 when skill does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/nonexistent", {
      method: "DELETE",
    }) as unknown as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "nonexistent" }) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Skill not found");
  });

  it("returns 500 when DynamoDB fails", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/skills/skill-1", {
      method: "DELETE",
    }) as unknown as NextRequest;

    const response = await DELETE(request, { params: Promise.resolve({ id: "skill-1" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to delete skill");
  });
});
