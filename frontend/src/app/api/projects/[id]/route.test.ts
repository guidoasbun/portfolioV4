/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { NextRequest } from "next/server";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAssetUrl = jest.fn<(key: string) => string>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  Keys: {
    project: {
      pk: (id: string) => `PROJECT#${id}`,
      sk: () => "META",
      gsi1pk: () => "PROJECTS",
      gsi1sk: (order: number) => `ORDER#${String(order).padStart(5, "0")}`,
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

describe("GET /api/projects/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssetUrl.mockImplementation(
      (key: string) => `https://cdn.example.com/${key}`,
    );
  });

  const createMockRequest = () => ({} as NextRequest);

  it("returns a project with full details and images", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "PROJECT#p1",
      SK: "META",
      id: "p1",
      title: "My Project",
      description: "A great project with multiple images",
      githubUrl: "https://github.com/user/project",
      deploymentUrl: "https://project.example.com",
      published: true,
      displayOrder: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    });

    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "PROJECT#p1",
          SK: "IMAGE#00001",
          id: "img1",
          s3Key: "projects/p1/img1.webp",
          order: 1,
          altText: "Homepage screenshot",
        },
        {
          PK: "PROJECT#p1",
          SK: "IMAGE#00002",
          id: "img2",
          s3Key: "projects/p1/img2.webp",
          order: 2,
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "p1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      id: "p1",
      title: "My Project",
      description: "A great project with multiple images",
      githubUrl: "https://github.com/user/project",
      deploymentUrl: "https://project.example.com",
      published: true,
      displayOrder: 1,
      images: [
        {
          id: "img1",
          s3Key: "projects/p1/img1.webp",
          url: "https://cdn.example.com/projects/p1/img1.webp",
          order: 1,
          altText: "Homepage screenshot",
        },
        {
          id: "img2",
          s3Key: "projects/p1/img2.webp",
          url: "https://cdn.example.com/projects/p1/img2.webp",
          order: 2,
        },
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    });
  });

  it("returns 404 when project does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Project not found");
  });

  it("fetches project using correct DynamoDB key", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    await GET(createMockRequest(), {
      params: Promise.resolve({ id: "test-id" }),
    });

    expect(mockGetItem).toHaveBeenCalledWith({
      PK: "PROJECT#test-id",
      SK: "META",
    });
  });

  it("queries images with correct key condition", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "PROJECT#p1",
      SK: "META",
      id: "p1",
      title: "Test",
      description: "Test",
      githubUrl: "https://github.com/test",
      published: true,
      displayOrder: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    await GET(createMockRequest(), {
      params: Promise.resolve({ id: "p1" }),
    });

    expect(mockQueryItems).toHaveBeenCalledWith({
      keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      expressionAttributeValues: {
        ":pk": "PROJECT#p1",
        ":skPrefix": "IMAGE#",
      },
      scanIndexForward: true,
    });
  });

  it("returns project without deploymentUrl when not set", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "PROJECT#p1",
      SK: "META",
      id: "p1",
      title: "No Deploy URL",
      description: "Project without deployment",
      githubUrl: "https://github.com/user/project",
      published: true,
      displayOrder: 1,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "p1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.deploymentUrl).toBeUndefined();
  });

  it("returns 404 when project exists but is unpublished", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "PROJECT#p1",
      SK: "META",
      id: "p1",
      title: "Draft Project",
      description: "This is not published yet",
      githubUrl: "https://github.com/user/draft",
      published: false,
      displayOrder: 5,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    const { GET } = await import("./route");
    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "p1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Project not found");
    // Should not query images for unpublished projects
    expect(mockQueryItems).not.toHaveBeenCalled();
  });

  it("returns 500 when DynamoDB throws an error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("Connection timeout"));

    const { GET } = await import("./route");
    const response = await GET(createMockRequest(), {
      params: Promise.resolve({ id: "p1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to fetch project");
  });
});
