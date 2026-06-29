import { render, screen } from "@testing-library/react";
import ExperienceSection from "./Experience";

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
    experience: {
      gsi1pk: () => "EXPERIENCE",
    },
  },
}));

beforeEach(() => {
  mockQueryAllItems.mockReset();
});

const mockExperienceEntries = [
  {
    id: "exp-1",
    jobTitle: "Senior Developer",
    company: "Acme Corp",
    startDate: "2023-06",
    endDate: undefined,
    description: "Leading frontend development team",
    createdAt: "2023-06-01T00:00:00.000Z",
    updatedAt: "2023-06-01T00:00:00.000Z",
  },
  {
    id: "exp-2",
    jobTitle: "Junior Developer",
    company: "StartupXYZ",
    startDate: "2021-03",
    endDate: "2023-05",
    description: "Built REST APIs and React components",
    createdAt: "2021-03-01T00:00:00.000Z",
    updatedAt: "2023-05-01T00:00:00.000Z",
  },
];

describe("ExperienceSection", () => {
  it("renders the section with correct id and heading", async () => {
    mockQueryAllItems.mockResolvedValueOnce(mockExperienceEntries);

    const Component = await ExperienceSection();
    render(Component);

    const section = document.getElementById("experience");
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders experience entries with all fields", async () => {
    mockQueryAllItems.mockResolvedValueOnce(mockExperienceEntries);

    const Component = await ExperienceSection();
    render(Component);

    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(
      screen.getByText("Leading frontend development team"),
    ).toBeInTheDocument();

    expect(screen.getByText("Junior Developer")).toBeInTheDocument();
    expect(screen.getByText("StartupXYZ")).toBeInTheDocument();
    expect(
      screen.getByText("Built REST APIs and React components"),
    ).toBeInTheDocument();
  });

  it("displays 'Present' for entries with null end date", async () => {
    mockQueryAllItems.mockResolvedValueOnce(mockExperienceEntries);

    const Component = await ExperienceSection();
    render(Component);

    // The first entry has no endDate, so it should show "Present"
    expect(screen.getByText("Jun 2023 - Present")).toBeInTheDocument();
  });

  it("displays formatted date range for entries with end date", async () => {
    mockQueryAllItems.mockResolvedValueOnce(mockExperienceEntries);

    const Component = await ExperienceSection();
    render(Component);

    expect(screen.getByText("Mar 2021 - May 2023")).toBeInTheDocument();
  });

  it("renders empty state placeholder when no entries exist", async () => {
    mockQueryAllItems.mockResolvedValueOnce([]);

    const Component = await ExperienceSection();
    render(Component);

    expect(
      screen.getByText("No experience entries yet."),
    ).toBeInTheDocument();
  });

  it("renders empty state placeholder on fetch error", async () => {
    mockQueryAllItems.mockRejectedValueOnce(new Error("DynamoDB error"));

    const Component = await ExperienceSection();
    render(Component);

    expect(
      screen.getByText("No experience entries yet."),
    ).toBeInTheDocument();
  });

  it("has accessible section with aria-labelledby", async () => {
    mockQueryAllItems.mockResolvedValueOnce(mockExperienceEntries);

    const Component = await ExperienceSection();
    render(Component);

    const section = document.getElementById("experience");
    expect(section).toHaveAttribute("aria-labelledby", "experience-heading");
    expect(document.getElementById("experience-heading")).toBeInTheDocument();
  });
});
