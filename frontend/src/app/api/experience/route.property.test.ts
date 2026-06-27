/**
 * @jest-environment node
 */

/**
 * Property-based tests for Experience Reverse Chronological Ordering.
 *
 * Feature: portfolio-rebuild
 * Property 5: Experience Reverse Chronological Ordering
 *
 * Validates: Requirements 6.1
 *
 * For any set of experience entries with start dates, the public experience
 * listing SHALL present entries sorted by start date in descending
 * (most recent first) order.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

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

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid YYYY-MM date string within a reasonable range.
 */
const yearMonthArb: fc.Arbitrary<string> = fc
  .record({
    year: fc.integer({ min: 2000, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .map(({ year, month }) => `${year}-${String(month).padStart(2, "0")}`);

/**
 * Generate a single experience DynamoDB item with a given startDate.
 */
function experienceItemArb(index: number): fc.Arbitrary<{
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string | undefined;
  description: string;
  createdAt: string;
  updatedAt: string;
}> {
  return fc
    .record({
      startDate: yearMonthArb,
      jobTitle: fc.string({ minLength: 1, maxLength: 50 }),
      company: fc.string({ minLength: 1, maxLength: 50 }),
      description: fc.string({ minLength: 1, maxLength: 200 }),
      hasEndDate: fc.boolean(),
    })
    .chain((rec) =>
      fc.record({
        endDate: rec.hasEndDate ? yearMonthArb : fc.constant(undefined),
      }).map((end) => ({
        PK: `EXP#${index}`,
        SK: "META",
        GSI1PK: "EXPERIENCE",
        GSI1SK: `DATE#${rec.startDate}`,
        id: `exp-${index}`,
        jobTitle: rec.jobTitle,
        company: rec.company,
        startDate: rec.startDate,
        endDate: end.endDate,
        description: rec.description,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      })),
    );
}

/**
 * Generate an array of experience items (2 to 10 entries) with random start dates,
 * then sort them by GSI1SK descending to simulate DynamoDB's scanIndexForward: false behavior.
 */
const experienceItemsArb: fc.Arbitrary<
  Array<{
    PK: string;
    SK: string;
    GSI1PK: string;
    GSI1SK: string;
    id: string;
    jobTitle: string;
    company: string;
    startDate: string;
    endDate: string | undefined;
    description: string;
    createdAt: string;
    updatedAt: string;
  }>
> = fc
  .integer({ min: 2, max: 10 })
  .chain((count) =>
    fc.tuple(...Array.from({ length: count }, (_, i) => experienceItemArb(i))),
  )
  .map((items) =>
    // Sort by GSI1SK descending to simulate DynamoDB scanIndexForward: false
    [...items].sort((a, b) => b.GSI1SK.localeCompare(a.GSI1SK)),
  );

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 5: Experience Reverse Chronological Ordering", () => {
  beforeEach(() => {
    mockQueryItems.mockReset();
    jest.resetModules();
  });

  it("returns experience entries sorted by start date in descending order for any set of entries", async () => {
    await fc.assert(
      fc.asyncProperty(experienceItemsArb, async (items) => {
        mockQueryItems.mockResolvedValueOnce({ items });

        const { GET } = await import("./route");
        const response = await GET();
        const body = await response.json();

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(items.length);

        // Verify the returned entries are in descending start date order
        const startDates: string[] = body.data.map(
          (entry: { startDate: string }) => entry.startDate,
        );

        for (let i = 0; i < startDates.length - 1; i++) {
          expect(startDates[i]! >= startDates[i + 1]!).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
