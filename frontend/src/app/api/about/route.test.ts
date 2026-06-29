/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mock DynamoDB ──────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  Keys: {
    about: {
      pk: () => "ABOUT",
      sk: () => "CONTENT",
    },
  },
}));

describe("GET /api/about", () => {
  beforeEach(() => {
    mockGetItem.mockReset();
  });

  it("returns about content when it exists", async () => {
    const aboutData = {
      PK: "ABOUT",
      SK: "CONTENT",
      personalDescription: "Hi, I am Guido Asbun.",
      professionalPitch: "Full-stack developer with 10 years experience.",
      updatedAt: "2024-01-15T10:30:00Z",
    };
    mockGetItem.mockResolvedValueOnce(aboutData);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        personalDescription: "Hi, I am Guido Asbun.",
        professionalPitch: "Full-stack developer with 10 years experience.",
        updatedAt: "2024-01-15T10:30:00Z",
      },
    });
    expect(mockGetItem).toHaveBeenCalledWith({
      PK: "ABOUT",
      SK: "CONTENT",
    });
  });

  it("returns null data when no about content exists", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, data: null });
  });

  it("returns 500 on DynamoDB error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB unavailable"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: "Failed to fetch about content",
    });
  });
});
