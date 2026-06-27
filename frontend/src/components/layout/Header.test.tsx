import { render, screen } from "@testing-library/react";
import Header from "./Header";

// Mock ThemeToggle to isolate Header tests
jest.mock("../ui/ThemeToggle", () => ({
  ThemeToggle: () => (
    <button data-testid="theme-toggle" aria-label="Switch to dark theme">
      Toggle
    </button>
  ),
}));

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  window.IntersectionObserver = jest.fn(() => ({
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: jest.fn(),
    root: null,
    rootMargin: "",
    thresholds: [],
    takeRecords: () => [],
  })) as unknown as typeof IntersectionObserver;
});

describe("Header", () => {
  it("renders all navigation links", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Experience" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skills" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toBeInTheDocument();
  });

  it("renders navigation links with correct href attributes", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "#about",
    );
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute(
      "href",
      "#projects",
    );
    expect(screen.getByRole("link", { name: "Experience" })).toHaveAttribute(
      "href",
      "#experience",
    );
    expect(screen.getByRole("link", { name: "Skills" })).toHaveAttribute(
      "href",
      "#skills",
    );
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "#contact",
    );
  });

  it("renders the ThemeToggle component", () => {
    render(<Header />);

    // There are two ThemeToggle instances: one in the header bar and one in MobileMenu
    const toggles = screen.getAllByTestId("theme-toggle");
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders a banner landmark with navigation", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /main navigation/i }),
    ).toBeInTheDocument();
  });

  it("nav links have focus-visible ring classes for keyboard accessibility", () => {
    render(<Header />);

    const link = screen.getByRole("link", { name: "About" });
    expect(link.className).toContain("focus:ring-2");
    expect(link.className).toContain("focus:ring-primary");
  });

  it("header is fixed at top with z-index for overlay", () => {
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(header.className).toContain("fixed");
    expect(header.className).toContain("top-0");
    expect(header.className).toContain("z-50");
  });

  it("navigation is hidden on mobile screens", () => {
    render(<Header />);

    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(nav.className).toContain("hidden");
    expect(nav.className).toContain("md:block");
  });
});
