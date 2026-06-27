/**
 * @jest-environment node
 */

/**
 * Tests for S3 client helpers — key generation, presigned URLs, asset URLs, and deletion.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// ─── S3 Key Helper Tests ────────────────────────────────────────────────────

describe("S3 Key Helpers", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock("@aws-sdk/client-s3", () => ({
      S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
      PutObjectCommand: jest.fn(),
      DeleteObjectCommand: jest.fn(),
      GetObjectCommand: jest.fn(),
    }));
    jest.mock("@aws-sdk/s3-request-presigner", () => ({
      getSignedUrl: jest.fn(),
    }));
  });

  describe("projectImageKey", () => {
    it("generates correct key for project image", async () => {
      const { projectImageKey } = await import("./s3");
      expect(projectImageKey("proj-123", "img-456", "png")).toBe(
        "projects/proj-123/img-456.png",
      );
    });

    it("supports various file extensions", async () => {
      const { projectImageKey } = await import("./s3");
      expect(projectImageKey("proj-1", "img-1", "jpeg")).toBe(
        "projects/proj-1/img-1.jpeg",
      );
      expect(projectImageKey("proj-1", "img-2", "webp")).toBe(
        "projects/proj-1/img-2.webp",
      );
    });
  });

  describe("resumeKey", () => {
    it("generates correct key for resume", async () => {
      const { resumeKey } = await import("./s3");
      expect(resumeKey("res-abc")).toBe("resumes/res-abc.pdf");
    });
  });
});

// ─── Asset URL Tests ────────────────────────────────────────────────────────

describe("getAssetUrl", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock("@aws-sdk/client-s3", () => ({
      S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
      PutObjectCommand: jest.fn(),
      DeleteObjectCommand: jest.fn(),
      GetObjectCommand: jest.fn(),
    }));
    jest.mock("@aws-sdk/s3-request-presigner", () => ({
      getSignedUrl: jest.fn(),
    }));
  });

  it("constructs public URL using default PUBLIC_URL", async () => {
    const { getAssetUrl, PUBLIC_URL } = await import("./s3");
    const url = getAssetUrl("projects/proj-1/img-1.png");
    expect(url).toBe(`${PUBLIC_URL}/projects/proj-1/img-1.png`);
  });

  it("constructs URL for resume assets", async () => {
    const { getAssetUrl, PUBLIC_URL } = await import("./s3");
    const url = getAssetUrl("resumes/res-123.pdf");
    expect(url).toBe(`${PUBLIC_URL}/resumes/res-123.pdf`);
  });
});

// ─── Presigned URL Generation Tests ─────────────────────────────────────────

describe("Presigned URL Generation", () => {
  const mockGetSignedUrl = jest.fn<() => Promise<string>>();

  beforeEach(() => {
    jest.resetModules();
    mockGetSignedUrl.mockReset();

    jest.mock("@aws-sdk/client-s3", () => ({
      S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
      PutObjectCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
      DeleteObjectCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
      GetObjectCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
    }));
    jest.mock("@aws-sdk/s3-request-presigner", () => ({
      getSignedUrl: mockGetSignedUrl,
    }));
  });

  describe("generateUploadUrl", () => {
    it("returns a presigned URL for upload", async () => {
      const expectedUrl = "https://s3.amazonaws.com/presigned-upload-url";
      mockGetSignedUrl.mockResolvedValueOnce(expectedUrl);

      const { generateUploadUrl } = await import("./s3");
      const url = await generateUploadUrl(
        "projects/proj-1/img-1.png",
        "image/png",
      );

      expect(url).toBe(expectedUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it("calls getSignedUrl with correct expiry (3600s)", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://example.com");

      const { generateUploadUrl } = await import("./s3");
      await generateUploadUrl("resumes/res-1.pdf", "application/pdf");

      const call = mockGetSignedUrl.mock.calls[0] as unknown as unknown[];
      // Second arg is the command
      const command = call[1] as { input: Record<string, unknown> };
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: "portfolio-assets",
          Key: "resumes/res-1.pdf",
          ContentType: "application/pdf",
        }),
      );
      // Third arg is options with expiresIn
      expect(call[2]).toEqual({ expiresIn: 3600 });
    });
  });

  describe("generateDownloadUrl", () => {
    it("returns a presigned URL for download", async () => {
      const expectedUrl = "https://s3.amazonaws.com/presigned-download-url";
      mockGetSignedUrl.mockResolvedValueOnce(expectedUrl);

      const { generateDownloadUrl } = await import("./s3");
      const url = await generateDownloadUrl("resumes/res-1.pdf");

      expect(url).toBe(expectedUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it("calls getSignedUrl with correct expiry (3600s)", async () => {
      mockGetSignedUrl.mockResolvedValueOnce("https://example.com");

      const { generateDownloadUrl } = await import("./s3");
      await generateDownloadUrl("projects/proj-1/img-1.png");

      const call = mockGetSignedUrl.mock.calls[0] as unknown as unknown[];
      // Second arg is the command
      const command = call[1] as { input: Record<string, unknown> };
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: "portfolio-assets",
          Key: "projects/proj-1/img-1.png",
        }),
      );
      // Third arg is options with expiresIn
      expect(call[2]).toEqual({ expiresIn: 3600 });
    });
  });
});

// ─── File Deletion Tests ────────────────────────────────────────────────────

describe("File Deletion", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockSend = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.resetModules();
    mockSend.mockReset();

    jest.mock("@aws-sdk/client-s3", () => ({
      S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
      PutObjectCommand: jest.fn(),
      DeleteObjectCommand: jest
        .fn()
        .mockImplementation((input: unknown) => ({ input })),
      GetObjectCommand: jest.fn(),
    }));
    jest.mock("@aws-sdk/s3-request-presigner", () => ({
      getSignedUrl: jest.fn(),
    }));
  });

  describe("deleteFile", () => {
    it("sends a DeleteObjectCommand for the given key", async () => {
      mockSend.mockResolvedValueOnce({});

      const { deleteFile } = await import("./s3");
      await deleteFile("projects/proj-1/img-1.png");

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: "portfolio-assets",
            Key: "projects/proj-1/img-1.png",
          }),
        }),
      );
    });
  });

  describe("deleteFiles", () => {
    it("deletes multiple files", async () => {
      mockSend.mockResolvedValue({});

      const { deleteFiles } = await import("./s3");
      await deleteFiles([
        "projects/proj-1/img-1.png",
        "projects/proj-1/img-2.jpg",
      ]);

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("handles empty array without errors", async () => {
      const { deleteFiles } = await import("./s3");
      await deleteFiles([]);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });
});

// ─── Configuration ──────────────────────────────────────────────────────────

describe("Configuration", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.mock("@aws-sdk/client-s3", () => ({
      S3Client: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
      PutObjectCommand: jest.fn(),
      DeleteObjectCommand: jest.fn(),
      GetObjectCommand: jest.fn(),
    }));
    jest.mock("@aws-sdk/s3-request-presigner", () => ({
      getSignedUrl: jest.fn(),
    }));
  });

  it("BUCKET_NAME defaults to portfolio-assets when env is not set", async () => {
    const { BUCKET_NAME } = await import("./s3");
    expect(BUCKET_NAME).toBe("portfolio-assets");
  });

  it("PRESIGNED_URL_EXPIRY is 3600 seconds (1 hour)", async () => {
    const { PRESIGNED_URL_EXPIRY } = await import("./s3");
    expect(PRESIGNED_URL_EXPIRY).toBe(3600);
  });

  it("PUBLIC_URL defaults to S3 URL pattern when env is not set", async () => {
    const { PUBLIC_URL, BUCKET_NAME } = await import("./s3");
    expect(PUBLIC_URL).toContain(BUCKET_NAME);
    expect(PUBLIC_URL).toContain("s3.");
    expect(PUBLIC_URL).toContain("amazonaws.com");
  });
});
