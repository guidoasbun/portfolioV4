"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "../ui/ThemeToggle";
import MobileMenu from "./MobileMenu";

/**
 * Header component - fixed navigation with smooth scroll and active section indicator.
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5, 17.1
 */

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Projects", href: "#projects" },
  { label: "Experience", href: "#experience" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
] as const;

const HEADER_OFFSET = 80; // px offset for scroll calculations

export default function Header() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up IntersectionObserver to detect active section
  useEffect(() => {
    const sectionIds = NAV_LINKS.map((link) => link.href.slice(1));

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the most visible section
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Pick the one closest to top of viewport
          const closest = visibleEntries.reduce((prev, curr) => {
            return Math.abs(curr.boundingClientRect.top) <
              Math.abs(prev.boundingClientRect.top)
              ? curr
              : prev;
          });
          setActiveSection(closest.target.id);
        }
      },
      {
        rootMargin: `-${HEADER_OFFSET}px 0px -40% 0px`,
        threshold: [0, 0.25, 0.5],
      },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (element) {
        observerRef.current.observe(element);
      }
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        // Update active section immediately for responsiveness
        setActiveSection(sectionId);
      }
    },
    [],
  );

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-md">
        {/* Site brand / name */}
        <a
          href="#"
          className="text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          Rodrigo
        </a>

        {/* Desktop navigation - hidden on mobile (< md) */}
        <nav aria-label="Main navigation" className="hidden md:block">
          <ul className="flex items-center gap-lg">
            {NAV_LINKS.map((link) => {
              const sectionId = link.href.slice(1);
              const isActive = activeSection === sectionId;

              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, sectionId)}
                    aria-current={isActive ? "true" : undefined}
                    className={[
                      "relative px-sm py-xs text-sm font-medium rounded-sm",
                      "transition-colors duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      isActive
                        ? "text-primary"
                        : "text-foreground-muted hover:text-foreground",
                    ].join(" ")}
                  >
                    {link.label}
                    {/* Active indicator underline */}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-sm right-sm h-0.5 bg-primary rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Theme toggle and mobile menu toggle */}
        <div className="flex items-center gap-xs">
          <ThemeToggle />
          <MobileMenu
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            onToggle={() => setMobileMenuOpen((prev) => !prev)}
            links={NAV_LINKS}
            activeSection={activeSection}
          />
        </div>
      </div>
    </header>
  );
}
