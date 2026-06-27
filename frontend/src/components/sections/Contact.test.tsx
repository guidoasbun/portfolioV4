import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Contact from "./Contact";

// Mock ScrollAnimation to render children directly
jest.mock("@/components/shared", () => ({
  ScrollAnimation: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Contact", () => {
  it("renders the section with correct id and heading", () => {
    render(<Contact />);
    const section = document.getElementById("contact");
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Get In Touch")).toBeInTheDocument();
  });

  it("renders name, email, and message fields", () => {
    render(<Contact />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
  });

  it("enforces maxLength on fields", () => {
    render(<Contact />);
    expect(screen.getByLabelText("Name")).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText("Email")).toHaveAttribute("maxlength", "254");
    expect(screen.getByLabelText("Message")).toHaveAttribute(
      "maxlength",
      "2000"
    );
  });

  it("shows client-side validation errors for empty fields", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Contact />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Message is required")).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows client-side validation error for invalid email", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Contact />);

    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Message"), "Hello");

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(
      screen.getByText("Email must be a valid email address")
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("submits form and shows success message on 201 response", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true, message: "Message sent successfully" }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Message"), "Hello there");

    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("Message sent successfully")).toBeInTheDocument();
    });

    // Form should be cleared
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("auto-dismisses success message after 5 seconds", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true, message: "Sent!" }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("Sent!")).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Sent!")).not.toBeInTheDocument();
  });

  it("dismisses success message on dismiss button click", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({ success: true, message: "Sent!" }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText("Sent!")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /dismiss success message/i })
    );

    expect(screen.queryByText("Sent!")).not.toBeInTheDocument();
  });

  it("shows server validation errors and preserves form data", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        success: false,
        errors: { email: "Email already used recently" },
      }),
    });

    render(<Contact />);

    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Email already used recently")
      ).toBeInTheDocument();
    });

    // Form data preserved
    expect(screen.getByLabelText("Name")).toHaveValue("John");
    expect(screen.getByLabelText("Email")).toHaveValue("john@example.com");
    expect(screen.getByLabelText("Message")).toHaveValue("Hello");
  });

  it("shows general error and preserves form data on network failure", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<Contact />);

    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to send message. Please check your connection and try again."
        )
      ).toBeInTheDocument();
    });

    // Form data preserved
    expect(screen.getByLabelText("Name")).toHaveValue("John");
    expect(screen.getByLabelText("Email")).toHaveValue("john@example.com");
    expect(screen.getByLabelText("Message")).toHaveValue("Hello");
  });

  it("clears field error when user edits that field", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Contact />);

    // Submit to trigger errors
    await user.click(screen.getByRole("button", { name: /send message/i }));
    expect(screen.getByText("Name is required")).toBeInTheDocument();

    // Type in name field — error should clear
    await user.type(screen.getByLabelText("Name"), "A");
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
  });

  it("disables form while submitting", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<Contact />);

    await user.type(screen.getByLabelText("Name"), "John");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Message"), "Hello");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    // While submitting, button should show "Sending..." and be disabled
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Message")).toBeDisabled();

    // Resolve to clean up
    await act(async () => {
      resolvePromise!({
        json: async () => ({ success: true, message: "Sent!" }),
      });
    });
  });
});
