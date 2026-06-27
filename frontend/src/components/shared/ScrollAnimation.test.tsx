import { render, screen, act } from "@testing-library/react";
import { ScrollAnimation } from "./ScrollAnimation";

// Mock IntersectionObserver
let observerCallback: IntersectionObserverCallback;
const mockObserve = jest.fn();
const mockUnobserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).IntersectionObserver = jest.fn((cb: IntersectionObserverCallback) => {
    observerCallback = cb;
    return {
      observe: mockObserve,
      unobserve: mockUnobserve,
      disconnect: mockDisconnect,
    };
  });

  // Default: no reduced motion
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("ScrollAnimation", () => {
  it("renders children", () => {
    render(
      <ScrollAnimation>
        <p>Animated content</p>
      </ScrollAnimation>
    );
    expect(screen.getByText("Animated content")).toBeInTheDocument();
  });

  it("sets up IntersectionObserver on mount", () => {
    render(<ScrollAnimation><p>Test</p></ScrollAnimation>);
    expect(window.IntersectionObserver).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalled();
  });

  it("applies initial hidden styles for fade-in animation", () => {
    render(
      <ScrollAnimation animation="fade-in" data-testid="wrapper">
        <p>Content</p>
      </ScrollAnimation>
    );
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper.style.opacity).toBe("0");
  });

  it("becomes visible when IntersectionObserver triggers", () => {
    render(
      <ScrollAnimation animation="fade-in" data-testid="wrapper">
        <p>Content</p>
      </ScrollAnimation>
    );
    const wrapper = screen.getByTestId("wrapper");

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(wrapper.style.opacity).toBe("1");
  });

  it("respects prefers-reduced-motion by showing content immediately", () => {
    (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }));

    render(
      <ScrollAnimation animation="slide-up" data-testid="wrapper">
        <p>Content</p>
      </ScrollAnimation>
    );
    const wrapper = screen.getByTestId("wrapper");
    // When reduced motion is preferred, no transform or opacity animation
    expect(wrapper.style.opacity).not.toBe("0");
  });

  it("clamps duration to 200-500ms range", () => {
    render(
      <ScrollAnimation duration={100} data-testid="wrapper">
        <p>Content</p>
      </ScrollAnimation>
    );
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper.style.transition).toContain("200ms");
  });
});
