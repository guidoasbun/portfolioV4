/**
 * Validation utilities for the portfolio application.
 *
 * Provides structured validation functions for resume uploads, image uploads,
 * contact forms, project forms, and meta tags. Each validator returns a
 * consistent result object with success/failure status and field-specific errors.
 */

import { z } from "zod";

// ─── Validation Result Types ────────────────────────────────────────────────

export interface ValidationSuccess {
  success: true;
}

export interface ValidationError {
  success: false;
  errors: Record<string, string>;
}

export type ValidationResult = ValidationSuccess | ValidationError;

// ─── Constants ──────────────────────────────────────────────────────────────

export const RESUME_MAX_SIZE = 10 * 1024 * 1024; // 10MB
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGES_PER_PROJECT = 10;
export const META_TITLE_MAX_LENGTH = 60;
export const META_DESCRIPTION_MAX_LENGTH = 160;

export const ALLOWED_RESUME_CONTENT_TYPES = ["application/pdf"] as const;
export const ALLOWED_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// ─── Resume File Validation ─────────────────────────────────────────────────

export interface ResumeFileInput {
  contentType: string;
  fileSize: number;
}

/**
 * Validate a resume file upload.
 * Accepts only PDF files with size ≤ 10MB.
 *
 * @param input - File metadata (contentType and fileSize)
 * @returns ValidationResult with field-specific errors if invalid
 */
export function validateResumeFile(input: ResumeFileInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!ALLOWED_RESUME_CONTENT_TYPES.includes(input.contentType as "application/pdf")) {
    errors.contentType = "File must be in PDF format";
  }

  if (input.fileSize > RESUME_MAX_SIZE) {
    errors.fileSize = "File size must not exceed 10MB";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true };
}

// ─── Image Upload Validation ────────────────────────────────────────────────

export interface ImageUploadInput {
  contentType: string;
  fileSize: number;
}

/**
 * Validate image file uploads for a project.
 * Accepts JPEG, PNG, and WebP files with size ≤ 5MB each,
 * with a maximum of 10 images per project.
 *
 * @param input - File metadata (contentType and fileSize)
 * @param currentImageCount - Number of images already on the project
 * @returns ValidationResult with field-specific errors if invalid
 */
export function validateImageUpload(
  input: ImageUploadInput,
  currentImageCount: number,
): ValidationResult {
  const errors: Record<string, string> = {};

  if (
    !ALLOWED_IMAGE_CONTENT_TYPES.includes(
      input.contentType as "image/jpeg" | "image/png" | "image/webp",
    )
  ) {
    errors.contentType = "Image must be in JPEG, PNG, or WebP format";
  }

  if (input.fileSize > IMAGE_MAX_SIZE) {
    errors.fileSize = "Image size must not exceed 5MB";
  }

  if (currentImageCount >= MAX_IMAGES_PER_PROJECT) {
    errors.count = "Maximum of 10 images per project";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return { success: true };
}

// ─── Contact Form Validation ────────────────────────────────────────────────

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must not exceed 100 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Email must be a valid email address")
    .max(254, "Email must not exceed 254 characters"),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(2000, "Message must not exceed 2000 characters"),
});

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

/**
 * Validate a contact form submission.
 * Requires name, valid email, and message body.
 *
 * @param input - Contact form fields
 * @returns ValidationResult with field-specific errors if invalid
 */
export function validateContactForm(input: ContactFormInput): ValidationResult {
  const result = contactFormSchema.safeParse(input);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      // Only capture the first error per field
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true };
}

// ─── Project Form Validation ────────────────────────────────────────────────

export const projectFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must not exceed 200 characters"),
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(5000, "Description must not exceed 5000 characters"),
  githubUrl: z.string().url("GitHub URL must be a valid URL").optional().or(z.literal("")),
  deploymentUrl: z.string().url("Deployment URL must be a valid URL").optional().or(z.literal("")),
});

export interface ProjectFormInput {
  title: string;
  description: string;
  githubUrl?: string;
  deploymentUrl?: string;
}

/**
 * Validate a project form submission.
 * Requires title and description.
 *
 * @param input - Project form fields
 * @returns ValidationResult with field-specific errors if invalid
 */
export function validateProjectForm(input: ProjectFormInput): ValidationResult {
  const result = projectFormSchema.safeParse(input);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true };
}

// ─── Meta Tag Validation ────────────────────────────────────────────────────

export const metaTagSchema = z.object({
  title: z.string().max(META_TITLE_MAX_LENGTH, "Meta title must not exceed 60 characters"),
  description: z
    .string()
    .max(META_DESCRIPTION_MAX_LENGTH, "Meta description must not exceed 160 characters"),
});

export interface MetaTagInput {
  title: string;
  description: string;
}

/**
 * Validate meta tag content.
 * Title must be ≤ 60 characters, description must be ≤ 160 characters.
 *
 * @param input - Meta tag fields (title and description)
 * @returns ValidationResult with field-specific errors if invalid
 */
export function validateMetaTags(input: MetaTagInput): ValidationResult {
  const result = metaTagSchema.safeParse(input);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    return { success: false, errors };
  }

  return { success: true };
}
