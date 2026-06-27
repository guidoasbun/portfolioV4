import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./ThemeProvider";

// Helper component to consume context
function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  let originalMatchMedia: typeof window.matchMedia;
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    // Restore localStorage if it was replaced
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
    // Clear localStorage
    localStorage.clear();
    // Remove data-theme attribute
    document.documentElement.removeAttribute("data-theme");
    // Save original matchMedia
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
  });

  it("defaults to light theme when no localStorage and no OS preference", () => {
    // Mock matchMedia to report no preference
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("uses localStorage theme when available", () => {
    localStorage.setItem("theme", "dark");

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to OS dark preference when no localStorage value", () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("localStorage takes precedence over OS preference", () => {
    localStorage.setItem("theme", "light");
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
  });

  it("toggles theme and persists to localStorage", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Initial state is light
    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");

    // Toggle to dark
    await user.click(screen.getByRole("button", { name: /toggle/i }));

    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    // Toggle back to light
    await user.click(screen.getByRole("button", { name: /toggle/i }));

    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("handles localStorage being unavailable gracefully", () => {
    // Mock localStorage to throw
    const mockStorage = {
      getItem: jest.fn(() => {
        throw new Error("SecurityError");
      }),
      setItem: jest.fn(() => {
        throw new Error("SecurityError");
      }),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });

    // Should not throw, defaults to light
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
  });

  it("throws error when useTheme is used outside ThemeProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleSpy.mockRestore();
  });

  it("ignores invalid localStorage values", () => {
    localStorage.setItem("theme", "invalid-value");

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    // Should fall through to OS preference, then to light default
    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
  });
});
