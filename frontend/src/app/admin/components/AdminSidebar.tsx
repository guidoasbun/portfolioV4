"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Projects", href: "/admin/projects", icon: "💼" },
  { label: "Experience", href: "/admin/experience", icon: "🏢" },
  { label: "Skills", href: "/admin/skills", icon: "⚡" },
  { label: "About", href: "/admin/about", icon: "👤" },
  { label: "Resumes", href: "/admin/resumes", icon: "📄" },
  { label: "Messages", href: "/admin/messages", icon: "✉️" },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) {
        router.push("/");
      }
    } catch {
      // On error, still redirect — cookies may already be cleared
      router.push("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col shrink-0">
      <div className="p-spacing-lg border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Admin Panel</h1>
      </div>

      <nav className="flex-1 p-spacing-sm" aria-label="Admin navigation">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={[
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
                  "transition-colors duration-200",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isActive(item.href)
                    ? "bg-primary text-foreground-inverse"
                    : "text-foreground-muted hover:bg-surface-elevated hover:text-foreground",
                ].join(" ")}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-spacing-sm border-t border-border">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={[
            "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium",
            "text-foreground-muted hover:bg-surface-elevated hover:text-foreground",
            "transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          <span aria-hidden="true">🚪</span>
          {isLoggingOut ? "Logging out…" : "Logout"}
        </button>
      </div>
    </aside>
  );
}
