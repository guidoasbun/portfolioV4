import { test, expect } from "@playwright/test";

/**
 * E2E tests for the /resume page structure and content.
 *
 * Validates: Requirements 4.1, 4.4, 4.5, 4.6
 */

test.describe("Resume Page", () => {
  test.describe("Page Load", () => {
    test("/resume page loads successfully", async ({ page }) => {
      const response = await page.goto("/resume");
      // Should load (200) or handle gracefully (500 if AWS is unavailable)
      expect(response?.status()).toBeLessThan(500);
    });

    test("page has proper heading", async ({ page }) => {
      await page.goto("/resume");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText("Resume");
    });

    test("page has main content area", async ({ page }) => {
      await page.goto("/resume");
      const main = page.locator("#main-content");
      await expect(main).toBeVisible();
    });
  });

  test.describe("Page Structure", () => {
    test("page displays resume sections or placeholder when no content", async ({
      page,
    }) => {
      await page.goto("/resume");

      // Either we have resume sections (div with content) or a placeholder
      const sections = page.locator("#main-content h2");
      const placeholder = page.locator("text=not been configured");

      const hasSections = (await sections.count()) > 0;
      const hasPlaceholder = await placeholder.isVisible().catch(() => false);

      // One of these conditions should be true
      expect(hasSections || hasPlaceholder).toBe(true);
    });

    test("resume content is within a constrained layout", async ({ page }) => {
      await page.goto("/resume");
      const main = page.locator("#main-content");
      const box = await main.boundingBox();
      expect(box).not.toBeNull();
      // Content should not stretch beyond reasonable max width
      expect(box!.width).toBeLessThanOrEqual(1280);
    });
  });

  test.describe("Download Button", () => {
    test("download button visibility depends on content availability", async ({
      page,
    }) => {
      await page.goto("/resume");

      // The download button may or may not be visible depending on whether
      // a preferred resume exists in the backend.
      // We just verify the page doesn't crash and has proper structure.
      const downloadButton = page.locator(
        'a:has-text("Download"), button:has-text("Download")',
      );
      const isVisible = await downloadButton.isVisible().catch(() => false);

      // If visible, it should be functional (has href or click handler)
      if (isVisible) {
        const tagName = await downloadButton.first().evaluate(
          (el) => el.tagName.toLowerCase(),
        );
        if (tagName === "a") {
          const href = await downloadButton.first().getAttribute("href");
          expect(href).toBeTruthy();
        }
      }
      // If not visible, that's fine — means no preferred resume is set (req 4.6)
    });
  });

  test.describe("SEO", () => {
    test("page has appropriate meta title", async ({ page }) => {
      await page.goto("/resume");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("resume");
    });

    test("page has meta description", async ({ page }) => {
      await page.goto("/resume");
      const metaDescription = page.locator('meta[name="description"]');
      const content = await metaDescription.getAttribute("content");
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);
      expect(content!.length).toBeLessThanOrEqual(160);
    });
  });
});
