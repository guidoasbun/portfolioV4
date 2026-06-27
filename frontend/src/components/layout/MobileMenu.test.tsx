import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MobileMenu from "./MobileMenu";

// Mock the ThemeToggle component since it requires ThemeProvider context
jest.mock("../ui/ThemeToggle", () => ({
  ThemeToggle: ({ className }: { className?: string }) => (
    <button aria-label="Switch theme" className={className} data-testid="theme-toggle">
      Theme Toggle
    </button>
  ),
}));

const mockLinks = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

const defaultProps = {
  isOpen: false,
  onClose: jest.fn(),
  onToggle: jest.fn(),
  links: mockLinks,
  activeSection: "",
};

describe("MobileMenu", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hamburger button", () => {
    it("renders a hamburger toggle button", () => {
      render(<MobileMenu {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /menu/i }),
      ).toBeInTheDocument();
    });

    it("has aria-expanded false when menu is closed", () => {
      render(<MobileMenu {...defaultProps} />);
      const button = screen.getByRole("button", { name: /^menu$/i });
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("has aria-expanded true when menu is open", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      const button = screen.getByRole("button", { name: /^menu$/i });
      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("calls onToggle when hamburger button is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileMenu {...defaultProps} />);
      await user.click(screen.getByRole("button", { name: /^menu$/i }));
      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it("hamburger button has minimum 44x44px touch target", () => {
      render(<MobileMenu {...defaultProps} />);
      const button = screen.getByRole("button", { name: /^menu$/i });
      expect(button.className).toContain("min-w-[44px]");
      expect(button.className).toContain("min-h-[44px]");
    });
  });

  describe("menu panel", () => {
    it("is aria-hidden when closed", () => {
      render(<MobileMenu {...defaultProps} />);
      const menu = screen.getByRole("dialog", { hidden: true });
      expect(menu).toHaveAttribute("aria-hidden", "true");
    });

    it("is not aria-hidden when open", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      const menu = screen.getByRole("dialog");
      expect(menu).toHaveAttribute("aria-hidden", "false");
    });

    it("renders all navigation links when open", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      for (const link of mockLinks) {
        expect(screen.getByRole("link", { name: link.label })).toBeInTheDocument();
      }
    });

    it("applies slide-in transform class when open", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      const menu = screen.getByRole("dialog");
      expect(menu.className).toContain("translate-x-0");
    });

    it("applies slide-out transform class when closed", () => {
      render(<MobileMenu {...defaultProps} />);
      const menu = screen.getByRole("dialog", { hidden: true });
      expect(menu.className).toContain("translate-x-full");
    });

    it("uses 300ms transition duration for animation", () => {
      render(<MobileMenu {...defaultProps} />);
      const menu = screen.getByRole("dialog", { hidden: true });
      expect(menu.className).toContain("duration-300");
    });
  });

  describe("close behavior", () => {
    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      // The close button is the one inside the dialog panel
      const dialog = screen.getByRole("dialog");
      const closeButton = dialog.querySelector(
        'button[aria-label="Close menu"]',
      ) as HTMLElement;
      await user.click(closeButton);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when Escape key is pressed", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when backdrop is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      // The backdrop has aria-hidden="true" so we query by its role-less presence
      const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/50");
      expect(backdrop).not.toBeNull();
      await user.click(backdrop!);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("touch targets", () => {
    it("all navigation links have minimum 44x44px touch target", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      const links = screen.getAllByRole("link");
      for (const link of links) {
        expect(link.className).toContain("min-h-[44px]");
        expect(link.className).toContain("min-w-[44px]");
      }
    });

    it("close button has minimum 44x44px touch target", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      const dialog = screen.getByRole("dialog");
      const closeButton = dialog.querySelector(
        'button[aria-label="Close menu"]',
      ) as HTMLElement;
      expect(closeButton.className).toContain("min-w-[44px]");
      expect(closeButton.className).toContain("min-h-[44px]");
    });
  });

  describe("active section", () => {
    it("marks the active link with aria-current", () => {
      render(
        <MobileMenu {...defaultProps} isOpen={true} activeSection="projects" />,
      );
      const projectsLink = screen.getByRole("link", { name: "Projects" });
      expect(projectsLink).toHaveAttribute("aria-current", "page");
    });

    it("does not mark inactive links with aria-current", () => {
      render(
        <MobileMenu {...defaultProps} isOpen={true} activeSection="projects" />,
      );
      const aboutLink = screen.getByRole("link", { name: "About" });
      expect(aboutLink).not.toHaveAttribute("aria-current");
    });
  });

  describe("body scroll lock", () => {
    it("locks body scroll when menu is open", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("unlocks body scroll when menu is closed", () => {
      const { rerender } = render(
        <MobileMenu {...defaultProps} isOpen={true} />,
      );
      rerender(<MobileMenu {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("theme toggle", () => {
    it("renders ThemeToggle inside the menu panel when open", () => {
      render(<MobileMenu {...defaultProps} isOpen={true} />);
      const toggle = screen.getByTestId("theme-toggle");
      expect(toggle).toBeInTheDocument();
    });
  });
});
