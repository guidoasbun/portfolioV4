/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockQueryItems = jest.fn<(...args: any[]) => any>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: mockQueryItems,
  Keys: {
    experience: {
      gsi1pk: () => "EXPERIENCE",
      gsi1sk: (date: string) => `DATE#${date}`,
    },
  },
}));

describe("GET /api/experience", () => {
  beforeEach(() => {
    mockQueryItems.mockReset();
  });

  it("returns experience entries in reverse chronological order", async () => {
    const mockItems = [
      {
        PK: "EXP#1",
        SK: "META",
        GSI1PK: "EXPERIENCE",
        GSI1SK: "DATE#2024-01",
        id: "1",
        jobTitle: "Senior Developer",
        company: "TechCorp",
        startDate: "2024-01",
        endDate: undefined,
        description: "Leading frontend team",
        createdAt: "2024-01-15T00:00:00Z",
        updatedAt: "2024-01-15T00:00:00Z",
      },
      {
        PK: "EXP#2",
        SK: "META",
        GSI1PK: "EXPERIENCE",
        GSI1SK: "DATE#2022-06",
        id: "2",
        jobTitle: "Developer",
        company: "StartupInc",
        startDate: "2022-06",
        endDate: "2023-12",
        description: "Built web applications",
        createdAt: "2022-06-01T00:00:00Z",
        updatedAt: "2023-12-01T00:00:00Z",
      },
    ];

    mockQueryItems.mockResolvedValueOnce({ items: mockItems });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].jobTitle).toBe("Senior Developer");
    expect(body.data[0].company).toBe("TechCorp");
    expect(body.data[0].startDate).toBe("2024-01");
    expect(body.data[0].endDate).toBeUndefined();
    expect(body.data[1].jobTitle).toBe("Developer");
    expect(body.data[1].startDate).toBe("2022-06");
    expect(body.data[1].endDate).toBe("2023-12");
  });

  it("queries DynamoDB GSI with correct parameters", async () => {
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    await GET();

    expect(mockQueryItems).toHaveBeenCalledWith({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": "EXPERIENCE",
      },
      scanIndexForward: false,
    });
  });

  it("returns empty array when no experience entries exist", async () => {
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it("returns 503 when DynamoDB query fails", async () => {
    mockQueryItems.mockRejectedValueOnce(new Error("DynamoDB unavailable"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Service temporarily unavailable");
  });

  it("maps DynamoDB items correctly to Experience entities", async () => {
    const mockItems = [
      {
        PK: "EXP#abc",
        SK: "META",
        GSI1PK: "EXPERIENCE",
        GSI1SK: "DATE#2023-03",
        type: "experience",
        id: "abc",
        jobTitle: "Full Stack Engineer",
        company: "MegaCorp",
        startDate: "2023-03",
        endDate: "2024-01",
        description: "Worked on distributed systems",
        createdAt: "2023-03-01T00:00:00Z",
        updatedAt: "2024-01-15T10:00:00Z",
      },
    ];

    mockQueryItems.mockResolvedValueOnce({ items: mockItems });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    const experience = body.data[0];
    // Verify only entity fields are returned (no DynamoDB key attributes)
    expect(experience).toEqual({
      id: "abc",
      jobTitle: "Full Stack Engineer",
      company: "MegaCorp",
      startDate: "2023-03",
      endDate: "2024-01",
      description: "Worked on distributed systems",
      createdAt: "2023-03-01T00:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    });
    expect(experience.PK).toBeUndefined();
    expect(experience.SK).toBeUndefined();
    expect(experience.GSI1PK).toBeUndefined();
    expect(experience.GSI1SK).toBeUndefined();
    expect(experience.type).toBeUndefined();
  });
});
