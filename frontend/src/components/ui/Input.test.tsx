import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("renders label linked to input", () => {
    render(<Input label="Email" />);
    const input = screen.getByLabelText("Email");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("renders as textarea when multiline is true", () => {
    render(<Input label="Message" multiline />);
    const textarea = screen.getByLabelText("Message");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("displays error message", () => {
    render(<Input label="Email" error="Invalid email" />);
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Invalid email");
  });

  it("links error message via aria-describedby", () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby");
    const errorId = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(errorId)).toHaveTextContent("Required");
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input label="Name" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Guido Asbun");
    expect(input).toHaveValue("Guido Asbun");
  });

  it("has focus ring classes", () => {
    render(<Input label="Test" />);
    const input = screen.getByLabelText("Test");
    expect(input.className).toContain("focus:ring-2");
    expect(input.className).toContain("focus:ring-primary");
  });
});
