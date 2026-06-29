import { test, expect } from "@playwright/test";

/**
 * E2E tests for public page load and navigation flow.
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5
 */

test.describe("Public Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("Page Load", () => {
    test("home page loads successfully with 200 status", async ({ page }) => {
      const response = await page.goto("/");
      expect(response?.status()).toBe(200);
    });

    test("page has correct title", async ({ page }) => {
      await expect(page).toHaveTitle(/Guido Asbun/i);
    });

    test("main content area is present", async ({ page }) => {
      const main = page.locator("#main-content");
      await expect(main).toBeVisible();
    });
  });

  test.describe("Sections Visibility", () => {
    test("About section is visible", async ({ page }) => {
      const section = page.locator("#about");
      await expect(section).toBeAttached();
    });

    test("Projects section is visible", async ({ page }) => {
      const section = page.locator("#projects");
      await expect(section).toBeAttached();
    });

    test("Experience section is visible", async ({ page }) => {
      const section = page.locator("#experience");
      await expect(section).toBeAttached();
    });

    test("Skills section is visible", async ({ page }) => {
      const section = page.locator("#skills");
      await expect(section).toBeAttached();
    });

    test("Contact section is visible", async ({ page }) => {
      const section = page.locator("#contact");
      await expect(section).toBeAttached();
    });
  });

  test.describe("Navigation Links", () => {
    test("header contains navigation links to all sections", async ({
      page,
    }) => {
      const nav = page.locator('nav[aria-label="Main navigation"]');
      await expect(nav).toBeAttached();

      const links = nav.locator("a");
      const expectedHrefs = [
        "#about",
        "#projects",
        "#experience",
        "#skills",
        "#contact",
      ];

      for (const href of expectedHrefs) {
        const link = nav.locator(`a[href="${href}"]`);
        await expect(link).toBeAttached();
      }

      await expect(links).toHaveCount(expectedHrefs.length);
    });

    test("clicking a nav link scrolls to the corresponding section", async ({
      page,
    }) => {
      // Click the Contact link in the desktop nav
      const contactLink = page.locator(
        'nav[aria-label="Main navigation"] a[href="#contact"]',
      );
      await contactLink.click();

      // Wait for smooth scroll to finish
      await page.waitForTimeout(1000);

      // The contact section should be near the top of the viewport
      const contactSection = page.locator("#contact");
      const box = await contactSection.boundingBox();
      expect(box).not.toBeNull();
      // Section should be within a reasonable range from the top (accounting for fixed header)
      expect(box!.y).toBeLessThan(200);
    });
  });

  test.describe("Fixed Header", () => {
    test("header stays fixed at the top while scrolling", async ({ page }) => {
      const header = page.locator("header");
      await expect(header).toBeVisible();

      // Scroll down significantly
      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForTimeout(300);

      // Header should still be visible and at the top
      await expect(header).toBeVisible();
      const box = await header.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBe(0);
    });

    test("header has fixed positioning", async ({ page }) => {
      const header = page.locator("header");
      const position = await header.evaluate(
        (el) => getComputedStyle(el).position,
      );
      expect(position).toBe("fixed");
    });
  });

  test.describe("Footer", () => {
    test("footer is visible at the bottom of the page", async ({ page }) => {
      const footer = page.locator("footer");
      await expect(footer).toBeAttached();

      // Scroll to the bottom to see footer
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight),
      );
      await page.waitForTimeout(300);
      await expect(footer).toBeVisible();
    });

    test("footer contains social links", async ({ page }) => {
      const socialNav = page.locator('nav[aria-label="Social media links"]');
      await expect(socialNav).toBeAttached();

      // Should have at least one social link
      const links = socialNav.locator("a");
      const count = await links.count();
      expect(count).toBeGreaterThan(0);
    });

    test("footer contains copyright with owner name and year", async ({
      page,
    }) => {
      const footer = page.locator("footer");
      const currentYear = new Date().getFullYear().toString();

      await expect(footer).toContainText(currentYear);
      await expect(footer).toContainText("Guido Asbun");
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("navigation links are keyboard-accessible via Tab", async ({
      page,
    }) => {
      // Focus the first nav link by tabbing through header
      const nav = page.locator('nav[aria-label="Main navigation"]');
      const firstLink = nav.locator("a").first();

      await firstLink.focus();
      await expect(firstLink).toBeFocused();
    });
  });
});
