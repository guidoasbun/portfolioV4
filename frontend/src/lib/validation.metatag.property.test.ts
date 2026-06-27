/**
 * @jest-environment node
 */

/**
 * Property-based tests for Meta Tag Character Constraints.
 *
 * Feature: portfolio-rebuild
 * Property 15: Meta Tag Character Constraints
 *
 * Validates: Requirements 16.2
 *
 * For any page metadata configuration, the generated meta title SHALL not
 * exceed 60 characters and the generated meta description SHALL not exceed
 * 160 characters.
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import {
  validateMetaTags,
  META_TITLE_MAX_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
} from "./validation";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid meta title (0 to 60 characters).
 */
const validTitleArb: fc.Arbitrary<string> = fc.string({
  minLength: 0,
  maxLength: META_TITLE_MAX_LENGTH,
});

/**
 * Generate an invalid meta title (strictly more than 60 characters).
 */
const invalidTitleArb: fc.Arbitrary<string> = fc.string({
  minLength: META_TITLE_MAX_LENGTH + 1,
  maxLength: META_TITLE_MAX_LENGTH * 3,
});

/**
 * Generate a valid meta description (0 to 160 characters).
 */
const validDescriptionArb: fc.Arbitrary<string> = fc.string({
  minLength: 0,
  maxLength: META_DESCRIPTION_MAX_LENGTH,
});

/**
 * Generate an invalid meta description (strictly more than 160 characters).
 */
const invalidDescriptionArb: fc.Arbitrary<string> = fc.string({
  minLength: META_DESCRIPTION_MAX_LENGTH + 1,
  maxLength: META_DESCRIPTION_MAX_LENGTH * 3,
});

/**
 * Generate any title (both valid and invalid lengths).
 */
const anyTitleArb: fc.Arbitrary<string> = fc.oneof(validTitleArb, invalidTitleArb);

/**
 * Generate any description (both valid and invalid lengths).
 */
const anyDescriptionArb: fc.Arbitrary<string> = fc.oneof(validDescriptionArb, invalidDescriptionArb);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 15: Meta Tag Character Constraints", () => {
  it("accepts meta tags when title ≤ 60 chars and description ≤ 160 chars", () => {
    fc.assert(
      fc.property(validTitleArb, validDescriptionArb, (title, description) => {
        const result = validateMetaTags({ title, description });

        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects meta tags when title exceeds 60 characters", () => {
    fc.assert(
      fc.property(invalidTitleArb, validDescriptionArb, (title, description) => {
        const result = validateMetaTags({ title, description });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.title).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("rejects meta tags when description exceeds 160 characters", () => {
    fc.assert(
      fc.property(validTitleArb, invalidDescriptionArb, (title, description) => {
        const result = validateMetaTags({ title, description });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.description).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("rejects and reports both errors when title AND description exceed limits", () => {
    fc.assert(
      fc.property(invalidTitleArb, invalidDescriptionArb, (title, description) => {
        const result = validateMetaTags({ title, description });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.title).toBeDefined();
          expect(result.errors.description).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("correctly classifies any random metadata combination", () => {
    fc.assert(
      fc.property(anyTitleArb, anyDescriptionArb, (title, description) => {
        const result = validateMetaTags({ title, description });

        const isTitleValid = title.length <= META_TITLE_MAX_LENGTH;
        const isDescriptionValid = description.length <= META_DESCRIPTION_MAX_LENGTH;

        if (isTitleValid && isDescriptionValid) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
          if (!result.success) {
            if (!isTitleValid) {
              expect(result.errors.title).toBeDefined();
            }
            if (!isDescriptionValid) {
              expect(result.errors.description).toBeDefined();
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
