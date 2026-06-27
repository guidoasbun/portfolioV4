/**
 * @jest-environment node
 */

/**
 * Property-based tests for Image Upload Validation.
 *
 * Feature: portfolio-rebuild
 * Property 12: Image Upload Validation
 *
 * Validates: Requirements 10.5, 10.6
 *
 * For any file metadata (type, size) and current image count, the image upload
 * validation function SHALL accept only files with content type in
 * {image/jpeg, image/png, image/webp}, size ≤ 5MB, and current image count < 10,
 * and reject all others with appropriate errors indicating which constraints
 * were violated.
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import {
  validateImageUpload,
  IMAGE_MAX_SIZE,
  MAX_IMAGES_PER_PROJECT,
} from "./validation";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid image content type (one of JPEG, PNG, WebP).
 */
const validContentTypeArb: fc.Arbitrary<string> = fc.constantFrom(
  "image/jpeg",
  "image/png",
  "image/webp",
);

/**
 * Generate an invalid content type (not JPEG/PNG/WebP).
 */
const invalidContentTypeArb: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(
    "application/pdf",
    "image/gif",
    "image/bmp",
    "image/svg+xml",
    "text/plain",
    "text/html",
    "application/json",
    "application/xml",
    "application/zip",
    "application/octet-stream",
    "video/mp4",
    "audio/mpeg",
  ),
  fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s !== "image/jpeg" && s !== "image/png" && s !== "image/webp"),
);

/**
 * Generate a valid file size (0 to 5MB inclusive).
 */
const validFileSizeArb: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: IMAGE_MAX_SIZE,
});

/**
 * Generate an invalid file size (strictly greater than 5MB).
 */
const invalidFileSizeArb: fc.Arbitrary<number> = fc.integer({
  min: IMAGE_MAX_SIZE + 1,
  max: IMAGE_MAX_SIZE * 5, // Up to 25MB
});

/**
 * Generate a valid image count (0 to 9, allowing one more upload).
 */
const validImageCountArb: fc.Arbitrary<number> = fc.integer({
  min: 0,
  max: MAX_IMAGES_PER_PROJECT - 1,
});

/**
 * Generate an invalid image count (10 or more, at or over the limit).
 */
const invalidImageCountArb: fc.Arbitrary<number> = fc.integer({
  min: MAX_IMAGES_PER_PROJECT,
  max: MAX_IMAGES_PER_PROJECT * 3, // Up to 30
});

/**
 * Generate any content type (both valid and invalid).
 */
const anyContentTypeArb: fc.Arbitrary<string> = fc.oneof(
  validContentTypeArb,
  invalidContentTypeArb,
);

/**
 * Generate any file size (both valid and invalid range).
 */
const anyFileSizeArb: fc.Arbitrary<number> = fc.oneof(validFileSizeArb, invalidFileSizeArb);

/**
 * Generate any image count (both valid and invalid).
 */
const anyImageCountArb: fc.Arbitrary<number> = fc.oneof(
  validImageCountArb,
  invalidImageCountArb,
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 12: Image Upload Validation", () => {
  it("accepts valid type + valid size + count < 10", () => {
    fc.assert(
      fc.property(
        validContentTypeArb,
        validFileSizeArb,
        validImageCountArb,
        (contentType, fileSize, currentImageCount) => {
          const result = validateImageUpload({ contentType, fileSize }, currentImageCount);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects invalid content type with errors.contentType", () => {
    fc.assert(
      fc.property(
        invalidContentTypeArb,
        validFileSizeArb,
        validImageCountArb,
        (contentType, fileSize, currentImageCount) => {
          const result = validateImageUpload({ contentType, fileSize }, currentImageCount);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.errors.contentType).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects file size > 5MB with errors.fileSize", () => {
    fc.assert(
      fc.property(
        validContentTypeArb,
        invalidFileSizeArb,
        validImageCountArb,
        (contentType, fileSize, currentImageCount) => {
          const result = validateImageUpload({ contentType, fileSize }, currentImageCount);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.errors.fileSize).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects when image count >= 10 with errors.count", () => {
    fc.assert(
      fc.property(
        validContentTypeArb,
        validFileSizeArb,
        invalidImageCountArb,
        (contentType, fileSize, currentImageCount) => {
          const result = validateImageUpload({ contentType, fileSize }, currentImageCount);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.errors.count).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("reports all applicable errors when multiple constraints violated", () => {
    fc.assert(
      fc.property(
        invalidContentTypeArb,
        invalidFileSizeArb,
        invalidImageCountArb,
        (contentType, fileSize, currentImageCount) => {
          const result = validateImageUpload({ contentType, fileSize }, currentImageCount);
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.errors.contentType).toBeDefined();
            expect(result.errors.fileSize).toBeDefined();
            expect(result.errors.count).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("acceptance happens only when ALL three constraints are satisfied", () => {
    fc.assert(
      fc.property(
        anyContentTypeArb,
        anyFileSizeArb,
        anyImageCountArb,
        (contentType, fileSize, currentImageCount) => {
          const result = validateImageUpload({ contentType, fileSize }, currentImageCount);

          const isValidType =
            contentType === "image/jpeg" ||
            contentType === "image/png" ||
            contentType === "image/webp";
          const isValidSize = fileSize <= IMAGE_MAX_SIZE;
          const isValidCount = currentImageCount < MAX_IMAGES_PER_PROJECT;

          if (isValidType && isValidSize && isValidCount) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
