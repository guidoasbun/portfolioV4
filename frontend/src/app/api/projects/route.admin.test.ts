/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPutItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockQueryAllItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  putItem: (...args: unknown[]) => mockPutItem(...args),
  queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
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
  getAssetUrl: (key: string) => `https://cdn.example.com/${key}`,
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/projects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a project with valid data and returns 201", async () => {
    mockPutItem.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "My Project",
        description: "A great project",
        githubUrl: "https://github.com/user/repo",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.data.title).toBe("My Project");
    expect(body.data.description).toBe("A great project");
    expect(body.data.githubUrl).toBe("https://github.com/user/repo");
    expect(body.data.published).toBe(false);
    expect(body.data.displayOrder).toBe(0);
    expect(body.data.images).toEqual([]);
    expect(body.data.createdAt).toBeDefined();
    expect(body.data.updatedAt).toBeDefined();
  });

  it("saves project to DynamoDB with correct keys", async () => {
    mockPutItem.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "My Project",
        description: "A great project",
        githubUrl: "https://github.com/user/repo",
        deploymentUrl: "https://myproject.com",
        published: true,
        displayOrder: 5,
      }),
    });

    await POST(request);

    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        SK: "META",
        GSI1PK: "PROJECTS",
        GSI1SK: "ORDER#00005",
        type: "PROJECT",
        title: "My Project",
        description: "A great project",
        githubUrl: "https://github.com/user/repo",
        deploymentUrl: "https://myproject.com",
        published: true,
        displayOrder: 5,
      }),
    );
  });

  it("returns 400 when title is missing", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "A great project",
        githubUrl: "https://github.com/user/repo",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 when githubUrl is not a valid URL", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "My Project",
        description: "A great project",
        githubUrl: "not-a-url",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Validation failed");
  });

  it("returns 500 when DynamoDB put fails", async () => {
    mockPutItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "My Project",
        description: "A great project",
        githubUrl: "https://github.com/user/repo",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to create project");
  });

  it("defaults published to false and displayOrder to 0", async () => {
    mockPutItem.mockResolvedValueOnce(undefined);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "My Project",
        description: "A great project",
        githubUrl: "https://github.com/user/repo",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.published).toBe(false);
    expect(body.data.displayOrder).toBe(0);
  });
});
