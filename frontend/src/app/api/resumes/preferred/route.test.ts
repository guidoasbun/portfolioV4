/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mock DynamoDB ──────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  Keys: {
    resume: {
      gsi1pk: () => "RESUMES",
    },
  },
}));

// ─── Mock S3 ────────────────────────────────────────────────────────────────

const mockGenerateDownloadUrl = jest.fn<(...args: unknown[]) => Promise<string>>();

jest.mock("@/lib/s3", () => ({
  generateDownloadUrl: (...args: unknown[]) => mockGenerateDownloadUrl(...args),
}));

describe("GET /api/resumes/preferred", () => {
  beforeEach(() => {
    mockQueryItems.mockReset();
    mockGenerateDownloadUrl.mockReset();
  });

  it("returns presigned download URL for preferred resume", async () => {
    const resumeItems = [
      {
        PK: "RESUME#r1",
        SK: "META",
        id: "r1",
        filename: "resume-v1.pdf",
        s3Key: "resumes/r1.pdf",
        fileSize: 204800,
        isPreferred: false,
        uploadedAt: "2024-01-01T00:00:00Z",
      },
      {
        PK: "RESUME#r2",
        SK: "META",
        id: "r2",
        filename: "resume-v2.pdf",
        s3Key: "resumes/r2.pdf",
        fileSize: 512000,
        isPreferred: true,
        uploadedAt: "2024-02-15T10:00:00Z",
      },
    ];
    mockQueryItems.mockResolvedValueOnce({ items: resumeItems });
    mockGenerateDownloadUrl.mockResolvedValueOnce(
      "https://s3.amazonaws.com/portfolio-assets/resumes/r2.pdf?signed=abc",
    );

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        downloadUrl:
          "https://s3.amazonaws.com/portfolio-assets/resumes/r2.pdf?signed=abc",
        filename: "resume-v2.pdf",
        resumeId: "r2",
      },
    });
    expect(mockQueryItems).toHaveBeenCalledWith({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": "RESUMES",
        ":preferred": true,
      },
      filterExpression: "isPreferred = :preferred",
    });
    expect(mockGenerateDownloadUrl).toHaveBeenCalledWith("resumes/r2.pdf");
  });

  it("returns 404 when no preferred resume exists", async () => {
    const resumeItems = [
      {
        PK: "RESUME#r1",
        SK: "META",
        id: "r1",
        filename: "resume-v1.pdf",
        s3Key: "resumes/r1.pdf",
        fileSize: 204800,
        isPreferred: false,
        uploadedAt: "2024-01-01T00:00:00Z",
      },
    ];
    mockQueryItems.mockResolvedValueOnce({ items: resumeItems });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: "No preferred resume found",
    });
  });

  it("returns 404 when no resumes exist at all", async () => {
    mockQueryItems.mockResolvedValueOnce({ items: [] });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      success: false,
      error: "No preferred resume found",
    });
  });

  it("returns 500 on DynamoDB error", async () => {
    mockQueryItems.mockRejectedValueOnce(new Error("DynamoDB unavailable"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: "Failed to fetch preferred resume",
    });
  });

  it("returns 500 on S3 presign error", async () => {
    const resumeItems = [
      {
        PK: "RESUME#r1",
        SK: "META",
        id: "r1",
        filename: "resume.pdf",
        s3Key: "resumes/r1.pdf",
        fileSize: 100000,
        isPreferred: true,
        uploadedAt: "2024-01-01T00:00:00Z",
      },
    ];
    mockQueryItems.mockResolvedValueOnce({ items: resumeItems });
    mockGenerateDownloadUrl.mockRejectedValueOnce(new Error("S3 error"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: "Failed to fetch preferred resume",
    });
  });
});
