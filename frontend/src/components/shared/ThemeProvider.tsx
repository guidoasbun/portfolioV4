"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "theme";

function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage unavailable (e.g. private browsing, SSR)
  }
  return null;
}

function getOSPreference(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    if (mql.media !== "not all") {
      return mql.matches ? "dark" : "light";
    }
  } catch {
    // matchMedia unavailable
  }
  return null;
}

/**
 * Pure theme resolution logic: localStorage value → OS preference → "light" default.
 * Exported for property-based testing without DOM dependencies.
 */
export function resolveTheme(
  storedTheme: Theme | null,
  osPreference: Theme | null,
): Theme {
  return storedTheme ?? osPreference ?? "light";
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage unavailable — session-only toggle (req 17.6)
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Resolve theme on mount: localStorage → OS preference → light default
  useEffect(() => {
    const resolved = resolveTheme(getStoredTheme(), getOSPreference());
    setTheme(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    setMounted(true);
  }, []);

  // Sync data-theme attribute whenever theme changes (after mount)
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : "light";
      persistTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
