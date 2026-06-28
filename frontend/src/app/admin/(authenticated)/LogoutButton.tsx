"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Client component for the dashboard logout button.
 * POSTs to /api/auth/logout and redirects to the public site.
 *
 * Validates: Requirements 9.6
 */
export function LogoutButton() {
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

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={[
        "inline-flex items-center gap-[var(--spacing-xs)] rounded-md px-[var(--spacing-md)] py-[var(--spacing-sm)]",
        "text-sm font-medium border border-border",
        "text-foreground-muted hover:bg-surface-elevated hover:text-foreground",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      <span aria-hidden="true">🚪</span>
      {isLoggingOut ? "Logging out…" : "Logout"}
    </button>
  );
}
