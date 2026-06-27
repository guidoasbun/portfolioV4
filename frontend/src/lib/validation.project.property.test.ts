/**
 * @jest-environment node
 */

/**
 * Property-based tests for Project Form Validation.
 *
 * Feature: portfolio-rebuild
 * Property 11: Project Form Validation
 *
 * Validates: Requirements 10.4
 *
 * For any project form submission, the validation function SHALL reject
 * submissions where title is empty or description is empty, and SHALL return
 * field-specific error identifiers for each violated constraint.
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import { validateProjectForm } from "./validation";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid title (non-empty string, max 200 characters).
 */
const validTitleArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate an invalid title (empty string).
 */
const invalidTitleArb: fc.Arbitrary<string> = fc.constant("");

/**
 * Generate a valid description (non-empty string, max 5000 characters).
 */
const validDescriptionArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 500 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate an invalid description (empty string).
 */
const invalidDescriptionArb: fc.Arbitrary<string> = fc.constant("");

/**
 * Generate optional valid URLs (either undefined or a well-formed URL).
 */
const optionalUrlArb: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.constant(""),
  fc
    .tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{1,10}$/).filter((s) => s.length >= 2),
      fc.constantFrom(".com", ".org", ".io", ".net"),
    )
    .map(([domain, tld]) => `https://${domain}${tld}`),
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 11: Project Form Validation", () => {
  it("accepts fully valid inputs (non-empty title and description)", () => {
    fc.assert(
      fc.property(
        validTitleArb,
        validDescriptionArb,
        optionalUrlArb,
        optionalUrlArb,
        (title, description, githubUrl, deploymentUrl) => {
          const result = validateProjectForm({ title, description, githubUrl, deploymentUrl });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects empty title with errors.title", () => {
    fc.assert(
      fc.property(
        invalidTitleArb,
        validDescriptionArb,
        optionalUrlArb,
        optionalUrlArb,
        (title, description, githubUrl, deploymentUrl) => {
          const result = validateProjectForm({ title, description, githubUrl, deploymentUrl });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.errors.title).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects empty description with errors.description", () => {
    fc.assert(
      fc.property(
        validTitleArb,
        invalidDescriptionArb,
        optionalUrlArb,
        optionalUrlArb,
        (title, description, githubUrl, deploymentUrl) => {
          const result = validateProjectForm({ title, description, githubUrl, deploymentUrl });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.errors.description).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("reports both errors when title and description are missing", () => {
    fc.assert(
      fc.property(
        invalidTitleArb,
        invalidDescriptionArb,
        optionalUrlArb,
        optionalUrlArb,
        (title, description, githubUrl, deploymentUrl) => {
          const result = validateProjectForm({ title, description, githubUrl, deploymentUrl });
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.errors.title).toBeDefined();
            expect(result.errors.description).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
