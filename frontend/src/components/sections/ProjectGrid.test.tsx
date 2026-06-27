import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectGrid } from "./ProjectGrid";
import type { Project } from "@/types/entities";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock ScrollAnimation to render children directly
jest.mock("@/components/shared", () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Placeholder: ({ message }: { message: string }) => <p>{message}</p>,
}));

// Mock ImageGallery
jest.mock("@/components/ui", () => ({
  Card: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  ImageGallery: ({ images }: { images: { src: string; alt: string }[] }) => (
    <div data-testid="image-gallery">{images.length} images</div>
  ),
}));

// Mock HTMLDialogElement methods (JSDOM doesn't support them)
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

const mockProject: Project = {
  id: "proj-1",
  title: "Test Project",
  description: "A test project description",
  githubUrl: "https://github.com/user/repo",
  deploymentUrl: "https://example.com",
  published: true,
  displayOrder: 1,
  images: [
    {
      id: "img-1",
      s3Key: "projects/proj-1/img-1.jpg",
      url: "https://bucket.s3.us-east-1.amazonaws.com/projects/proj-1/img-1.jpg",
      order: 1,
      altText: "Screenshot one",
    },
  ],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockProjectNoDeployment: Project = {
  ...mockProject,
  id: "proj-2",
  title: "No Deploy Project",
  deploymentUrl: undefined,
};

const mockProjectNoImages: Project = {
  ...mockProject,
  id: "proj-3",
  title: "No Images Project",
  images: [],
};

describe("ProjectGrid", () => {
  it("renders project titles", () => {
    render(<ProjectGrid projects={[mockProject, mockProjectNoDeployment]} />);
    expect(screen.getByText("Test Project")).toBeInTheDocument();
    expect(screen.getByText("No Deploy Project")).toBeInTheDocument();
  });

  it("renders thumbnail images for projects with images", () => {
    render(<ProjectGrid projects={[mockProject]} />);
    const img = screen.getByAltText("Screenshot one");
    expect(img).toBeInTheDocument();
  });

  it("does not render thumbnail for projects without images", () => {
    render(<ProjectGrid projects={[mockProjectNoImages]} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders grid layout with responsive columns", () => {
    const { container } = render(<ProjectGrid projects={[mockProject]} />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid?.className).toContain("grid-cols-1");
    expect(grid?.className).toContain("md:grid-cols-2");
    expect(grid?.className).toContain("lg:grid-cols-3");
  });

  it("opens project detail modal when a card is clicked", async () => {
    const user = userEvent.setup();
    render(<ProjectGrid projects={[mockProject]} />);

    await user.click(screen.getByLabelText("View details for Test Project"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Project details: Test Project"),
    ).toBeInTheDocument();
  });

  it("opens project detail on Enter keypress", async () => {
    const user = userEvent.setup();
    render(<ProjectGrid projects={[mockProject]} />);

    const card = screen.getByLabelText("View details for Test Project");
    card.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("uses lazy loading on thumbnail images", () => {
    render(<ProjectGrid projects={[mockProject]} />);
    const img = screen.getByAltText("Screenshot one");
    expect(img).toHaveAttribute("loading", "lazy");
  });
});
