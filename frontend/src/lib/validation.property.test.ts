/**
 * @jest-environment node
 */

/**
 * Property-based tests for Resume File Validation.
 *
 * Feature: portfolio-rebuild
 * Property 1: Resume File Validation
 *
 * Validates: Requirements 3.1, 3.7
 *
 * For any file metadata (type and size), the resume upload validation function
 * SHALL accept only files with content type `application/pdf` and size ≤ 10MB,
 * and reject all others with an appropriate error indicating which constraint
 * was violated.
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import {
  validateResumeFile,
  RESUME_MAX_SIZE,
} from "./validation";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a non-PDF content type from a variety of common MIME types.
 */
const invalidContentTypeArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "text/plain",
    "text/html",
    "application/json",
    "application/xml",
    "application/zip",
    "application/octet-stream",
    "video/mp4",
    "audio/mpeg",
  ),
  // Also generate random strings that are clearly not application/pdf
  fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s !== "application/pdf"),
);

/**
 * Generate a valid file size (0 to exactly 10MB inclusive).
 */
const validFileSizeArb: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: RESUME_MAX_SIZE,
});

/**
 * Generate an invalid file size (strictly greater than 10MB).
 */
const invalidFileSizeArb: fc.Arbitrary<number> = fc.integer({
  min: RESUME_MAX_SIZE + 1,
  max: RESUME_MAX_SIZE * 5, // Up to 50MB
});

/**
 * Generate any file size (both valid and invalid range).
 */
const anyFileSizeArb: fc.Arbitrary<number> = fc.oneof(validFileSizeArb, invalidFileSizeArb);

/**
 * Generate any content type (both valid PDF and invalid types).
 */
const anyContentTypeArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant("application/pdf"),
  invalidContentTypeArb,
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 1: Resume File Validation", () => {
  it("accepts only application/pdf with size ≤ 10MB", () => {
    fc.assert(
      fc.property(anyContentTypeArb, anyFileSizeArb, (contentType, fileSize) => {
        const result = validateResumeFile({ contentType, fileSize });

        const isValidType = contentType === "application/pdf";
        const isValidSize = fileSize <= RESUME_MAX_SIZE;

        if (isValidType && isValidSize) {
          // Valid PDF within size limit must be accepted
          expect(result.success).toBe(true);
        } else {
          // Any violation must be rejected
          expect(result.success).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("reports contentType error when type is not application/pdf", () => {
    fc.assert(
      fc.property(invalidContentTypeArb, validFileSizeArb, (contentType, fileSize) => {
        const result = validateResumeFile({ contentType, fileSize });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.contentType).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("reports fileSize error when size exceeds 10MB", () => {
    fc.assert(
      fc.property(invalidFileSizeArb, (fileSize) => {
        const result = validateResumeFile({ contentType: "application/pdf", fileSize });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.fileSize).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("reports both errors when type AND size are invalid", () => {
    fc.assert(
      fc.property(invalidContentTypeArb, invalidFileSizeArb, (contentType, fileSize) => {
        const result = validateResumeFile({ contentType, fileSize });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.contentType).toBeDefined();
          expect(result.errors.fileSize).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
