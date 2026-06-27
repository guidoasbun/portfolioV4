import { render, screen } from "@testing-library/react";
import Footer from "./Footer";

describe("Footer", () => {
  it("renders copyright text with current year and owner name", () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(`© ${currentYear} Rodrigo`),
    ).toBeInTheDocument();
  });

  it("renders social media links", () => {
    render(<Footer />);

    expect(screen.getByLabelText("GitHub")).toBeInTheDocument();
    expect(screen.getByLabelText("LinkedIn")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("opens external social links in a new tab with security attributes", () => {
    render(<Footer />);

    const links = screen.getAllByRole("link");
    const externalLinks = links.filter((link) =>
      link.getAttribute("href")?.startsWith("http"),
    );

    expect(externalLinks.length).toBeGreaterThan(0);
    for (const link of externalLinks) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("mailto link does not open in a new tab", () => {
    render(<Footer />);

    const emailLink = screen.getByLabelText("Email");
    expect(emailLink).toHaveAttribute("href", "mailto:rodrigo@example.com");
    expect(emailLink).not.toHaveAttribute("target");
  });

  it("renders a footer landmark with social navigation", () => {
    render(<Footer />);

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /social media/i })).toBeInTheDocument();
  });

  it("links point to correct destinations", () => {
    render(<Footer />);

    expect(screen.getByLabelText("GitHub")).toHaveAttribute(
      "href",
      "https://github.com/rodrigo",
    );
    expect(screen.getByLabelText("LinkedIn")).toHaveAttribute(
      "href",
      "https://linkedin.com/in/rodrigo",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "href",
      "mailto:rodrigo@example.com",
    );
  });
});
