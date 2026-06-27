/**
 * Zod validation schemas for all entities.
 * These schemas enforce the constraints defined in the design document.
 */

import { z } from "zod";

// ─── Shared Patterns ────────────────────────────────────────────────────────

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime();
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Must be YYYY-MM format");
const urlString = z.string().url();

// ─── Project Image ──────────────────────────────────────────────────────────

export const projectImageSchema = z.object({
  id: uuid,
  s3Key: z.string().min(1),
  url: urlString,
  order: z.number().int().min(0),
  altText: z.string().optional(),
});

// ─── Project ────────────────────────────────────────────────────────────────

export const projectSchema = z.object({
  id: uuid,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  githubUrl: urlString,
  deploymentUrl: urlString.optional(),
  published: z.boolean().default(false),
  displayOrder: z.number().int().min(0),
  images: z.array(projectImageSchema).min(1).max(10),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

// ─── Experience ─────────────────────────────────────────────────────────────

export const experienceSchema = z.object({
  id: uuid,
  jobTitle: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  startDate: yearMonth,
  endDate: yearMonth.optional(),
  description: z.string().min(1).max(5000),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

// ─── Skill ──────────────────────────────────────────────────────────────────

export const skillSchema = z.object({
  id: uuid,
  name: z.string().min(1).max(100),
  categoryId: uuid,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

// ─── Skill Category ─────────────────────────────────────────────────────────

export const skillCategorySchema = z.object({
  id: uuid,
  label: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

// ─── About ──────────────────────────────────────────────────────────────────

export const aboutSchema = z.object({
  personalDescription: z.string().max(5000),
  professionalPitch: z.string().max(5000),
  updatedAt: isoDateTime,
});

// ─── Resume ─────────────────────────────────────────────────────────────────

export const resumeSchema = z.object({
  id: uuid,
  filename: z.string().min(1),
  s3Key: z.string().min(1),
  fileSize: z.number().int().positive(),
  isPreferred: z.boolean().default(false),
  uploadedAt: isoDateTime,
});

// ─── Message ────────────────────────────────────────────────────────────────

export const messageSchema = z.object({
  id: uuid,
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  body: z.string().min(1).max(2000),
  isRead: z.boolean().default(false),
  submittedAt: isoDateTime,
});

// ─── Web Resume ─────────────────────────────────────────────────────────────

export const webResumeSectionTypeSchema = z.enum([
  "summary",
  "experience",
  "education",
  "skills",
  "certifications",
]);

export const webResumeSectionSchema = z.object({
  id: uuid,
  type: webResumeSectionTypeSchema,
  title: z.string().min(1),
  content: z.string().min(1),
  order: z.number().int().min(0),
});

export const webResumeSchema = z.object({
  sections: z.array(webResumeSectionSchema),
  updatedAt: isoDateTime,
});

// ─── API Request Validation Schemas ─────────────────────────────────────────

export const contactFormRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  message: z.string().min(1).max(2000),
});

export const resumeUploadRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024), // 10MB max
});

export const createProjectRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  githubUrl: urlString,
  deploymentUrl: urlString.optional(),
  published: z.boolean().optional().default(false),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const updateProjectRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  githubUrl: urlString.optional(),
  deploymentUrl: urlString.optional(),
  published: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const createExperienceRequestSchema = z.object({
  jobTitle: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  startDate: yearMonth,
  endDate: yearMonth.optional(),
  description: z.string().min(1).max(5000),
});

export const updateExperienceRequestSchema = z.object({
  jobTitle: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  startDate: yearMonth.optional(),
  endDate: yearMonth.optional(),
  description: z.string().min(1).max(5000).optional(),
});

export const createSkillRequestSchema = z.object({
  name: z.string().min(1).max(100),
  categoryId: uuid,
});

export const updateSkillRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  categoryId: uuid.optional(),
});

export const createSkillCategoryRequestSchema = z.object({
  label: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const updateSkillCategoryRequestSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateAboutRequestSchema = z.object({
  personalDescription: z.string().max(5000).optional(),
  professionalPitch: z.string().max(5000).optional(),
});

// ─── Inferred Types from Schemas ────────────────────────────────────────────

export type ProjectImageInput = z.infer<typeof projectImageSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type SkillCategoryInput = z.infer<typeof skillCategorySchema>;
export type AboutInput = z.infer<typeof aboutSchema>;
export type ResumeInput = z.infer<typeof resumeSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type WebResumeSectionInput = z.infer<typeof webResumeSectionSchema>;
export type WebResumeInput = z.infer<typeof webResumeSchema>;
export type ContactFormRequestInput = z.infer<typeof contactFormRequestSchema>;
export type ResumeUploadRequestInput = z.infer<typeof resumeUploadRequestSchema>;
export type CreateProjectRequestInput = z.infer<typeof createProjectRequestSchema>;
export type UpdateProjectRequestInput = z.infer<typeof updateProjectRequestSchema>;
export type CreateExperienceRequestInput = z.infer<typeof createExperienceRequestSchema>;
export type UpdateExperienceRequestInput = z.infer<typeof updateExperienceRequestSchema>;
export type CreateSkillRequestInput = z.infer<typeof createSkillRequestSchema>;
export type UpdateSkillRequestInput = z.infer<typeof updateSkillRequestSchema>;
export type CreateSkillCategoryRequestInput = z.infer<typeof createSkillCategoryRequestSchema>;
export type UpdateSkillCategoryRequestInput = z.infer<typeof updateSkillCategoryRequestSchema>;
export type UpdateAboutRequestInput = z.infer<typeof updateAboutRequestSchema>;
