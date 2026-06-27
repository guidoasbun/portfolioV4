/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockQueryAllItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAssetUrl = jest.fn<(key: string) => string>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
  Keys: {
    project: {
      gsi1pk: () => "PROJECTS",
      gsi1sk: (order: number) => `ORDER#${String(order).padStart(5, "0")}`,
      pk: (id: string) => `PROJECT#${id}`,
      sk: () => "META",
    },
    projectImage: {
      pk: (projectId: string) => `PROJECT#${projectId}`,
      sk: (order: number) => `IMAGE#${String(order).padStart(5, "0")}`,
    },
  },
}));

jest.mock("@/lib/s3", () => ({
  getAssetUrl: (key: string) => mockGetAssetUrl(key),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("GET /api/projects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssetUrl.mockImplementation(
      (key: string) => `https://cdn.example.com/${key}`,
    );
  });

  it("returns published projects ordered by displayOrder with images", async () => {
    // queryAllItems: returns the projects array directly
    mockQueryAllItems.mockResolvedValueOnce([
        {
          PK: "PROJECT#p1",
          SK: "META",
          id: "p1",
          title: "Project One",
          description: "First project",
          githubUrl: "https://github.com/user/p1",
          deploymentUrl: "https://p1.example.com",
          published: true,
          displayOrder: 1,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
        {
          PK: "PROJECT#p2",
          SK: "META",
          id: "p2",
          title: "Project Two",
          description: "Second project",
          githubUrl: "https://github.com/user/p2",
          published: true,
          displayOrder: 2,
          createdAt: "2024-01-03T00:00:00Z",
          updatedAt: "2024-01-04T00:00:00Z",
        },
    ]);

    // queryItems: images for project p1
    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "PROJECT#p1",
          SK: "IMAGE#00001",
          id: "img1",
          s3Key: "projects/p1/img1.webp",
          order: 1,
          altText: "Screenshot 1",
        },
      ],
    });

    // queryItems: images for project p2
    mockQueryItems.mockResolvedValueOnce({
      items: [],
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);

    // Check first project with image
    expect(body.data[0]).toEqual({
      id: "p1",
      title: "Project One",
      description: "First project",
      githubUrl: "https://github.com/user/p1",
      deploymentUrl: "https://p1.example.com",
      published: true,
      displayOrder: 1,
      images: [
        {
          id: "img1",
          s3Key: "projects/p1/img1.webp",
          url: "https://cdn.example.com/projects/p1/img1.webp",
          order: 1,
          altText: "Screenshot 1",
        },
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    });

    // Check second project with no images
    expect(body.data[1].id).toBe("p2");
    expect(body.data[1].images).toEqual([]);
    expect(body.data[1].deploymentUrl).toBeUndefined();
  });

  it("returns empty array when no published projects exist", async () => {
    mockQueryAllItems.mockResolvedValueOnce([]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("queries GSI1 with correct parameters", async () => {
    mockQueryAllItems.mockResolvedValueOnce([]);

    const { GET } = await import("./route");
    await GET();

    expect(mockQueryAllItems).toHaveBeenCalledWith({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": "PROJECTS",
        ":published": true,
      },
      filterExpression: "published = :published",
      scanIndexForward: true,
    });
  });

  it("returns 500 when DynamoDB query fails", async () => {
    mockQueryAllItems.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to fetch projects");
  });
});
