"use client";

import { useCallback, useEffect, useRef } from "react";
import { ThemeToggle } from "../ui/ThemeToggle";

/**
 * MobileMenu component - hamburger menu overlay for mobile viewports (<768px).
 * Includes open/close animation (300ms), focus trapping, and 44x44px minimum touch targets.
 *
 * Validates: Requirements 15.3, 15.8
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  links: readonly NavLink[];
  activeSection?: string;
}

export default function MobileMenu({
  isOpen,
  onClose,
  onToggle,
  links,
  activeSection,
}: MobileMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        // Return focus to the hamburger button
        toggleButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap when menu is open
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    // Focus the close button when menu opens
    closeButtonRef.current?.focus();

    const menu = menuRef.current;
    const focusableElements = menu.querySelectorAll<HTMLElement>(
      'button, a[href], [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();
      const target = document.getElementById(sectionId);
      if (target) {
        onClose();
        // Small delay to allow menu close animation before scrolling
        setTimeout(() => {
          target.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    },
    [onClose],
  );

  return (
    <>
      {/* Hamburger toggle button - visible below md (768px) */}
      <button
        type="button"
        ref={toggleButtonRef}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label="Menu"
        className={[
          "inline-flex items-center justify-center md:hidden",
          "min-w-[44px] min-h-[44px] rounded-md",
          "text-foreground hover:bg-surface",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        ].join(" ")}
      >
        {/* Hamburger icon (3 lines) */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={onClose}
        />
      )}

      {/* Slide-in menu panel */}
      <div
        ref={menuRef}
        id="mobile-menu"
        role="dialog"
        aria-modal={isOpen}
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        className={[
          "fixed top-0 right-0 z-50 h-full w-72 md:hidden",
          "flex flex-col",
          "bg-background border-l border-border shadow-lg",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Close button */}
        <div className="flex items-center justify-end p-md">
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close menu"
            tabIndex={isOpen ? 0 : -1}
            className={[
              "inline-flex items-center justify-center",
              "min-w-[44px] min-h-[44px] rounded-md",
              "text-foreground hover:bg-surface",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            ].join(" ")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation links */}
        <nav aria-label="Mobile navigation">
          <ul className="flex flex-col px-md">
            {links.map((link) => {
              const sectionId = link.href.slice(1);
              const isActive = activeSection === sectionId;

              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, sectionId)}
                    aria-current={isActive ? "page" : undefined}
                    tabIndex={isOpen ? 0 : -1}
                    className={[
                      "flex items-center",
                      "min-h-[44px] min-w-[44px] px-md py-sm",
                      "text-base font-medium rounded-md",
                      "transition-colors duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-foreground-muted hover:text-foreground hover:bg-surface",
                    ].join(" ")}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme toggle */}
        <div className="mt-auto border-t border-border px-md py-md">
          <ThemeToggle className="w-full justify-start" tabIndex={isOpen ? 0 : -1} />
        </div>
      </div>
    </>
  );
}
