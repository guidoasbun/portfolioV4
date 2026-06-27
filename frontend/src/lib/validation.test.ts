/**
 * @jest-environment node
 */

/**
 * Unit tests for validation utilities.
 */

import { describe, expect, it } from "@jest/globals";
import {
  validateResumeFile,
  validateImageUpload,
  validateContactForm,
  validateProjectForm,
  validateMetaTags,
  RESUME_MAX_SIZE,
  IMAGE_MAX_SIZE,
  MAX_IMAGES_PER_PROJECT,
  META_TITLE_MAX_LENGTH,
  META_DESCRIPTION_MAX_LENGTH,
} from "./validation";

// ─── Resume File Validation ─────────────────────────────────────────────────

describe("validateResumeFile", () => {
  it("accepts a valid PDF file under 10MB", () => {
    const result = validateResumeFile({
      contentType: "application/pdf",
      fileSize: 5 * 1024 * 1024,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a PDF file exactly at 10MB", () => {
    const result = validateResumeFile({
      contentType: "application/pdf",
      fileSize: RESUME_MAX_SIZE,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-PDF file", () => {
    const result = validateResumeFile({
      contentType: "image/png",
      fileSize: 1024,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.contentType).toBeDefined();
    }
  });

  it("rejects a file exceeding 10MB", () => {
    const result = validateResumeFile({
      contentType: "application/pdf",
      fileSize: RESUME_MAX_SIZE + 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.fileSize).toBeDefined();
    }
  });

  it("returns both errors when file type and size are invalid", () => {
    const result = validateResumeFile({
      contentType: "text/plain",
      fileSize: RESUME_MAX_SIZE + 1000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.contentType).toBeDefined();
      expect(result.errors.fileSize).toBeDefined();
    }
  });
});

// ─── Image Upload Validation ────────────────────────────────────────────────

describe("validateImageUpload", () => {
  it("accepts a valid JPEG image under 5MB with room for more images", () => {
    const result = validateImageUpload(
      { contentType: "image/jpeg", fileSize: 2 * 1024 * 1024 },
      5,
    );
    expect(result.success).toBe(true);
  });

  it("accepts a valid PNG image", () => {
    const result = validateImageUpload(
      { contentType: "image/png", fileSize: 1024 },
      0,
    );
    expect(result.success).toBe(true);
  });

  it("accepts a valid WebP image", () => {
    const result = validateImageUpload(
      { contentType: "image/webp", fileSize: 1024 },
      0,
    );
    expect(result.success).toBe(true);
  });

  it("accepts an image exactly at 5MB", () => {
    const result = validateImageUpload(
      { contentType: "image/jpeg", fileSize: IMAGE_MAX_SIZE },
      0,
    );
    expect(result.success).toBe(true);
  });

  it("rejects a non-image file type", () => {
    const result = validateImageUpload(
      { contentType: "application/pdf", fileSize: 1024 },
      0,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.contentType).toBeDefined();
    }
  });

  it("rejects an image exceeding 5MB", () => {
    const result = validateImageUpload(
      { contentType: "image/jpeg", fileSize: IMAGE_MAX_SIZE + 1 },
      0,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.fileSize).toBeDefined();
    }
  });

  it("rejects when project already has 10 images", () => {
    const result = validateImageUpload(
      { contentType: "image/jpeg", fileSize: 1024 },
      MAX_IMAGES_PER_PROJECT,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.count).toBeDefined();
    }
  });

  it("returns all errors when multiple constraints are violated", () => {
    const result = validateImageUpload(
      { contentType: "text/plain", fileSize: IMAGE_MAX_SIZE + 1 },
      MAX_IMAGES_PER_PROJECT,
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.contentType).toBeDefined();
      expect(result.errors.fileSize).toBeDefined();
      expect(result.errors.count).toBeDefined();
    }
  });
});

// ─── Contact Form Validation ────────────────────────────────────────────────

describe("validateContactForm", () => {
  it("accepts a valid contact form", () => {
    const result = validateContactForm({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Hello, I'd like to connect.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = validateContactForm({
      name: "",
      email: "jane@example.com",
      message: "Hello!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
    }
  });

  it("rejects invalid email format", () => {
    const result = validateContactForm({
      name: "Jane",
      email: "not-an-email",
      message: "Hello!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeDefined();
    }
  });

  it("rejects empty email", () => {
    const result = validateContactForm({
      name: "Jane",
      email: "",
      message: "Hello!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email).toBeDefined();
    }
  });

  it("rejects empty message body", () => {
    const result = validateContactForm({
      name: "Jane",
      email: "jane@example.com",
      message: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.message).toBeDefined();
    }
  });

  it("returns multiple field errors when several fields are invalid", () => {
    const result = validateContactForm({
      name: "",
      email: "bad",
      message: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.message).toBeDefined();
    }
  });
});

// ─── Project Form Validation ────────────────────────────────────────────────

describe("validateProjectForm", () => {
  it("accepts a valid project form with required fields", () => {
    const result = validateProjectForm({
      title: "My Project",
      description: "A great project that does things.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a project form with optional URLs", () => {
    const result = validateProjectForm({
      title: "My Project",
      description: "A great project.",
      githubUrl: "https://github.com/user/repo",
      deploymentUrl: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = validateProjectForm({
      title: "",
      description: "Some description.",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.title).toBeDefined();
    }
  });

  it("rejects missing description", () => {
    const result = validateProjectForm({
      title: "My Project",
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.description).toBeDefined();
    }
  });

  it("returns errors for both missing title and description", () => {
    const result = validateProjectForm({
      title: "",
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.title).toBeDefined();
      expect(result.errors.description).toBeDefined();
    }
  });
});

// ─── Meta Tag Validation ────────────────────────────────────────────────────

describe("validateMetaTags", () => {
  it("accepts valid meta tags within character limits", () => {
    const result = validateMetaTags({
      title: "Portfolio - About Me",
      description: "A brief description of my portfolio and work.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts meta tags at exactly the character limits", () => {
    const result = validateMetaTags({
      title: "a".repeat(META_TITLE_MAX_LENGTH),
      description: "b".repeat(META_DESCRIPTION_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty title and description", () => {
    const result = validateMetaTags({
      title: "",
      description: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title exceeding 60 characters", () => {
    const result = validateMetaTags({
      title: "a".repeat(META_TITLE_MAX_LENGTH + 1),
      description: "Valid description",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.title).toBeDefined();
    }
  });

  it("rejects description exceeding 160 characters", () => {
    const result = validateMetaTags({
      title: "Valid title",
      description: "b".repeat(META_DESCRIPTION_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.description).toBeDefined();
    }
  });

  it("returns errors for both title and description exceeding limits", () => {
    const result = validateMetaTags({
      title: "a".repeat(META_TITLE_MAX_LENGTH + 1),
      description: "b".repeat(META_DESCRIPTION_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.title).toBeDefined();
      expect(result.errors.description).toBeDefined();
    }
  });
});
