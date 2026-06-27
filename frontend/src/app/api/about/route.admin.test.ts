/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mock DynamoDB ──────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPutItem = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  Keys: {
    about: {
      pk: () => "ABOUT",
      sk: () => "CONTENT",
    },
  },
}));

describe("PUT /api/about", () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockPutItem.mockReset();
  });

  it("updates about content with both fields", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "ABOUT",
      SK: "CONTENT",
      personalDescription: "Old personal",
      professionalPitch: "Old pitch",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
    mockPutItem.mockResolvedValueOnce(undefined);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalDescription: "New personal description",
        professionalPitch: "New professional pitch",
      }),
    });

    const response = await PUT(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.personalDescription).toBe("New personal description");
    expect(body.data.professionalPitch).toBe("New professional pitch");
    expect(body.data.updatedAt).toBeDefined();
    expect(mockPutItem).toHaveBeenCalledTimes(1);
  });

  it("partially updates about content (only personalDescription)", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "ABOUT",
      SK: "CONTENT",
      personalDescription: "Old personal",
      professionalPitch: "Existing pitch",
      updatedAt: "2024-01-01T00:00:00.000Z",
    });
    mockPutItem.mockResolvedValueOnce(undefined);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalDescription: "Updated personal only",
      }),
    });

    const response = await PUT(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.personalDescription).toBe("Updated personal only");
    expect(body.data.professionalPitch).toBe("Existing pitch");
  });

  it("creates about content when none exists", async () => {
    mockGetItem.mockResolvedValueOnce(null);
    mockPutItem.mockResolvedValueOnce(undefined);

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalDescription: "Brand new",
        professionalPitch: "First pitch",
      }),
    });

    const response = await PUT(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.personalDescription).toBe("Brand new");
    expect(body.data.professionalPitch).toBe("First pitch");
  });

  it("returns 400 on validation error (personalDescription too long)", async () => {
    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalDescription: "x".repeat(5001),
      }),
    });

    const response = await PUT(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
    expect(body.errors.personalDescription).toBeDefined();
  });

  it("returns 500 on DynamoDB error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB failure"));

    const { PUT } = await import("./route");
    const request = new Request("http://localhost/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalDescription: "Test",
      }),
    });

    const response = await PUT(request as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to update about content");
  });
});
