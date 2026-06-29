import { render, screen } from "@testing-library/react";
import About from "./About";

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock ScrollAnimation to render children directly
jest.mock("@/components/shared", () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Placeholder: ({ message }: { message: string }) => <p>{message}</p>,
}));

// Mock ResumeDownloadButton
jest.mock("./ResumeDownloadButton", () => ({
  ResumeDownloadButton: () => (
    <button aria-label="Download resume PDF">Download Resume</button>
  ),
}));

describe("About", () => {
  it("renders the section with correct id and heading", async () => {
    const Component = await About();
    render(Component);

    const section = document.getElementById("about");
    expect(section).toBeInTheDocument();
    expect(screen.getByText("About Me")).toBeInTheDocument();
  });

  it("renders introduction content", async () => {
    const Component = await About();
    render(Component);

    expect(screen.getByText("Introduction")).toBeInTheDocument();
    expect(
      screen.getByText(/Full Stack Developer transitioning into DevOps/),
    ).toBeInTheDocument();
  });

  it("renders the View Resume link pointing to /resume", async () => {
    const Component = await About();
    render(Component);

    const viewResumeLink = screen.getByRole("link", { name: /view resume/i });
    expect(viewResumeLink).toBeInTheDocument();
    expect(viewResumeLink).toHaveAttribute("href", "/resume");
  });

  it("renders the Download Resume button", async () => {
    const Component = await About();
    render(Component);

    expect(
      screen.getByRole("button", { name: /download resume pdf/i }),
    ).toBeInTheDocument();
  });

  it("renders interests section with all interest names", async () => {
    const Component = await About();
    render(Component);

    expect(screen.getByText("Interests & Hobbies")).toBeInTheDocument();
    expect(screen.getByText("Open Source")).toBeInTheDocument();
    expect(screen.getByText("Reading")).toBeInTheDocument();
    expect(screen.getByText("Cooking")).toBeInTheDocument();
    expect(screen.getByText("Fitness")).toBeInTheDocument();
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Travel")).toBeInTheDocument();
  });

  it("has an accessible section with aria-labelledby", async () => {
    const Component = await About();
    render(Component);

    const section = document.getElementById("about");
    expect(section).toHaveAttribute("aria-labelledby", "about-heading");
    expect(document.getElementById("about-heading")).toBeInTheDocument();
  });
});
