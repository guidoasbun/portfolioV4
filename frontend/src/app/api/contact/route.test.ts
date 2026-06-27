/**
 * @jest-environment node
 */

/**
 * Unit tests for POST /api/contact route handler.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPutItem = jest.fn<() => Promise<void>>();

jest.mock("@/lib/dynamodb", () => ({
  putItem: (...args: unknown[]) => mockPutItem(...args),
  Keys: {
    message: {
      pk: (id: string) => `MSG#${id}`,
      sk: () => "META" as const,
      gsi1pk: () => "MESSAGES" as const,
      gsi1sk: (timestamp: string) => `DATE#${timestamp}`,
    },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidRequest(): Request {
  return new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json",
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/contact", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.resetModules();
    mockPutItem.mockReset();
    mockPutItem.mockResolvedValue(undefined);

    // Re-mock after resetModules
    jest.mock("@/lib/dynamodb", () => ({
      putItem: (...args: unknown[]) => mockPutItem(...args),
      Keys: {
        message: {
          pk: (id: string) => `MSG#${id}`,
          sk: () => "META" as const,
          gsi1pk: () => "MESSAGES" as const,
          gsi1sk: (timestamp: string) => `DATE#${timestamp}`,
        },
      },
    }));

    const mod = await import("./route");
    POST = mod.POST;
  });

  describe("successful submission", () => {
    it("returns 201 with success message for valid input", async () => {
      const request = createRequest({
        name: "Jane Doe",
        email: "jane@example.com",
        message: "Hello, I'd like to discuss a project.",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual({
        success: true,
        message: "Message sent successfully",
      });
    });

    it("saves message to DynamoDB with correct fields", async () => {
      const request = createRequest({
        name: "Jane Doe",
        email: "jane@example.com",
        message: "Hello, I'd like to discuss a project.",
      });

      await POST(request);

      expect(mockPutItem).toHaveBeenCalledTimes(1);
      const savedItem = mockPutItem.mock.calls[0][0] as Record<string, unknown>;

      expect(savedItem.type).toBe("message");
      expect(savedItem.name).toBe("Jane Doe");
      expect(savedItem.email).toBe("jane@example.com");
      expect(savedItem.body).toBe("Hello, I'd like to discuss a project.");
      expect(savedItem.isRead).toBe(false);
      expect(savedItem.submittedAt).toBeDefined();
      expect(savedItem.id).toBeDefined();
      expect(savedItem.PK).toMatch(/^MSG#/);
      expect(savedItem.SK).toBe("META");
      expect(savedItem.GSI1PK).toBe("MESSAGES");
      expect(savedItem.GSI1SK).toMatch(/^DATE#/);
    });

    it("trims whitespace from input fields", async () => {
      const request = createRequest({
        name: "  Jane Doe  ",
        email: "  jane@example.com  ",
        message: "  Hello  ",
      });

      await POST(request);

      const savedItem = mockPutItem.mock.calls[0][0] as Record<string, unknown>;
      expect(savedItem.name).toBe("Jane Doe");
      expect(savedItem.email).toBe("jane@example.com");
      expect(savedItem.body).toBe("Hello");
    });
  });

  describe("validation errors", () => {
    it("returns 400 when name is empty", async () => {
      const request = createRequest({
        name: "",
        email: "jane@example.com",
        message: "Hello",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveProperty("name");
    });

    it("returns 400 when email is invalid", async () => {
      const request = createRequest({
        name: "Jane",
        email: "not-an-email",
        message: "Hello",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveProperty("email");
    });

    it("returns 400 when message is empty", async () => {
      const request = createRequest({
        name: "Jane",
        email: "jane@example.com",
        message: "",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveProperty("message");
    });

    it("returns 400 with multiple errors when multiple fields invalid", async () => {
      const request = createRequest({
        name: "",
        email: "",
        message: "",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveProperty("name");
      expect(data.errors).toHaveProperty("email");
      expect(data.errors).toHaveProperty("message");
    });

    it("returns 400 when name exceeds 100 characters", async () => {
      const request = createRequest({
        name: "a".repeat(101),
        email: "jane@example.com",
        message: "Hello",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveProperty("name");
    });

    it("returns 400 when message exceeds 2000 characters", async () => {
      const request = createRequest({
        name: "Jane",
        email: "jane@example.com",
        message: "a".repeat(2001),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveProperty("message");
    });

    it("does not call putItem when validation fails", async () => {
      const request = createRequest({
        name: "",
        email: "invalid",
        message: "",
      });

      await POST(request);

      expect(mockPutItem).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("returns 400 for invalid JSON body", async () => {
      const request = createInvalidRequest();

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Invalid request body");
    });

    it("returns 503 when DynamoDB write fails", async () => {
      mockPutItem.mockRejectedValueOnce(new Error("DynamoDB unavailable"));

      const request = createRequest({
        name: "Jane",
        email: "jane@example.com",
        message: "Hello",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Service temporarily unavailable");
    });
  });
});
