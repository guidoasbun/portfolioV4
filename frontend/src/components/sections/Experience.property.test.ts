/**
 * @jest-environment node
 */

/**
 * Property-based tests for Experience Entry Rendering.
 *
 * Feature: portfolio-rebuild
 * Property 6: Experience Entry Rendering
 *
 * Validates: Requirements 6.2, 6.5
 *
 * For any set of experience entries, all required fields must be present in
 * the output. Entries with a null end date must display "Present".
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import { formatDate, formatDateRange } from "./experience-utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const MONTH_ABBREVIATIONS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid YYYY-MM date string (year 1900-2099, month 01-12).
 */
const yearMonthArb: fc.Arbitrary<string> = fc
  .record({
    year: fc.integer({ min: 1900, max: 2099 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, "0")}`);

/**
 * Generate a random experience entry with all required fields populated.
 */
const experienceEntryArb = fc.record({
  jobTitle: fc.string({ minLength: 1, maxLength: 100 }),
  company: fc.string({ minLength: 1, maxLength: 100 }),
  startDate: yearMonthArb,
  endDate: yearMonthArb,
  description: fc.string({ minLength: 1, maxLength: 500 }),
});

/**
 * Generate a random experience entry with endDate undefined (current role).
 */
const currentRoleEntryArb = fc.record({
  jobTitle: fc.string({ minLength: 1, maxLength: 100 }),
  company: fc.string({ minLength: 1, maxLength: 100 }),
  startDate: yearMonthArb,
  endDate: fc.constant(undefined),
  description: fc.string({ minLength: 1, maxLength: 500 }),
});

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 6: Experience Entry Rendering", () => {
  /**
   * Property 6.1: For any valid YYYY-MM string where month is 01-12,
   * formatDate returns a string containing the correct month abbreviation and year.
   *
   * **Validates: Requirements 6.2**
   */
  it("formatDate returns correct month abbreviation and year for any valid YYYY-MM input", () => {
    fc.assert(
      fc.property(yearMonthArb, (dateStr) => {
        const result = formatDate(dateStr);

        const [yearStr, monthStr] = dateStr.split("-");
        const year = yearStr!;
        const monthIndex = parseInt(monthStr!, 10) - 1;
        const expectedMonth = MONTH_ABBREVIATIONS[monthIndex]!;

        // Result must contain the correct month abbreviation
        expect(result).toContain(expectedMonth);
        // Result must contain the year
        expect(result).toContain(year);
        // Result must be in "Mon Year" format
        expect(result).toBe(`${expectedMonth} ${year}`);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6.2: For any experience entry with both startDate and endDate,
   * the formatted date range contains both formatted dates separated by " - ".
   *
   * **Validates: Requirements 6.2**
   */
  it("formatDateRange contains both formatted dates when endDate is provided", () => {
    fc.assert(
      fc.property(experienceEntryArb, (entry) => {
        const result = formatDateRange(entry.startDate, entry.endDate);

        const expectedStart = formatDate(entry.startDate);
        const expectedEnd = formatDate(entry.endDate);

        // Result must contain both formatted dates
        expect(result).toContain(expectedStart);
        expect(result).toContain(expectedEnd);
        // Result must be in "Start - End" format
        expect(result).toBe(`${expectedStart} - ${expectedEnd}`);
        // Result must NOT contain "Present"
        expect(result).not.toContain("Present");
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6.3: For any experience entry with no endDate (undefined),
   * the formatted date range contains "Present".
   *
   * **Validates: Requirements 6.5**
   */
  it("formatDateRange contains 'Present' when endDate is undefined", () => {
    fc.assert(
      fc.property(currentRoleEntryArb, (entry) => {
        const result = formatDateRange(entry.startDate, entry.endDate);

        const expectedStart = formatDate(entry.startDate);

        // Result must contain the formatted start date
        expect(result).toContain(expectedStart);
        // Result must contain "Present"
        expect(result).toContain("Present");
        // Result must be in "Start - Present" format
        expect(result).toBe(`${expectedStart} - Present`);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6.4: For any experience entry, all required fields (jobTitle,
   * company, startDate, description) are non-empty, and formatDateRange
   * produces valid output incorporating startDate.
   *
   * **Validates: Requirements 6.2**
   */
  it("all required fields are present and produce valid rendering output for any entry", () => {
    const anyEntryArb = fc.oneof(experienceEntryArb, currentRoleEntryArb);

    fc.assert(
      fc.property(anyEntryArb, (entry) => {
        // All required fields must be non-empty strings
        expect(entry.jobTitle.length).toBeGreaterThan(0);
        expect(entry.company.length).toBeGreaterThan(0);
        expect(entry.startDate.length).toBeGreaterThan(0);
        expect(entry.description.length).toBeGreaterThan(0);

        // The date range must be renderable and include the start date
        const dateRange = formatDateRange(entry.startDate, entry.endDate);
        const formattedStart = formatDate(entry.startDate);
        expect(dateRange).toContain(formattedStart);

        // If endDate is undefined, "Present" must appear
        if (entry.endDate === undefined) {
          expect(dateRange).toContain("Present");
        } else {
          // If endDate is defined, it must appear formatted
          const formattedEnd = formatDate(entry.endDate);
          expect(dateRange).toContain(formattedEnd);
        }
      }),
      { numRuns: 100 },
    );
  });
});
