/**
 * @jest-environment node
 */

/**
 * Property-based tests for Admin-Defined Display Ordering (Projects).
 *
 * Feature: portfolio-rebuild
 * Property 3: Admin-Defined Display Ordering
 *
 * Validates: Requirements 4.2, 5.4, 7.2
 *
 * For any ordered collection (projects) with admin-defined display order values,
 * the public-facing output SHALL present items sorted by their display order
 * in ascending order.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockQueryAllItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAssetUrl = jest.fn<(key: string) => string>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
  Keys: {
    project: {
      gsi1pk: () => "PROJECTS",
      gsi1sk: (order: number) => `ORDER#${String(order).padStart(5, "0")}`,
      pk: (id: string) => `PROJECT#${id}`,
      sk: () => "META",
    },
    projectImage: {
      pk: (projectId: string) => `PROJECT#${projectId}`,
      sk: (order: number) => `IMAGE#${String(order).padStart(5, "0")}`,
    },
  },
}));

jest.mock("@/lib/s3", () => ({
  getAssetUrl: (key: string) => mockGetAssetUrl(key),
}));

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a random display order value (1 to 99999, matching the 5-digit pad).
 */
const displayOrderArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 99999 });

/**
 * Generate a random project item with a given display order.
 */
function projectItemArb(displayOrder: number, index: number) {
  return {
    PK: `PROJECT#p${index}`,
    SK: "META",
    GSI1PK: "PROJECTS",
    GSI1SK: `ORDER#${String(displayOrder).padStart(5, "0")}`,
    id: `p${index}`,
    title: `Project ${index}`,
    description: `Description for project ${index}`,
    githubUrl: `https://github.com/user/p${index}`,
    published: true,
    displayOrder,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

/**
 * Generate a list of unique display orders (to simulate distinct project positions).
 */
const uniqueDisplayOrdersArb: fc.Arbitrary<number[]> = fc
  .uniqueArray(displayOrderArb, { minLength: 1, maxLength: 20 })
  .filter((arr) => arr.length >= 1);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 3: Admin-Defined Display Ordering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssetUrl.mockImplementation(
      (key: string) => `https://cdn.example.com/${key}`,
    );
  });

  it("projects are returned in ascending display order", async () => {
    await fc.assert(
      fc.asyncProperty(uniqueDisplayOrdersArb, async (displayOrders) => {
        jest.resetModules();

        // Sort display orders ascending to simulate what DynamoDB GSI returns
        // (scanIndexForward: true sorts GSI1SK ascending)
        const sortedOrders = [...displayOrders].sort((a, b) => a - b);

        // Build project items in GSI-sorted order (as DynamoDB would return them)
        const projectItems = sortedOrders.map((order, idx) =>
          projectItemArb(order, idx),
        );

        // queryAllItems returns projects in GSI-sorted order (array directly)
        mockQueryAllItems.mockResolvedValueOnce(projectItems);

        // For each project, return empty images via queryItems
        for (let i = 0; i < projectItems.length; i++) {
          mockQueryItems.mockResolvedValueOnce({ items: [] });
        }

        const { GET } = await import("./route");
        const response = await GET();
        const body = await response.json();

        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(sortedOrders.length);

        // Verify the output preserves ascending display order
        for (let i = 0; i < body.data.length; i++) {
          expect(body.data[i].displayOrder).toBe(sortedOrders[i]);
        }

        // Verify each consecutive pair is in ascending order
        for (let i = 1; i < body.data.length; i++) {
          expect(body.data[i].displayOrder).toBeGreaterThanOrEqual(
            body.data[i - 1].displayOrder,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
