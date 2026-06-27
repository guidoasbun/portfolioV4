/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import type { NextRequest } from "next/server";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockUpdateItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockDeleteItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockValidateRequest = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const existingExperience = {
  PK: "EXP#exp-1",
  SK: "META",
  GSI1PK: "EXPERIENCE",
  GSI1SK: "DATE#2023-01",
  type: "experience",
  id: "exp-1",
  jobTitle: "Developer",
  company: "OldCorp",
  startDate: "2023-01",
  endDate: "2024-01",
  description: "Built stuff",
  createdAt: "2023-01-01T00:00:00Z",
  updatedAt: "2023-06-01T00:00:00Z",
};

const createMockRequest = (body: unknown) =>
  new Request("http://localhost/api/experience/exp-1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

const createDeleteRequest = () =>
  new Request("http://localhost/api/experience/exp-1", {
    method: "DELETE",
  }) as unknown as NextRequest;

// ─── PUT Tests ──────────────────────────────────────────────────────────────

describe("PUT /api/experience/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateRequest.mockResolvedValue({ valid: true, payload: { sub: "user-1" } });
    mockGetItem.mockResolvedValue(existingExperience);
  });

  it("updates experience entry and returns updated data", async () => {
    const updatedItem = {
      ...existingExperience,
      jobTitle: "Senior Developer",
      updatedAt: "2024-06-01T00:00:00Z",
    };
    mockUpdateItem.mockResolvedValueOnce(updatedItem);

    const { PUT } = await import("./route");
    const response = await PUT(createMockRequest({ jobTitle: "Senior Developer" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.jobTitle).toBe("Senior Developer");
  });

  it("builds correct update expression for multiple fields", async () => {
    const updatedItem = {
      ...existingExperience,
      jobTitle: "Lead Engineer",
      company: "NewCorp",
      updatedAt: "2024-06-01T00:00:00Z",
    };
    mockUpdateItem.mockResolvedValueOnce(updatedItem);

    const { PUT } = await import("./route");
    await PUT(createMockRequest({ jobTitle: "Lead Engineer", company: "NewCorp" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(mockUpdateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        key: { PK: "EXP#exp-1", SK: "META" },
      }),
    );

    const callArgs = mockUpdateItem.mock.calls[0]![0] as {
      expressionAttributeNames: Record<string, string>;
      expressionAttributeValues: Record<string, string>;
    };
    expect(callArgs.expressionAttributeNames).toMatchObject({
      "#jobTitle": "jobTitle",
      "#company": "company",
      "#updatedAt": "updatedAt",
    });
    expect(callArgs.expressionAttributeValues).toMatchObject({
      ":jobTitle": "Lead Engineer",
      ":company": "NewCorp",
    });
  });

  it("updates GSI1SK when startDate changes", async () => {
    const updatedItem = {
      ...existingExperience,
      startDate: "2024-03",
      GSI1SK: "DATE#2024-03",
      updatedAt: "2024-06-01T00:00:00Z",
    };
    mockUpdateItem.mockResolvedValueOnce(updatedItem);

    const { PUT } = await import("./route");
    await PUT(createMockRequest({ startDate: "2024-03" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    const callArgs = mockUpdateItem.mock.calls[0]![0] as {
      expressionAttributeNames: Record<string, string>;
      expressionAttributeValues: Record<string, string>;
      updateExpression: string;
    };
    expect(callArgs.expressionAttributeNames["#GSI1SK"]).toBe("GSI1SK");
    expect(callArgs.expressionAttributeValues[":GSI1SK"]).toBe("DATE#2024-03");
    expect(callArgs.updateExpression).toContain("#GSI1SK = :GSI1SK");
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateRequest.mockResolvedValueOnce({ valid: false, error: "No token" });

    const { PUT } = await import("./route");
    const response = await PUT(createMockRequest({ jobTitle: "Dev" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when experience entry does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { PUT } = await import("./route");
    const response = await PUT(createMockRequest({ jobTitle: "Dev" }), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Experience entry not found");
  });

  it("returns 400 for invalid request body", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(createMockRequest({ startDate: "invalid-date" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 when no fields are provided to update", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(createMockRequest({}), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("No fields to update");
  });

  it("returns 500 when DynamoDB update fails", async () => {
    mockUpdateItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { PUT } = await import("./route");
    const response = await PUT(createMockRequest({ jobTitle: "Dev" }), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to update experience entry");
  });
});

// ─── DELETE Tests ───────────────────────────────────────────────────────────

describe("DELETE /api/experience/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateRequest.mockResolvedValue({ valid: true, payload: { sub: "user-1" } });
    mockGetItem.mockResolvedValue(existingExperience);
    mockDeleteItem.mockResolvedValue(undefined);
  });

  it("deletes experience entry and returns success", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(createDeleteRequest(), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Experience entry deleted successfully");
  });

  it("deletes item using correct DynamoDB key", async () => {
    const { DELETE } = await import("./route");
    await DELETE(createDeleteRequest(), {
      params: Promise.resolve({ id: "exp-1" }),
    });

    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "EXP#exp-1",
      SK: "META",
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockValidateRequest.mockResolvedValueOnce({ valid: false, error: "No token" });

    const { DELETE } = await import("./route");
    const response = await DELETE(createDeleteRequest(), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Unauthorized");
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("returns 404 when experience entry does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { DELETE } = await import("./route");
    const response = await DELETE(createDeleteRequest(), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Experience entry not found");
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("returns 500 when DynamoDB delete fails", async () => {
    mockDeleteItem.mockRejectedValueOnce(new Error("DynamoDB error"));

    const { DELETE } = await import("./route");
    const response = await DELETE(createDeleteRequest(), {
      params: Promise.resolve({ id: "exp-1" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Failed to delete experience entry");
  });
});
