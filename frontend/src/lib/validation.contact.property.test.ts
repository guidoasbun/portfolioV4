/**
 * @jest-environment node
 */

/**
 * Property-based tests for Contact Form Validation.
 *
 * Feature: portfolio-rebuild
 * Property 8: Contact Form Validation
 *
 * Validates: Requirements 8.3
 *
 * For any contact form submission, the validation function SHALL reject
 * submissions where name is empty, email does not match a valid email format,
 * or message body is empty, and SHALL return field-specific error identifiers
 * for each violated constraint.
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import { validateContactForm } from "./validation";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid name (non-empty string, max 100 characters).
 */
const validNameArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate an invalid name (empty string).
 */
const invalidNameArb: fc.Arbitrary<string> = fc.constant("");

/**
 * Generate a valid email address that passes Zod's .email() validation.
 * We construct emails from safe characters since fc.emailAddress() can produce
 * RFC-valid addresses that Zod's stricter validator rejects (e.g., leading '!',
 * consecutive dots).
 */
const validEmailArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{0,14}$/).filter((s) => s.length >= 1),
    fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/).filter((s) => s.length >= 1),
    fc.constantFrom("com", "org", "net", "io", "co"),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/**
 * Generate an invalid email (strings that don't match a valid email format).
 */
const invalidEmailArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(""),
  fc.constant("notanemail"),
  fc.constant("missing@"),
  fc.constant("@nodomain"),
  fc.constant("spaces in@email.com"),
  fc.constant("no-at-sign.com"),
  fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => !s.includes("@") || s.startsWith("@") || s.endsWith("@")),
);

/**
 * Generate a valid message body (non-empty string, max 2000 characters).
 */
const validMessageArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 2000 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate an invalid message body (empty string).
 */
const invalidMessageArb: fc.Arbitrary<string> = fc.constant("");

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 8: Contact Form Validation", () => {
  it("accepts fully valid inputs (non-empty name, valid email, non-empty message)", () => {
    fc.assert(
      fc.property(validNameArb, validEmailArb, validMessageArb, (name, email, message) => {
        const result = validateContactForm({ name, email, message });
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty name with errors.name", () => {
    fc.assert(
      fc.property(invalidNameArb, validEmailArb, validMessageArb, (name, email, message) => {
        const result = validateContactForm({ name, email, message });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.name).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("rejects invalid email format with errors.email", () => {
    fc.assert(
      fc.property(validNameArb, invalidEmailArb, validMessageArb, (name, email, message) => {
        const result = validateContactForm({ name, email, message });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.email).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("rejects empty message body with errors.message", () => {
    fc.assert(
      fc.property(validNameArb, validEmailArb, invalidMessageArb, (name, email, message) => {
        const result = validateContactForm({ name, email, message });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.message).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });

  it("reports multiple errors when multiple fields are invalid", () => {
    fc.assert(
      fc.property(invalidNameArb, invalidEmailArb, invalidMessageArb, (name, email, message) => {
        const result = validateContactForm({ name, email, message });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.errors.name).toBeDefined();
          expect(result.errors.email).toBeDefined();
          expect(result.errors.message).toBeDefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
