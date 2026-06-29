import { render, screen } from "@testing-library/react";
import { ImageGallery } from "./ImageGallery";
import type { GalleryImage } from "./ImageGallery";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

const mockImages: GalleryImage[] = [
  { src: "/images/project-1.jpg", alt: "Project screenshot 1", width: 400, height: 300 },
  { src: "/images/project-2.jpg", alt: "Project screenshot 2", width: 400, height: 300 },
  { src: "/images/project-3.jpg", alt: "Project screenshot 3", width: 400, height: 300 },
];

describe("ImageGallery", () => {
  it("renders all images with alt text", () => {
    render(<ImageGallery images={mockImages} />);

    expect(screen.getByAltText("Project screenshot 1")).toBeInTheDocument();
    expect(screen.getByAltText("Project screenshot 2")).toBeInTheDocument();
    expect(screen.getByAltText("Project screenshot 3")).toBeInTheDocument();
  });

  it("returns null when images array is empty", () => {
    const { container } = render(<ImageGallery images={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders images with lazy loading", () => {
    render(<ImageGallery images={mockImages} />);

    const images = screen.getAllByRole("img");
    images.forEach((img) => {
      expect(img).toHaveAttribute("loading", "lazy");
    });
  });

  it("renders with the provided height", () => {
    const { container } = render(
      <ImageGallery images={mockImages} height={500} />,
    );

    const scrollContainer = container.querySelector("[style]");
    expect(scrollContainer).toHaveStyle({ height: "500px" });
  });

  it("has accessible gallery region with aria-label", () => {
    render(<ImageGallery images={mockImages} />);

    expect(
      screen.getByRole("region", { name: "Image gallery" }),
    ).toBeInTheDocument();
  });

  it("renders a single image without navigation buttons initially", () => {
    render(<ImageGallery images={[mockImages[0]!]} />);

    // With a single image, the right scroll button should not appear
    // (canScrollRight depends on overflow which JSDOM can't compute,
    // but the condition also checks images.length > 1)
    expect(
      screen.queryByLabelText("Scroll gallery right"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Scroll gallery left"),
    ).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ImageGallery images={mockImages} className="custom-class" />,
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("custom-class");
  });
});
