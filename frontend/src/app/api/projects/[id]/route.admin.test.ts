/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpdateItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteFiles = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
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
  getAssetUrl: (key: string) => `https://cdn.example.com/${key}`,
  deleteFiles: (...args: unknown[]) => mockDeleteFiles(...args),
}));

// ─── Helper ─────────────────────────────────────────────────────────────────

function createNextRequest(url: string, options?: RequestInit) {
  const req = new Request(url, options) as unknown;
  return req as import("next/server").NextRequest;
}

const existingProject = {
  PK: "PROJECT#proj-123",
  SK: "META",
  id: "proj-123",
  title: "Original Title",
  description: "Original description",
  githubUrl: "https://github.com/user/original",
  deploymentUrl: "https://original.com",
  published: false,
  displayOrder: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

// ─── PUT /api/projects/[id] Tests ───────────────────────────────────────────

describe("PUT /api/projects/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates project fields and returns updated project", async () => {
    mockGetItem.mockResolvedValueOnce(existingProject);
    mockUpdateItem.mockResolvedValueOnce({
      ...existingProject,
      title: "Updated Title",
      updatedAt: "2024-01-02T00:00:00Z",
    });
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { PUT } = await import("./route");
    const request = createNextRequest("http://localhost/api/projects/proj-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Title" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "proj-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Updated Title");
  });

  it("updates GSI1SK when displayOrder changes", async () => {
    mockGetItem.mockResolvedValueOnce(existingProject);
    mockUpdateItem.mockResolvedValueOnce({
      ...existingProject,
      displayOrder: 10,
      updatedAt: "2024-01-02T00:00:00Z",
    });
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { PUT } = await import("./route");
    const request = createNextRequest("http://localhost/api/projects/proj-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayOrder: 10 }),
    });

    await PUT(request, { params: Promise.resolve({ id: "proj-123" }) });

    expect(mockUpdateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        updateExpression: expect.stringContaining("GSI1SK = :gsi1sk"),
        expressionAttributeValues: expect.objectContaining({
          ":gsi1sk": "ORDER#00010",
          ":displayOrder": 10,
        }),
      }),
    );
  });

  it("returns 404 when project does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const request = createNextRequest("http://localhost/api/projects/nonexist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Title" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "nonexist" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Project not found");
  });

  it("returns 400 with invalid data", async () => {
    const { PUT } = await import("./route");
    const request = createNextRequest("http://localhost/api/projects/proj-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubUrl: "not-a-url" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "proj-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation failed");
  });

  it("returns 500 on DynamoDB error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { PUT } = await import("./route");
    const request = createNextRequest("http://localhost/api/projects/proj-123", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Title" }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({ id: "proj-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to update project");
  });
});

// ─── DELETE /api/projects/[id] Tests ────────────────────────────────────────

describe("DELETE /api/projects/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes project and associated images", async () => {
    mockGetItem.mockResolvedValueOnce(existingProject);
    mockQueryItems.mockResolvedValueOnce({
      items: [
        {
          PK: "PROJECT#proj-123",
          SK: "IMAGE#00001",
          id: "img1",
          s3Key: "projects/proj-123/img1.webp",
          order: 1,
        },
        {
          PK: "PROJECT#proj-123",
          SK: "IMAGE#00002",
          id: "img2",
          s3Key: "projects/proj-123/img2.webp",
          order: 2,
        },
      ],
    });
    mockDeleteFiles.mockResolvedValueOnce(undefined);
    mockDeleteItem.mockResolvedValue(undefined);

    const { DELETE } = await import("./route");
    const request = createNextRequest(
      "http://localhost/api/projects/proj-123",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "proj-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Project deleted successfully");

    // Should delete S3 files
    expect(mockDeleteFiles).toHaveBeenCalledWith([
      "projects/proj-123/img1.webp",
      "projects/proj-123/img2.webp",
    ]);

    // Should delete image DynamoDB items + project item (3 total)
    expect(mockDeleteItem).toHaveBeenCalledTimes(3);
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "PROJECT#proj-123",
      SK: "IMAGE#00001",
    });
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "PROJECT#proj-123",
      SK: "IMAGE#00002",
    });
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "PROJECT#proj-123",
      SK: "META",
    });
  });

  it("deletes project with no images", async () => {
    mockGetItem.mockResolvedValueOnce(existingProject);
    mockQueryItems.mockResolvedValueOnce({ items: [] });
    mockDeleteItem.mockResolvedValue(undefined);

    const { DELETE } = await import("./route");
    const request = createNextRequest(
      "http://localhost/api/projects/proj-123",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "proj-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Should not call deleteFiles when no images
    expect(mockDeleteFiles).not.toHaveBeenCalled();

    // Should only delete the project item
    expect(mockDeleteItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "PROJECT#proj-123",
      SK: "META",
    });
  });

  it("returns 404 when project does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const request = createNextRequest(
      "http://localhost/api/projects/nonexist",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "nonexist" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Project not found");
  });

  it("returns 500 on DynamoDB error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { DELETE } = await import("./route");
    const request = createNextRequest(
      "http://localhost/api/projects/proj-123",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "proj-123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to delete project");
  });
});
