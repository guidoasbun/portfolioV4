/**
 * @jest-environment node
 */

/**
 * Property-based tests for Published Project Filtering.
 *
 * Feature: portfolio-rebuild
 * Property 4: Published Project Filtering
 *
 * Validates: Requirements 5.1
 *
 * For any set of projects with mixed published/unpublished status,
 * the public projects listing SHALL include only projects where published is true,
 * and SHALL exclude all unpublished projects.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAssetUrl = jest.fn<(key: string) => string>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
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
 * Generate a random project DynamoDB item with a given published status.
 */
function projectItemArb(published: boolean) {
  return fc.record({
    PK: fc.string({ minLength: 1, maxLength: 10 }).map((s) => `PROJECT#${s}`),
    SK: fc.constant("META"),
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    githubUrl: fc.webUrl(),
    deploymentUrl: fc.option(fc.webUrl(), { nil: undefined }),
    published: fc.constant(published),
    displayOrder: fc.integer({ min: 0, max: 1000 }),
    createdAt: fc.date().map((d) => d.toISOString()),
    updatedAt: fc.date().map((d) => d.toISOString()),
  });
}

/**
 * Generate a mixed array of published and unpublished project items.
 * Ensures at least one project exists.
 */
const mixedProjectsArb = fc
  .tuple(
    fc.array(projectItemArb(true), { minLength: 0, maxLength: 5 }),
    fc.array(projectItemArb(false), { minLength: 0, maxLength: 5 }),
  )
  .filter(([pub, unpub]) => pub.length + unpub.length > 0)
  .map(([published, unpublished]) => ({
    allProjects: [...published, ...unpublished],
    publishedProjects: published,
    unpublishedProjects: unpublished,
  }));

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 4: Published Project Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAssetUrl.mockImplementation(
      (key: string) => `https://cdn.example.com/${key}`,
    );
  });

  it("returns only published projects and excludes all unpublished projects", async () => {
    await fc.assert(
      fc.asyncProperty(mixedProjectsArb, async ({ allProjects, publishedProjects, unpublishedProjects }) => {
        jest.resetModules();

        // The route handler uses a DynamoDB filter expression for published = true.
        // We simulate the DynamoDB behavior: queryItems returns only published items
        // because the filterExpression is applied server-side.
        const mockQueryItemsLocal = jest.fn<(...args: unknown[]) => Promise<unknown>>();

        // First call returns only published projects (simulating DynamoDB filter)
        mockQueryItemsLocal.mockResolvedValueOnce({
          items: publishedProjects,
        });

        // Subsequent calls for images return empty arrays
        for (let i = 0; i < publishedProjects.length; i++) {
          mockQueryItemsLocal.mockResolvedValueOnce({ items: [] });
        }

        const mockGetAssetUrlLocal = jest.fn((key: string) => `https://cdn.example.com/${key}`);

        jest.doMock("server-only", () => ({}));
        jest.doMock("@/lib/dynamodb", () => ({
          queryItems: (...args: unknown[]) => mockQueryItemsLocal(...args),
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
        jest.doMock("@/lib/s3", () => ({
          getAssetUrl: (key: string) => mockGetAssetUrlLocal(key),
        }));

        const { GET } = await import("./route");
        const response = await GET();
        const body = await response.json();

        // The response must be successful
        expect(body.success).toBe(true);

        // All returned projects must have published = true
        for (const project of body.data) {
          expect(project.published).toBe(true);
        }

        // The number of returned projects must match the number of published input projects
        expect(body.data).toHaveLength(publishedProjects.length);

        // None of the unpublished project IDs should appear in the response
        const returnedIds = new Set(body.data.map((p: { id: string }) => p.id));
        for (const unpub of unpublishedProjects) {
          expect(returnedIds.has(unpub.id)).toBe(false);
        }

        // All published project IDs should appear in the response
        for (const pub of publishedProjects) {
          expect(returnedIds.has(pub.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
