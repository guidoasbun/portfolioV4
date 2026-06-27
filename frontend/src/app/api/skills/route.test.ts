/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
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

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/skills", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns skills grouped by category in display order", async () => {
    // First call: query categories
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
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    // Second call: skills for cat1 (Languages)
    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "SKILL#s1",
          SK: "META",
          id: "s1",
          name: "TypeScript",
          categoryId: "cat1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          PK: "SKILL#s2",
          SK: "META",
          id: "s2",
          name: "Python",
          categoryId: "cat1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    // Third call: skills for cat2 (Frameworks)
    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "SKILL#s3",
          SK: "META",
          id: "s3",
          name: "Next.js",
          categoryId: "cat2",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
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
      skills: [
        { id: "s1", name: "TypeScript" },
        { id: "s2", name: "Python" },
      ],
    });

    expect(body.data[1]).toEqual({
      id: "cat2",
      label: "Frameworks",
      displayOrder: 1,
      skills: [{ id: "s3", name: "Next.js" }],
    });
  });

  it("filters out empty categories", async () => {
    // Categories query
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
          label: "Empty Category",
          displayOrder: 1,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    // Skills for cat1 — has skills
    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "SKILL#s1",
          SK: "META",
          id: "s1",
          name: "TypeScript",
          categoryId: "cat1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    // Skills for cat2 — empty
    mockQueryItems.mockResolvedValueOnce({
      items: [],
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe("cat1");
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

  it("returns empty array when all categories are empty", async () => {
    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "SKILLCAT#cat1",
          SK: "META",
          id: "cat1",
          label: "Empty One",
          displayOrder: 0,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    // No skills for cat1
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("queries categories GSI with correct parameters", async () => {
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

  it("queries skills for each category with correct GSI1PK", async () => {
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
      ],
    });

    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "SKILL#s1",
          SK: "META",
          id: "s1",
          name: "TypeScript",
          categoryId: "cat1",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    const { GET } = await import("./route");
    await GET();

    // Second call should be for skills in cat1
    expect(mockQueryItems).toHaveBeenNthCalledWith(2, {
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": "SKILLS#cat1",
      },
      scanIndexForward: true,
    });
  });

  it("returns 503 when DynamoDB query fails", async () => {
    mockQueryItems.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Service temporarily unavailable");
  });
});
