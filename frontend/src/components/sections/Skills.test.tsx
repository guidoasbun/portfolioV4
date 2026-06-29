import { render, screen } from "@testing-library/react";
import { Skills } from "./Skills";

// Mock ScrollAnimation to render children directly
jest.mock("@/components/shared", () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Placeholder: ({ message }: { message: string }) => (
    <div role="status">
      <p>{message}</p>
    </div>
  ),
}));

// Mock S3 module to avoid AWS client initialization in test env
jest.mock("@/lib/s3", () => ({
  getAssetUrl: (key: string) => `https://cdn.test/${key}`,
}));

// Mock the DynamoDB module
const mockQueryAllItems = jest.fn();
jest.mock("@/lib/dynamodb", () => ({
  queryAllItems: (...args: unknown[]) => mockQueryAllItems(...args),
  Keys: {
    skillCategory: {
      gsi1pk: () => "SKILLCATS",
    },
    skill: {
      gsi1pk: (categoryId: string) => `SKILLS#${categoryId}`,
    },
    certification: {
      gsi1pk: () => "CERTIFICATIONS",
    },
  },
}));

beforeEach(() => {
  mockQueryAllItems.mockReset();
});

/**
 * Helper to set up mocks for the Skills component.
 * The component calls Promise.all with:
 *   1. fetchSkillsGroupedByCategory() — queries SKILLCATS, then SKILLS#<catId> per category
 *   2. fetchCertifications() — queries CERTIFICATIONS
 *
 * Call order with mocks (resolved immediately):
 *   Call 1: SKILLCATS (categories)
 *   Call 2: CERTIFICATIONS (certifications)
 *   Call 3+: SKILLS#<catId> (skills per category)
 */
function setupSkillsMock(
  categories: Array<{ id: string; label: string; displayOrder: number }>,
  skillsByCategory: Array<Array<{ id: string; name: string; categoryId: string }>>,
) {
  // Call 1: categories
  mockQueryAllItems.mockResolvedValueOnce(categories);
  // Call 2: certifications (empty by default in skill tests)
  mockQueryAllItems.mockResolvedValueOnce([]);
  // Call 3+: skills for each category
  for (const skills of skillsByCategory) {
    mockQueryAllItems.mockResolvedValueOnce(skills);
  }
}

describe("Skills", () => {
  it("renders skills grouped by category", async () => {
    setupSkillsMock(
      [
        { id: "cat-1", label: "Languages", displayOrder: 1 },
        { id: "cat-2", label: "Frameworks", displayOrder: 2 },
      ],
      [
        [
          { id: "skill-1", name: "TypeScript", categoryId: "cat-1" },
          { id: "skill-2", name: "Python", categoryId: "cat-1" },
        ],
        [
          { id: "skill-3", name: "React", categoryId: "cat-2" },
          { id: "skill-4", name: "Next.js", categoryId: "cat-2" },
        ],
      ],
    );

    const Component = await Skills();
    render(Component);

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();

    expect(screen.getByText("Frameworks")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
  });

  it("hides empty categories", async () => {
    setupSkillsMock(
      [
        { id: "cat-1", label: "Languages", displayOrder: 1 },
        { id: "cat-2", label: "Empty Category", displayOrder: 2 },
        { id: "cat-3", label: "Tools", displayOrder: 3 },
      ],
      [
        [{ id: "skill-1", name: "TypeScript", categoryId: "cat-1" }],
        [],
        [{ id: "skill-2", name: "Docker", categoryId: "cat-3" }],
      ],
    );

    const Component = await Skills();
    render(Component);

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.queryByText("Empty Category")).not.toBeInTheDocument();
  });

  it("renders placeholder when no skills exist", async () => {
    // Categories call returns empty, certifications call returns empty
    setupSkillsMock([], []);

    const Component = await Skills();
    render(Component);

    expect(
      screen.getByText("No skills have been added yet."),
    ).toBeInTheDocument();
  });

  it("renders placeholder on fetch error", async () => {
    mockQueryAllItems.mockRejectedValueOnce(new Error("DynamoDB error"));

    const Component = await Skills();
    render(Component);

    expect(
      screen.getByText("No skills have been added yet."),
    ).toBeInTheDocument();
  });

  it("renders the section with correct id and heading", async () => {
    setupSkillsMock([], []);

    const Component = await Skills();
    render(Component);

    const section = document.getElementById("skills");
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Skills & Technologies")).toBeInTheDocument();
  });

  it("has accessible section with aria-labelledby", async () => {
    setupSkillsMock([], []);

    const Component = await Skills();
    render(Component);

    const section = document.getElementById("skills");
    expect(section).toHaveAttribute("aria-labelledby", "skills-heading");
    expect(document.getElementById("skills-heading")).toBeInTheDocument();
  });
});
