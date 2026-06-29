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
  },
}));

beforeEach(() => {
  mockQueryAllItems.mockReset();
});

describe("Skills", () => {
  it("renders skills grouped by category", async () => {
    // First call: skill categories
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "cat-1", label: "Languages", displayOrder: 1 },
      { id: "cat-2", label: "Frameworks", displayOrder: 2 },
    ]);
    // Second call: skills for "Languages" category
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "skill-1", name: "TypeScript", categoryId: "cat-1" },
      { id: "skill-2", name: "Python", categoryId: "cat-1" },
    ]);
    // Third call: skills for "Frameworks" category
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "skill-3", name: "React", categoryId: "cat-2" },
      { id: "skill-4", name: "Next.js", categoryId: "cat-2" },
    ]);

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
    // First call: skill categories (3 categories)
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "cat-1", label: "Languages", displayOrder: 1 },
      { id: "cat-2", label: "Empty Category", displayOrder: 2 },
      { id: "cat-3", label: "Tools", displayOrder: 3 },
    ]);
    // Skills for "Languages"
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "skill-1", name: "TypeScript", categoryId: "cat-1" },
    ]);
    // Skills for "Empty Category" - none
    mockQueryAllItems.mockResolvedValueOnce([]);
    // Skills for "Tools"
    mockQueryAllItems.mockResolvedValueOnce([
      { id: "skill-2", name: "Docker", categoryId: "cat-3" },
    ]);

    const Component = await Skills();
    render(Component);

    expect(screen.getByText("Languages")).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(screen.queryByText("Empty Category")).not.toBeInTheDocument();
  });

  it("renders placeholder when no skills exist", async () => {
    // No categories returned
    mockQueryAllItems.mockResolvedValueOnce([]);

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
    mockQueryAllItems.mockResolvedValueOnce([]);

    const Component = await Skills();
    render(Component);

    const section = document.getElementById("skills");
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Skills")).toBeInTheDocument();
  });

  it("has accessible section with aria-labelledby", async () => {
    mockQueryAllItems.mockResolvedValueOnce([]);

    const Component = await Skills();
    render(Component);

    const section = document.getElementById("skills");
    expect(section).toHaveAttribute("aria-labelledby", "skills-heading");
    expect(document.getElementById("skills-heading")).toBeInTheDocument();
  });
});
