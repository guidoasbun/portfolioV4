/**
 * @jest-environment node
 */

/**
 * Property-based tests for Skills Grouping and Empty Category Filtering.
 *
 * Feature: portfolio-rebuild
 * Property 7: Skills Grouping and Empty Category Filtering
 *
 * Validates: Requirements 7.1, 7.4
 *
 * For any set of skills with category assignments, the public skills output
 * SHALL group skills by their assigned category AND SHALL exclude any category
 * that contains zero skills.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as fc from "fast-check";

// Mock server-only (no-op in tests)
jest.mock("server-only", () => ({}));

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQueryItems = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/dynamodb", () => ({
  queryItems: (...args: unknown[]) => mockQueryItems(...args),
  Keys: {
    skillCategory: {
      gsi1pk: () => "SKILLCATS",
      gsi1sk: (order: number) => `ORDER#${String(order).padStart(5, "0")}`,
      pk: (id: string) => `SKILLCAT#${id}`,
      sk: () => "META",
    },
    skill: {
      gsi1pk: (category: string) => `SKILLS#${category}`,
      gsi1sk: (name: string) => `NAME#${name}`,
      pk: (id: string) => `SKILL#${id}`,
      sk: () => "META",
    },
  },
}));

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Generate a valid category ID (alphanumeric, 3-10 chars).
 */
const categoryIdArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[a-z][a-z0-9]{2,9}$/)
  .filter((s) => s.length >= 3);

/**
 * Generate a valid category label (1-30 chars, letters and spaces).
 */
const categoryLabelArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[A-Za-z][A-Za-z ]{0,29}$/)
  .filter((s) => s.trim().length > 0);

/**
 * Generate a valid skill name (1-30 chars).
 */
const skillNameArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9 .#+-]{0,29}$/)
  .filter((s) => s.trim().length > 0);

/**
 * A category with its metadata.
 */
interface GeneratedCategory {
  id: string;
  label: string;
  displayOrder: number;
}

/**
 * A skill assigned to a category.
 */
interface GeneratedSkill {
  id: string;
  name: string;
  categoryId: string;
}

/**
 * Generate a list of unique categories (1-5).
 */
const categoriesArb: fc.Arbitrary<GeneratedCategory[]> = fc
  .uniqueArray(categoryIdArb, { minLength: 1, maxLength: 5, selector: (v) => v })
  .chain((ids) =>
    fc.tuple(
      ...ids.map((id, index) =>
        categoryLabelArb.map((label) => ({
          id,
          label,
          displayOrder: index,
        }))
      )
    )
  ) as fc.Arbitrary<GeneratedCategory[]>;

/**
 * Generate skills for a set of categories. Some categories may have zero skills.
 */
const skillsForCategoriesArb = (
  categories: GeneratedCategory[]
): fc.Arbitrary<GeneratedSkill[]> => {
  // For each category, generate 0-4 skills
  return fc
    .tuple(
      ...categories.map((cat) =>
        fc
          .array(skillNameArb, { minLength: 0, maxLength: 4 })
          .map((names) =>
            names.map((name, i) => ({
              id: `skill-${cat.id}-${i}`,
              name,
              categoryId: cat.id,
            }))
          )
      )
    )
    .map((skillArrays) => (skillArrays as GeneratedSkill[][]).flat());
};

/**
 * Generate a complete test scenario: categories + skills.
 */
const scenarioArb: fc.Arbitrary<{
  categories: GeneratedCategory[];
  skills: GeneratedSkill[];
}> = categoriesArb.chain((categories) =>
  skillsForCategoriesArb(categories).map((skills) => ({ categories, skills }))
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function setupMock(
  categories: GeneratedCategory[],
  skills: GeneratedSkill[]
): void {
  // First call: return categories
  mockQueryItems.mockImplementation(async (options: unknown) => {
    const opts = options as { expressionAttributeValues: Record<string, string> };
    const gsi1pk = opts.expressionAttributeValues[":gsi1pk"] ?? "";

    if (gsi1pk === "SKILLCATS") {
      return {
        items: categories.map((cat) => ({
          PK: `SKILLCAT#${cat.id}`,
          SK: "META",
          id: cat.id,
          label: cat.label,
          displayOrder: cat.displayOrder,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        })),
      };
    }

    // Skills query: SKILLS#<categoryId>
    const categoryId = gsi1pk.replace("SKILLS#", "");
    const categorySkills = skills.filter((s) => s.categoryId === categoryId);

    return {
      items: categorySkills.map((s) => ({
        PK: `SKILL#${s.id}`,
        SK: "META",
        id: s.id,
        name: s.name,
        categoryId: s.categoryId,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      })),
    };
  });
}

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 7: Skills Grouping and Empty Category Filtering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("no category in output has zero skills", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ categories, skills }) => {
        jest.resetModules();
        mockQueryItems.mockReset();
        setupMock(categories, skills);

        const { GET } = await import("./route");
        const response = await GET();
        const body = await response.json();

        expect(body.success).toBe(true);

        for (const category of body.data) {
          expect(category.skills.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("all skills belonging to non-empty categories appear in the correct category", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ categories, skills }) => {
        jest.resetModules();
        mockQueryItems.mockReset();
        setupMock(categories, skills);

        const { GET } = await import("./route");
        const response = await GET();
        const body = await response.json();

        expect(body.success).toBe(true);

        // Group expected skills by category
        const expectedGrouping = new Map<string, GeneratedSkill[]>();
        for (const skill of skills) {
          const group = expectedGrouping.get(skill.categoryId) || [];
          group.push(skill);
          expectedGrouping.set(skill.categoryId, group);
        }

        // For each non-empty category, verify skills appear correctly
        for (const [categoryId, categorySkills] of expectedGrouping) {
          if (categorySkills.length === 0) continue;

          const outputCategory = body.data.find(
            (c: { id: string }) => c.id === categoryId
          );
          expect(outputCategory).toBeDefined();

          // Every skill assigned to this category should be in the output
          for (const skill of categorySkills) {
            const outputSkill = outputCategory.skills.find(
              (s: { id: string }) => s.id === skill.id
            );
            expect(outputSkill).toBeDefined();
            expect(outputSkill.name).toBe(skill.name);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("categories with no skills are excluded from output", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ categories, skills }) => {
        jest.resetModules();
        mockQueryItems.mockReset();
        setupMock(categories, skills);

        const { GET } = await import("./route");
        const response = await GET();
        const body = await response.json();

        expect(body.success).toBe(true);

        // Identify empty categories
        const emptyCategoryIds = categories
          .filter(
            (cat) => !skills.some((s) => s.categoryId === cat.id)
          )
          .map((cat) => cat.id);

        // None of the empty categories should appear in output
        for (const emptyCatId of emptyCategoryIds) {
          const found = body.data.find(
            (c: { id: string }) => c.id === emptyCatId
          );
          expect(found).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
