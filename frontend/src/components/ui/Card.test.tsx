import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("has border and surface background", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("border-border");
    expect(card.className).toContain("bg-surface");
  });

  it("has hover shadow transition by default", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("hover:shadow-lg");
    expect(card.className).toContain("duration-200");
  });

  it("omits hover effect when hoverable is false", () => {
    render(<Card data-testid="card" hoverable={false}>Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).not.toContain("hover:shadow-lg");
  });

  it("has focus-within indicator", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("focus-within:ring-2");
  });

  it("passes additional className", () => {
    render(<Card data-testid="card" className="custom-class">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card.className).toContain("custom-class");
  });
});
