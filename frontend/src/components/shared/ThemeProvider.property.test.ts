/**
 * Property-based tests for Theme Preference Resolution.
 *
 * Feature: portfolio-rebuild, Property 16: Theme Preference Resolution
 *
 * Validates: Requirements 17.3, 17.4, 17.5
 *
 * For any combination of localStorage theme value (present/absent) and OS color
 * scheme preference (dark/light/undetectable), the theme resolution function SHALL:
 * use the localStorage value if present; otherwise use the OS preference if
 * detectable; otherwise default to 'light'.
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import { resolveTheme } from "./ThemeProvider";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Valid theme values that could be stored in localStorage.
 * When present, the value is "light" or "dark"; when absent, null.
 */
const storedThemeArb: fc.Arbitrary<"light" | "dark" | null> = fc.constantFrom(
  "light" as const,
  "dark" as const,
  null,
);

/**
 * OS preference: "light", "dark", or null (undetectable).
 */
const osPreferenceArb: fc.Arbitrary<"light" | "dark" | null> = fc.constantFrom(
  "light" as const,
  "dark" as const,
  null,
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe("Property 16: Theme Preference Resolution", () => {
  it("localStorage value takes priority when present", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("light" as const, "dark" as const),
        osPreferenceArb,
        (storedTheme, osPreference) => {
          const result = resolveTheme(storedTheme, osPreference);
          expect(result).toBe(storedTheme);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("OS preference is used when localStorage is absent", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("light" as const, "dark" as const),
        (osPreference) => {
          const result = resolveTheme(null, osPreference);
          expect(result).toBe(osPreference);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("defaults to 'light' when both localStorage and OS preference are absent", () => {
    const result = resolveTheme(null, null);
    expect(result).toBe("light");
  });

  it("result is always a valid theme ('light' or 'dark') for any input combination", () => {
    fc.assert(
      fc.property(storedThemeArb, osPreferenceArb, (storedTheme, osPreference) => {
        const result = resolveTheme(storedTheme, osPreference);
        expect(result === "light" || result === "dark").toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("resolution follows strict priority order for all combinations", () => {
    fc.assert(
      fc.property(storedThemeArb, osPreferenceArb, (storedTheme, osPreference) => {
        const result = resolveTheme(storedTheme, osPreference);

        if (storedTheme !== null) {
          // Priority 1: localStorage value wins
          expect(result).toBe(storedTheme);
        } else if (osPreference !== null) {
          // Priority 2: OS preference used when localStorage absent
          expect(result).toBe(osPreference);
        } else {
          // Priority 3: default to "light"
          expect(result).toBe("light");
        }
      }),
      { numRuns: 100 },
    );
  });
});
