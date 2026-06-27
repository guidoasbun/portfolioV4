/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPutItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockValidateRequest = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: jest.fn(),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  Keys: {
    experience: {
      pk: (id: string) => `EXP#${id}`,
      sk: () => "META",
      gsi1pk: () => "EXPERIENCE",
      gsi1sk: (date: string) => `DATE#${date}`,
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  validateRequest: (...args: unknown[]) => mockValidateRequest(...args),
}));

// Mock crypto.randomUUID
const mockUUID = "test-uuid-1234-5678-abcd";
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => mockUUID,
  },
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/experience", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateRequest.mockResolvedValue({ valid: true, payload: { sub: "user-1" } });
    mockPutItem.mockResolvedValue(undefined);
  });

  const createRequest = (body: unknown) =>
    new Request("http://localhost/api/experience", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validBody = {
    jobTitle: "Senior Developer",
    company: "TechCorp",
    startDate: "2024-01",
    description: "Leading frontend team",
  };

  it("creates a new experience entry and returns 201", async () => {
    const { POST } = await import("./route");
    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      id: mockUUID,
      jobTitle: "Senior Developer",
      company: "TechCorp",
      startDate: "2024-01",
      description: "Leading frontend team",
    });
    expect(data.data.createdAt).toBeDefined();
    expect(data.data.updatedAt).toBeDefined();
  });

  it("saves item to DynamoDB with correct key structure", async () => {
    const { POST } = await import("./route");
    await POST(createRequest(validBody));

    expect(mockPutItem).toHaveBeenCalledWith(
      expect.objectContaining({
        PK: `EXP#${mockUUID}`,
        SK: "META",
        GSI1PK: "EXPERIENCE",
        GSI1SK: "DATE#2024-01",
        type: "experience",
        id: mockUUID,
        jobTitle: "Senior Developer",
        company: "TechCorp",
        startDate: "2024-01",
        description: "Leading frontend team",
      }),
    );
  });

  it("accepts optional endDate field", async () => {
    const bodyWithEndDate = { ...validBody, endDate: "2024-06" };

    const { POST } = await import("./route");
    const response = await POST(createRequest(bodyWithEndDate));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.endDate).toBe("2024-06");
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateRequest.mockResolvedValueOnce({ valid: false, error: "No token" });

    const { POST } = await import("./route");
    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
    expect(mockPutItem).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid request body - missing required fields", async () => {
    const { POST } = await import("./route");
    const response = await POST(createRequest({ jobTitle: "Dev" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 for invalid startDate format", async () => {
    const { POST } = await import("./route");
    const response = await POST(createRequest({ ...validBody, startDate: "2024-13" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("returns 500 when DynamoDB put fails", async () => {
    mockPutItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { POST } = await import("./route");
    const response = await POST(createRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to create experience entry");
  });
});
