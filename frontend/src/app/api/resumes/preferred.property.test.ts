/**
 * @jest-environment node
 */

/**
 * Property-based tests for Preferred Resume Invariant.
 *
 * Feature: portfolio-rebuild
 * Property 2: Preferred Resume Invariant
 *
 * Validates: Requirements 3.3
 *
 * For any set of resumes and any "set preferred" operation targeting a specific resume,
 * the resulting state SHALL have exactly one resume marked as preferred,
 * and it SHALL be the one that was targeted.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ResumeItem {
  PK: string;
  SK: string;
  id: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  isPreferred: boolean;
  uploadedAt: string;
}

interface UpdateCall {
  key: { PK: string; SK: string };
  updateExpression: string;
  expressionAttributeValues: Record<string, unknown>;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a random resume item with a given ID and preferred status.
 */
function resumeItemArb(id: string, isPreferred: boolean): fc.Arbitrary<ResumeItem> {
  return fc.record({
    PK: fc.constant(`RESUME#${id}`),
    SK: fc.constant("META"),
    id: fc.constant(id),
    filename: fc.string({ minLength: 1, maxLength: 30 }).map((s) => `${s}.pdf`),
    s3Key: fc.constant(`resumes/${id}.pdf`),
    fileSize: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }),
    isPreferred: fc.constant(isPreferred),
    uploadedAt: fc.constant("2024-01-01T00:00:00.000Z"),
  });
}

/**
 * Generate a random set of resumes (1-10) with random initial preferred states,
 * and a target resume ID that exists in the set.
 */
const resumeSetWithTargetArb = fc
  .integer({ min: 1, max: 10 })
  .chain((count) => {
    // Generate unique IDs for all resumes
    return fc
      .uniqueArray(fc.uuid(), { minLength: count, maxLength: count })
      .chain((ids) => {
        // Pick a random target from the set
        return fc.integer({ min: 0, max: ids.length - 1 }).chain((targetIdx) => {
          const targetId = ids[targetIdx]!;

          // Generate random preferred states for each resume
          return fc.tuple(
            ...ids.map((id) =>
              fc.boolean().chain((preferred) => resumeItemArb(id, preferred)),
            ),
          ).map((resumes) => ({
            resumes: resumes as ResumeItem[],
            targetId,
          }));
        });
      });
  });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 2: Preferred Resume Invariant", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("after setting preferred, exactly one resume is preferred and it is the target", async () => {
    await fc.assert(
      fc.asyncProperty(resumeSetWithTargetArb, async ({ resumes, targetId }) => {
        jest.resetModules();

        const targetResume = resumes.find((r) => r.id === targetId)!;

        // Track all updateItem calls to verify the invariant
        const updateCalls: UpdateCall[] = [];
        const mockGetItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();
        const mockQueryAllItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
        const mockUpdateItem = jest.fn<(...args: unknown[]) => Promise<unknown>>();

        // getItem returns the target resume (verifying it exists)
        mockGetItem.mockResolvedValue(targetResume);

        // queryAllItems returns all resumes in the set
        mockQueryAllItems.mockResolvedValue(resumes);

        // updateItem captures the calls and records what was set
        mockUpdateItem.mockImplementation(async (options: unknown) => {
          const opts = options as UpdateCall;
          updateCalls.push(opts);
          return null;
        });

        jest.doMock("server-only", () => ({}));
        jest.doMock("@/lib/dynamodb", () => ({
          getItem: (...args: unknown[]) => mockGetItem(...args),
          queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
          updateItem: (...args: unknown[]) => mockUpdateItem(...args),
          Keys: {
            resume: {
              pk: (id: string) => `RESUME#${id}`,
              sk: () => "META",
              gsi1pk: () => "RESUMES",
              gsi1sk: (date: string) => `DATE#${date}`,
            },
          },
        }));

        const { PUT } = await import("./[id]/preferred/route");

        // Create a mock NextRequest
        const request = new Request("http://localhost/api/resumes/" + targetId + "/preferred", {
          method: "PUT",
        });

        const response = await PUT(request as never, {
          params: Promise.resolve({ id: targetId }),
        });

        const body = await response.json();

        // The operation should succeed
        expect(body.success).toBe(true);

        // Verify updateItem was called once per resume
        expect(updateCalls).toHaveLength(resumes.length);

        // Count how many resumes end up as preferred from the update calls
        let preferredCount = 0;
        let preferredId: string | null = null;

        for (const call of updateCalls) {
          const preferredValue = call.expressionAttributeValues[":preferred"];
          if (preferredValue === true) {
            preferredCount++;
            // Extract ID from the PK (format: RESUME#<id>)
            preferredId = call.key.PK.replace("RESUME#", "");
          }
        }

        // INVARIANT: Exactly one resume is set as preferred
        expect(preferredCount).toBe(1);

        // INVARIANT: The preferred resume is the target
        expect(preferredId).toBe(targetId);

        // INVARIANT: All other resumes are set to not preferred
        const nonPreferredCalls = updateCalls.filter(
          (call) => call.expressionAttributeValues[":preferred"] === false,
        );
        expect(nonPreferredCalls).toHaveLength(resumes.length - 1);
      }),
      { numRuns: 100 },
    );
  });
});
