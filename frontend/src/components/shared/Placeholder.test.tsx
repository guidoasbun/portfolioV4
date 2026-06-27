import { render, screen } from "@testing-library/react";
import { Placeholder } from "./Placeholder";

describe("Placeholder", () => {
  it("renders the message text", () => {
    render(<Placeholder message="No projects yet" />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("renders optional icon with aria-hidden", () => {
    render(
      <Placeholder
        message="Empty"
        icon={<svg data-testid="icon" />}
      />
    );
    const iconWrapper = screen.getByTestId("icon").parentElement;
    expect(iconWrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("uses muted text color", () => {
    render(<Placeholder message="Nothing here" />);
    const container = screen.getByRole("status");
    expect(container.className).toContain("text-foreground-muted");
  });

  it("accepts additional className", () => {
    render(<Placeholder message="Test" className="mt-8" />);
    const container = screen.getByRole("status");
    expect(container.className).toContain("mt-8");
  });
});
