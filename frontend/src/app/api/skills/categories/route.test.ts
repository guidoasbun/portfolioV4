/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPutItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  Keys: {
    skillCategory: {
      gsi1pk: () => "SKILLCATS",
      gsi1sk: (order: number) => `ORDER#${String(order).padStart(5, "0")}`,
      pk: (id: string) => `SKILLCAT#${id}`,
      sk: () => "META",
    },
  },
}));

// Mock crypto.randomUUID
const mockUUID = "11111111-2222-4333-a444-555555555555";
jest.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(mockUUID as `${string}-${string}-${string}-${string}-${string}`);

// ─── GET /api/skills/categories ─────────────────────────────────────────────

describe("GET /api/skills/categories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns all categories including empty ones", async () => {
    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "SKILLCAT#cat1",
          SK: "META",
          id: "cat1",
          label: "Languages",
          displayOrder: 0,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          PK: "SKILLCAT#cat2",
          SK: "META",
          id: "cat2",
          label: "Frameworks",
          displayOrder: 1,
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]).toEqual({
      id: "cat1",
      label: "Languages",
      displayOrder: 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });
  });

  it("returns empty array when no categories exist", async () => {
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("queries GSI1 with correct parameters", async () => {
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    await GET();

    expect(mockQueryItems).toHaveBeenCalledWith({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": "SKILLCATS",
      },
      scanIndexForward: true,
    });
  });

  it("returns 500 when DynamoDB fails", async () => {
    mockQueryItems.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to fetch skill categories");
  });
});

// ─── POST /api/skills/categories ────────────────────────────────────────────

describe("POST /api/skills/categories", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a category successfully", async () => {
    mockPutItem.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Languages", displayOrder: 1 }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(mockUUID);
    expect(body.data.label).toBe("Languages");
    expect(body.data.displayOrder).toBe(1);

    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        PK: `SKILLCAT#${mockUUID}`,
        SK: "META",
        GSI1PK: "SKILLCATS",
        GSI1SK: "ORDER#00001",
        type: "skillCategory",
        id: mockUUID,
        label: "Languages",
        displayOrder: 1,
      }),
    );
  });

  it("defaults displayOrder to 0 when not provided", async () => {
    mockPutItem.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Frameworks" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.displayOrder).toBe(0);
    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        GSI1SK: "ORDER#00000",
        displayOrder: 0,
      }),
    );
  });

  it("returns 400 for missing label", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayOrder: 1 }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
    expect(body.errors.label).toBeDefined();
  });

  it("returns 400 for malformed JSON", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories", {
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
    mockPutItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/skills/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Languages" }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to create skill category");
  });
});
