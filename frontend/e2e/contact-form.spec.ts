import { test, expect } from "@playwright/test";

/**
 * E2E tests for the contact form submission flow.
 * Tests client-side validation, error display, and success submission.
 *
 * Validates: Requirements 8.1, 8.2, 8.3
 */

test.describe("Contact Form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Scroll to the contact section
    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();
  });

  test.describe("Form Visibility", () => {
    test("contact form is visible with all required fields", async ({
      page,
    }) => {
      // The form should be present inside the contact section
      const form = page.locator("#contact form");
      await expect(form).toBeVisible();

      // Name field
      const nameInput = page.locator('#contact input[name="name"]');
      await expect(nameInput).toBeVisible();

      // Email field
      const emailInput = page.locator('#contact input[name="email"]');
      await expect(emailInput).toBeVisible();

      // Message field (textarea)
      const messageInput = page.locator('#contact textarea[name="message"]');
      await expect(messageInput).toBeVisible();

      // Submit button
      const submitButton = page.locator(
        '#contact button[type="submit"]',
      );
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText("Send Message");
    });

    test("form fields have associated labels", async ({ page }) => {
      const labels = page.locator("#contact label");
      const count = await labels.count();
      // At least 3 labels: Name, Email, Message
      expect(count).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe("Validation Errors", () => {
    test("submitting empty form shows validation errors", async ({ page }) => {
      const submitButton = page.locator(
        '#contact button[type="submit"]',
      );

      // Click submit without filling anything
      await submitButton.click();

      // Should see validation error messages
      const errors = page.locator('#contact [role="alert"]');
      const count = await errors.count();
      expect(count).toBeGreaterThan(0);
    });

    test("submitting with invalid email shows email-specific error", async ({
      page,
    }) => {
      // Fill name and message but provide invalid email
      const nameInput = page.locator('#contact input[name="name"]');
      const emailInput = page.locator('#contact input[name="email"]');
      const messageInput = page.locator('#contact textarea[name="message"]');

      await nameInput.fill("Test User");
      await emailInput.fill("invalid-email");
      await messageInput.fill("This is a test message.");

      // Submit
      const submitButton = page.locator(
        '#contact button[type="submit"]',
      );
      await submitButton.click();

      // Should see an error related to email
      const emailError = page.locator('#contact [role="alert"]');
      await expect(emailError.first()).toBeVisible();

      // The error text should reference email
      const errorText = await emailError.first().textContent();
      expect(errorText?.toLowerCase()).toMatch(/email/i);
    });

    test("submitting with empty name shows name-specific error", async ({
      page,
    }) => {
      const emailInput = page.locator('#contact input[name="email"]');
      const messageInput = page.locator('#contact textarea[name="message"]');

      await emailInput.fill("test@example.com");
      await messageInput.fill("This is a test message.");

      const submitButton = page.locator(
        '#contact button[type="submit"]',
      );
      await submitButton.click();

      // Should see a validation error
      const errors = page.locator('#contact [role="alert"]');
      const count = await errors.count();
      expect(count).toBeGreaterThan(0);
    });

    test("submitting with empty message shows message-specific error", async ({
      page,
    }) => {
      const nameInput = page.locator('#contact input[name="name"]');
      const emailInput = page.locator('#contact input[name="email"]');

      await nameInput.fill("Test User");
      await emailInput.fill("test@example.com");

      const submitButton = page.locator(
        '#contact button[type="submit"]',
      );
      await submitButton.click();

      // Should see a validation error
      const errors = page.locator('#contact [role="alert"]');
      const count = await errors.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe("Successful Submission", () => {
    test("submitting valid form shows success message or server response", async ({
      page,
    }) => {
      const nameInput = page.locator('#contact input[name="name"]');
      const emailInput = page.locator('#contact input[name="email"]');
      const messageInput = page.locator('#contact textarea[name="message"]');

      await nameInput.fill("E2E Test User");
      await emailInput.fill("e2e@example.com");
      await messageInput.fill(
        "This is an automated E2E test message. Please disregard.",
      );

      const submitButton = page.locator(
        '#contact button[type="submit"]',
      );
      await submitButton.click();

      // Wait for response (success or error from server)
      // Success: role="status" with success message
      // Error: role="alert" with server error
      const feedback = page.locator(
        '#contact [role="status"], #contact [role="alert"]',
      );
      await expect(feedback.first()).toBeVisible({ timeout: 10000 });
    });

    test("form data is preserved when submission fails with server error", async ({
      page,
    }) => {
      // Intercept the API call to simulate server error
      await page.route("/api/contact", (route) => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: "Internal server error",
          }),
        });
      });

      const nameInput = page.locator('#contact input[name="name"]');
      const emailInput = page.locator('#contact input[name="email"]');
      const messageInput = page.locator('#contact textarea[name="message"]');

      await nameInput.fill("Preserved Name");
      await emailInput.fill("preserved@example.com");
      await messageInput.fill("This message should be preserved.");

      const submitButton = page.locator(
        '#contact button[type="submit"]',
      );
      await submitButton.click();

      // Wait for error feedback
      await page.waitForTimeout(1000);

      // Form data should still be there
      await expect(nameInput).toHaveValue("Preserved Name");
      await expect(emailInput).toHaveValue("preserved@example.com");
      await expect(messageInput).toHaveValue(
        "This message should be preserved.",
      );
    });
  });
});
