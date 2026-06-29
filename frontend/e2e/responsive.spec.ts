import { test, expect } from "@playwright/test";

/**
 * E2E tests for responsive design behavior across viewport sizes.
 *
 * Validates: Requirements 15.2, 15.3
 */

test.describe("Responsive Design", () => {
  test.describe("Mobile Viewport (375px)", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("hamburger menu button is visible", async ({ page }) => {
      await page.goto("/");
      const hamburger = page.locator('button[aria-label="Menu"]');
      await expect(hamburger).toBeVisible();
    });

    test("desktop navigation is hidden", async ({ page }) => {
      await page.goto("/");
      const desktopNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(desktopNav).toBeHidden();
    });

    test("no horizontal scroll on page", async ({ page }) => {
      await page.goto("/");
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test("hamburger menu opens and shows navigation", async ({ page }) => {
      await page.goto("/");
      const hamburger = page.locator('button[aria-label="Menu"]');
      await hamburger.click();

      // The mobile menu panel should become visible
      const mobileMenu = page.locator('#mobile-menu');
      await expect(mobileMenu).toHaveAttribute("aria-hidden", "false");

      // Navigation links should be present in the menu
      const mobileNav = page.locator(
        '#mobile-menu nav[aria-label="Mobile navigation"]',
      );
      await expect(mobileNav).toBeVisible();

      const links = mobileNav.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThanOrEqual(5);
    });

    test("hamburger menu can be closed", async ({ page }) => {
      await page.goto("/");
      const hamburger = page.locator('button[aria-label="Menu"]');
      await hamburger.click();

      // Close button should be visible
      const closeButton = page.locator(
        '#mobile-menu button[aria-label="Close menu"]',
      );
      await expect(closeButton).toBeVisible();
      await closeButton.click();

      // Wait for close animation
      await page.waitForTimeout(400);

      // Menu should be hidden
      const mobileMenu = page.locator('#mobile-menu');
      await expect(mobileMenu).toHaveAttribute("aria-hidden", "true");
    });
  });

  test.describe("Desktop Viewport (1280px)", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("full navigation is visible", async ({ page }) => {
      await page.goto("/");
      const desktopNav = page.locator('nav[aria-label="Main navigation"]');
      await expect(desktopNav).toBeVisible();
    });

    test("hamburger menu button is hidden", async ({ page }) => {
      await page.goto("/");
      const hamburger = page.locator('button[aria-label="Menu"]');
      await expect(hamburger).toBeHidden();
    });

    test("all navigation links are visible", async ({ page }) => {
      await page.goto("/");
      const nav = page.locator('nav[aria-label="Main navigation"]');
      const links = nav.locator("a");
      const count = await links.count();
      expect(count).toBe(5);

      // Each link should be visible
      for (let i = 0; i < count; i++) {
        await expect(links.nth(i)).toBeVisible();
      }
    });
  });

  test.describe("Minimum Viewport (320px)", () => {
    test.use({ viewport: { width: 320, height: 568 } });

    test("content does not overflow at 320px width", async ({ page }) => {
      await page.goto("/");
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test("header is fully visible at 320px", async ({ page }) => {
      await page.goto("/");
      const header = page.locator("header");
      await expect(header).toBeVisible();

      const box = await header.boundingBox();
      expect(box).not.toBeNull();
      // Header should not overflow the viewport width
      expect(box!.width).toBeLessThanOrEqual(320);
    });

    test("page renders without layout breaks", async ({ page }) => {
      await page.goto("/");
      // Check that the body doesn't overflow
      const bodyOverflow = await page.evaluate(() => {
        const body = document.body;
        return body.scrollWidth > 320;
      });
      expect(bodyOverflow).toBe(false);
    });
  });
});
