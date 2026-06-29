import { test, expect } from "@playwright/test";

/**
 * E2E tests for theme toggle functionality and persistence.
 *
 * Validates: Requirements 17.1, 17.2, 17.3
 */

test.describe("Theme Toggle", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored theme preference before each test
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
  });

  test.describe("Toggle Button", () => {
    test("theme toggle button exists in header", async ({ page }) => {
      const header = page.locator("header");
      const toggleButton = header.locator(
        'button[aria-label*="theme" i], button[aria-label*="Theme" i]',
      );
      await expect(toggleButton.first()).toBeVisible();
    });

    test("theme toggle button has an accessible label", async ({ page }) => {
      const header = page.locator("header");
      const toggleButton = header.locator(
        'button[aria-label*="theme" i], button[aria-label*="Theme" i]',
      );
      const label = await toggleButton.first().getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.toLowerCase()).toContain("theme");
    });
  });

  test.describe("Theme Switching", () => {
    test("clicking toggle changes the data-theme attribute", async ({
      page,
    }) => {
      // Get initial theme
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );

      // Click the theme toggle in the header
      const header = page.locator("header");
      const toggleButton = header.locator(
        'button[aria-label*="theme" i], button[aria-label*="Theme" i]',
      );
      await toggleButton.first().click();

      // Wait for theme transition
      await page.waitForTimeout(400);

      // Theme should have changed
      const newTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(newTheme).not.toBe(initialTheme);
      expect(["light", "dark"]).toContain(newTheme);
    });

    test("clicking toggle twice returns to original theme", async ({
      page,
    }) => {
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );

      const header = page.locator("header");
      const toggleButton = header.locator(
        'button[aria-label*="theme" i], button[aria-label*="Theme" i]',
      );

      // Toggle twice
      await toggleButton.first().click();
      await page.waitForTimeout(400);
      await toggleButton.first().click();
      await page.waitForTimeout(400);

      const finalTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(finalTheme).toBe(initialTheme);
    });

    test("theme switch happens without full page reload", async ({ page }) => {
      let navigationOccurred = false;
      page.on("framenavigated", () => {
        navigationOccurred = true;
      });

      const header = page.locator("header");
      const toggleButton = header.locator(
        'button[aria-label*="theme" i], button[aria-label*="Theme" i]',
      );
      await toggleButton.first().click();
      await page.waitForTimeout(500);

      expect(navigationOccurred).toBe(false);
    });
  });

  test.describe("Theme Persistence", () => {
    test("theme preference is saved to localStorage", async ({ page }) => {
      const header = page.locator("header");
      const toggleButton = header.locator(
        'button[aria-label*="theme" i], button[aria-label*="Theme" i]',
      );

      // Click toggle to change theme
      await toggleButton.first().click();
      await page.waitForTimeout(400);

      // Check localStorage was updated
      const storedTheme = await page.evaluate(() =>
        localStorage.getItem("theme"),
      );
      expect(storedTheme).toBeTruthy();
      expect(["light", "dark"]).toContain(storedTheme);

      // Verify stored theme matches actual data-theme
      const currentTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(storedTheme).toBe(currentTheme);
    });

    test("page reload respects stored theme preference", async ({ page }) => {
      // Set dark theme in localStorage
      await page.evaluate(() => localStorage.setItem("theme", "dark"));

      // Reload the page
      await page.reload();
      await page.waitForTimeout(500);

      // Theme should be dark after reload
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(theme).toBe("dark");
    });

    test("page reload respects light theme preference", async ({ page }) => {
      // Set light theme in localStorage
      await page.evaluate(() => localStorage.setItem("theme", "light"));

      // Reload the page
      await page.reload();
      await page.waitForTimeout(500);

      // Theme should be light after reload
      const theme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(theme).toBe("light");
    });

    test("toggling and reloading persists the new theme", async ({ page }) => {
      // Get initial theme
      const initialTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );

      // Toggle
      const header = page.locator("header");
      const toggleButton = header.locator(
        'button[aria-label*="theme" i], button[aria-label*="Theme" i]',
      );
      await toggleButton.first().click();
      await page.waitForTimeout(400);

      // Get new theme
      const toggledTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(toggledTheme).not.toBe(initialTheme);

      // Reload
      await page.reload();
      await page.waitForTimeout(500);

      // Theme should persist after reload
      const afterReloadTheme = await page.evaluate(() =>
        document.documentElement.getAttribute("data-theme"),
      );
      expect(afterReloadTheme).toBe(toggledTheme);
    });
  });
});
