/**
 * @jest-environment node
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── Mock DynamoDB ──────────────────────────────────────────────────────────

const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockPutItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDeleteItem = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpdateItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockQueryAllItems = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();

jest.mock("@/lib/dynamodb", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  putItem: (...args: unknown[]) => mockPutItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
  queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
  Keys: {
    resume: {
      pk: (id: string) => `RESUME#${id}`,
      sk: () => "META",
      gsi1pk: () => "RESUMES",
      gsi1sk: (uploadDate: string) => `DATE#${uploadDate}`,
    },
  },
}));

// ─── Mock S3 ────────────────────────────────────────────────────────────────

const mockGenerateUploadUrl = jest.fn<(...args: unknown[]) => Promise<string>>();
const mockDeleteFile = jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock("@/lib/s3", () => ({
  generateUploadUrl: (...args: unknown[]) => mockGenerateUploadUrl(...args),
  resumeKey: (id: string) => `resumes/${id}.pdf`,
  deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
  PRESIGNED_URL_EXPIRY: 3600,
}));

// ─── Mock Validation ────────────────────────────────────────────────────────

jest.mock("@/lib/validation", () => ({
  validateResumeFile: (input: { contentType: string; fileSize: number }) => {
    const errors: Record<string, string> = {};
    if (input.contentType !== "application/pdf") {
      errors.contentType = "File must be in PDF format";
    }
    if (input.fileSize > 10 * 1024 * 1024) {
      errors.fileSize = "File size must not exceed 10MB";
    }
    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }
    return { success: true };
  },
}));

// ─── Mock crypto ────────────────────────────────────────────────────────────

jest.mock("crypto", () => ({
  randomUUID: () => "test-uuid-1234",
}));

describe("GET /api/resumes", () => {
  beforeEach(() => {
    mockQueryAllItems.mockReset();
  });

  it("returns all resumes sorted by upload date", async () => {
    const resumes = [
      {
        PK: "RESUME#id1",
        SK: "META",
        id: "id1",
        filename: "resume-2024.pdf",
        s3Key: "resumes/id1.pdf",
        fileSize: 200000,
        isPreferred: true,
        uploadedAt: "2024-06-01T00:00:00.000Z",
      },
      {
        PK: "RESUME#id2",
        SK: "META",
        id: "id2",
        filename: "resume-old.pdf",
        s3Key: "resumes/id2.pdf",
        fileSize: 150000,
        isPreferred: false,
        uploadedAt: "2024-01-01T00:00:00.000Z",
      },
    ];
    mockQueryAllItems.mockResolvedValueOnce(resumes);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].id).toBe("id1");
    expect(body.data[0].filename).toBe("resume-2024.pdf");
    expect(body.data[0].isPreferred).toBe(true);
    expect(body.data[1].id).toBe("id2");
  });

  it("returns empty array when no resumes exist", async () => {
    mockQueryAllItems.mockResolvedValueOnce([]);

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(0);
  });

  it("returns 500 on DynamoDB error", async () => {
    mockQueryAllItems.mockRejectedValueOnce(new Error("DynamoDB failure"));

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to fetch resumes");
  });
});

describe("POST /api/resumes/upload", () => {
  beforeEach(() => {
    mockPutItem.mockReset();
    mockGenerateUploadUrl.mockReset();
  });

  it("generates presigned URL and saves metadata for valid PDF upload", async () => {
    mockGenerateUploadUrl.mockResolvedValueOnce("https://s3.amazonaws.com/presigned-url");
    mockPutItem.mockResolvedValueOnce(undefined);

    const { POST } = await import("./upload/route");
    const request = new Request("http://localhost/api/resumes/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "my-resume.pdf",
        contentType: "application/pdf",
        fileSize: 250000,
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.uploadUrl).toBe("https://s3.amazonaws.com/presigned-url");
    expect(body.data.resumeId).toBe("test-uuid-1234");
    expect(body.data.expiresIn).toBe(3600);
    expect(mockPutItem).toHaveBeenCalledTimes(1);
    expect(mockGenerateUploadUrl).toHaveBeenCalledWith(
      "resumes/test-uuid-1234.pdf",
      "application/pdf",
    );
  });

  it("rejects non-PDF content type", async () => {
    const { POST } = await import("./upload/route");
    const request = new Request("http://localhost/api/resumes/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "document.docx",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 100000,
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors.contentType).toBeDefined();
  });

  it("rejects file exceeding 10MB", async () => {
    const { POST } = await import("./upload/route");
    const request = new Request("http://localhost/api/resumes/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "large-resume.pdf",
        contentType: "application/pdf",
        fileSize: 11 * 1024 * 1024,
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
  });

  it("rejects missing filename", async () => {
    const { POST } = await import("./upload/route");
    const request = new Request("http://localhost/api/resumes/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: "application/pdf",
        fileSize: 100000,
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toBeDefined();
  });

  it("returns 500 when S3 upload URL generation fails", async () => {
    mockGenerateUploadUrl.mockRejectedValueOnce(new Error("S3 unavailable"));

    const { POST } = await import("./upload/route");
    const request = new Request("http://localhost/api/resumes/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "my-resume.pdf",
        contentType: "application/pdf",
        fileSize: 250000,
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to generate upload URL");
  });
});

describe("PUT /api/resumes/[id]/preferred", () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockQueryAllItems.mockReset();
    mockUpdateItem.mockReset();
  });

  it("sets the target resume as preferred", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "RESUME#id1",
      SK: "META",
      id: "id1",
      filename: "resume.pdf",
      s3Key: "resumes/id1.pdf",
      fileSize: 200000,
      isPreferred: false,
      uploadedAt: "2024-01-01T00:00:00.000Z",
    });
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "id1", isPreferred: false },
      { id: "id2", isPreferred: true },
    ]);
    mockUpdateItem.mockResolvedValue(null);

    const { PUT } = await import("./[id]/preferred/route");
    const request = new Request("http://localhost/api/resumes/id1/preferred", {
      method: "PUT",
    });

    const response = await PUT(request as never, {
      params: Promise.resolve({ id: "id1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Resume set as preferred");
    expect(mockUpdateItem).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when resume does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { PUT } = await import("./[id]/preferred/route");
    const request = new Request("http://localhost/api/resumes/nonexistent/preferred", {
      method: "PUT",
    });

    const response = await PUT(request as never, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Resume not found");
  });

  it("returns 500 on DynamoDB error", async () => {
    mockGetItem.mockRejectedValueOnce(new Error("DynamoDB failure"));

    const { PUT } = await import("./[id]/preferred/route");
    const request = new Request("http://localhost/api/resumes/id1/preferred", {
      method: "PUT",
    });

    const response = await PUT(request as never, {
      params: Promise.resolve({ id: "id1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to set preferred resume");
  });
});

describe("DELETE /api/resumes/[id]", () => {
  beforeEach(() => {
    mockGetItem.mockReset();
    mockDeleteItem.mockReset();
    mockDeleteFile.mockReset();
    mockQueryAllItems.mockReset();
  });

  it("deletes a non-preferred resume successfully", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "RESUME#id2",
      SK: "META",
      id: "id2",
      filename: "old-resume.pdf",
      s3Key: "resumes/id2.pdf",
      fileSize: 150000,
      isPreferred: false,
      uploadedAt: "2024-01-01T00:00:00.000Z",
    });
    mockDeleteFile.mockResolvedValueOnce(undefined);
    mockDeleteItem.mockResolvedValueOnce(undefined);

    const { DELETE } = await import("./[id]/route");
    const request = new Request("http://localhost/api/resumes/id2", {
      method: "DELETE",
    });

    const response = await DELETE(request as never, {
      params: Promise.resolve({ id: "id2" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Resume deleted successfully");
    expect(mockDeleteFile).toHaveBeenCalledWith("resumes/id2.pdf");
    expect(mockDeleteItem).toHaveBeenCalledWith({
      PK: "RESUME#id2",
      SK: "META",
    });
  });

  it("rejects deletion of preferred resume when other resumes exist (Req 3.5)", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "RESUME#id1",
      SK: "META",
      id: "id1",
      filename: "current.pdf",
      s3Key: "resumes/id1.pdf",
      fileSize: 200000,
      isPreferred: true,
      uploadedAt: "2024-06-01T00:00:00.000Z",
    });
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "id1", isPreferred: true },
      { id: "id2", isPreferred: false },
    ]);

    const { DELETE } = await import("./[id]/route");
    const request = new Request("http://localhost/api/resumes/id1", {
      method: "DELETE",
    });

    const response = await DELETE(request as never, {
      params: Promise.resolve({ id: "id1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toContain("set another resume as preferred");
    expect(mockDeleteFile).not.toHaveBeenCalled();
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("rejects deletion of the only preferred resume (Req 3.6)", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "RESUME#id1",
      SK: "META",
      id: "id1",
      filename: "only-resume.pdf",
      s3Key: "resumes/id1.pdf",
      fileSize: 200000,
      isPreferred: true,
      uploadedAt: "2024-06-01T00:00:00.000Z",
    });
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "id1", isPreferred: true },
    ]);

    const { DELETE } = await import("./[id]/route");
    const request = new Request("http://localhost/api/resumes/id1", {
      method: "DELETE",
    });

    const response = await DELETE(request as never, {
      params: Promise.resolve({ id: "id1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error).toContain("At least one preferred resume");
    expect(mockDeleteFile).not.toHaveBeenCalled();
    expect(mockDeleteItem).not.toHaveBeenCalled();
  });

  it("returns 404 when resume does not exist", async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const { DELETE } = await import("./[id]/route");
    const request = new Request("http://localhost/api/resumes/nonexistent", {
      method: "DELETE",
    });

    const response = await DELETE(request as never, {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Resume not found");
  });

  it("returns 500 on S3 deletion error", async () => {
    mockGetItem.mockResolvedValueOnce({
      PK: "RESUME#id2",
      SK: "META",
      id: "id2",
      filename: "old-resume.pdf",
      s3Key: "resumes/id2.pdf",
      fileSize: 150000,
      isPreferred: false,
      uploadedAt: "2024-01-01T00:00:00.000Z",
    });
    mockDeleteFile.mockRejectedValueOnce(new Error("S3 unavailable"));

    const { DELETE } = await import("./[id]/route");
    const request = new Request("http://localhost/api/resumes/id2", {
      method: "DELETE",
    });

    const response = await DELETE(request as never, {
      params: Promise.resolve({ id: "id2" }),
    });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Failed to delete resume");
  });
});
