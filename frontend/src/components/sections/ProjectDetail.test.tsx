import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectDetail } from "./ProjectDetail";
import type { Project } from "@/types/entities";

// Mock ImageGallery
jest.mock("@/components/ui", () => ({
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
  description: "A detailed project description for testing purposes.",
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
    {
      id: "img-2",
      s3Key: "projects/proj-1/img-2.jpg",
      url: "https://bucket.s3.us-east-1.amazonaws.com/projects/proj-1/img-2.jpg",
      order: 2,
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

describe("ProjectDetail", () => {
  it("renders project title", () => {
    render(<ProjectDetail project={mockProject} onClose={jest.fn()} />);
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });

  it("renders project description", () => {
    render(<ProjectDetail project={mockProject} onClose={jest.fn()} />);
    expect(
      screen.getByText("A detailed project description for testing purposes."),
    ).toBeInTheDocument();
  });

  it("renders image gallery with project images", () => {
    render(<ProjectDetail project={mockProject} onClose={jest.fn()} />);
    expect(screen.getByTestId("image-gallery")).toHaveTextContent("2 images");
  });

  it("renders GitHub link opening in new tab", () => {
    render(<ProjectDetail project={mockProject} onClose={jest.fn()} />);
    const githubLink = screen.getByRole("link", { name: /github/i });
    expect(githubLink).toHaveAttribute("href", "https://github.com/user/repo");
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders deployment link opening in new tab", () => {
    render(<ProjectDetail project={mockProject} onClose={jest.fn()} />);
    const demoLink = screen.getByRole("link", { name: /live demo/i });
    expect(demoLink).toHaveAttribute("href", "https://example.com");
    expect(demoLink).toHaveAttribute("target", "_blank");
    expect(demoLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("hides deployment link when not present", () => {
    render(
      <ProjectDetail project={mockProjectNoDeployment} onClose={jest.fn()} />,
    );
    expect(
      screen.queryByRole("link", { name: /live demo/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<ProjectDetail project={mockProject} onClose={onClose} />);

    await user.click(screen.getByLabelText("Close project details"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens dialog as modal on mount", () => {
    render(<ProjectDetail project={mockProject} onClose={jest.fn()} />);
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("has accessible dialog label", () => {
    render(<ProjectDetail project={mockProject} onClose={jest.fn()} />);
    expect(
      screen.getByLabelText("Project details: Test Project"),
    ).toBeInTheDocument();
  });
});
