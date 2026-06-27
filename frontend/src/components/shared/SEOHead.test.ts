import { describe, it, expect } from "@jest/globals";
import {
  generatePageMetadata,
  truncateText,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  PAGE_METADATA,
} from "./SEOHead";

describe("SEOHead", () => {
  describe("truncateText", () => {
    it("returns text unchanged when within max length", () => {
      const text = "Short title";
      expect(truncateText(text, 60)).toBe("Short title");
    });

    it("truncates text exceeding max length and adds ellipsis", () => {
      const longText = "A".repeat(65);
      const result = truncateText(longText, 60);
      expect(result.length).toBeLessThanOrEqual(60);
      expect(result.endsWith("…")).toBe(true);
    });

    it("handles text at exactly max length", () => {
      const text = "A".repeat(60);
      expect(truncateText(text, 60)).toBe(text);
    });

    it("handles empty string", () => {
      expect(truncateText("", 60)).toBe("");
    });
  });

  describe("generatePageMetadata", () => {
    it("returns a Metadata object with title and description", () => {
      const result = generatePageMetadata("My Page", "A description.");
      expect(result.title).toBe("My Page");
      expect(result.description).toBe("A description.");
    });

    it("truncates title to 60 characters max", () => {
      const longTitle = "A".repeat(100);
      const result = generatePageMetadata(longTitle);
      expect((result.title as string).length).toBeLessThanOrEqual(
        MAX_TITLE_LENGTH,
      );
    });

    it("truncates description to 160 characters max", () => {
      const longDesc = "B".repeat(200);
      const result = generatePageMetadata("Title", longDesc);
      expect((result.description as string).length).toBeLessThanOrEqual(
        MAX_DESCRIPTION_LENGTH,
      );
    });

    it("uses default description when none provided", () => {
      const result = generatePageMetadata("My Page");
      expect(result.description).toBeDefined();
      expect((result.description as string).length).toBeGreaterThan(0);
    });

    it("includes openGraph metadata", () => {
      const result = generatePageMetadata("Test", "Test desc");
      expect(result.openGraph).toBeDefined();
      expect((result.openGraph as Record<string, unknown>).title).toBe("Test");
      expect((result.openGraph as Record<string, unknown>).description).toBe(
        "Test desc",
      );
    });
  });

  describe("PAGE_METADATA", () => {
    it("home page title is within 60 characters", () => {
      expect((PAGE_METADATA.home.title as string).length).toBeLessThanOrEqual(
        MAX_TITLE_LENGTH,
      );
    });

    it("home page description is within 160 characters", () => {
      expect(
        (PAGE_METADATA.home.description as string).length,
      ).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    });

    it("resume page title is within 60 characters", () => {
      expect(
        (PAGE_METADATA.resume.title as string).length,
      ).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    });

    it("resume page description is within 160 characters", () => {
      expect(
        (PAGE_METADATA.resume.description as string).length,
      ).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    });
  });
});
