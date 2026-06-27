/**
 * Core entity interfaces for the portfolio application.
 * These define the shape of data stored in DynamoDB and returned by APIs.
 */

// ─── Project ────────────────────────────────────────────────────────────────

export interface ProjectImage {
  id: string;
  s3Key: string;
  url: string;
  order: number;
  altText?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  deploymentUrl?: string;
  published: boolean;
  displayOrder: number;
  images: ProjectImage[];
  createdAt: string;
  updatedAt: string;
}

// ─── Experience ─────────────────────────────────────────────────────────────

export interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Skills ─────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  name: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCategory {
  id: string;
  label: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── About ──────────────────────────────────────────────────────────────────

export interface About {
  personalDescription: string;
  professionalPitch: string;
  updatedAt: string;
}

// ─── Resume ─────────────────────────────────────────────────────────────────

export interface Resume {
  id: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  isPreferred: boolean;
  uploadedAt: string;
}

// ─── Message ────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  name: string;
  email: string;
  body: string;
  isRead: boolean;
  submittedAt: string;
}

// ─── Web Resume ─────────────────────────────────────────────────────────────

export type WebResumeSectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certifications";

export interface WebResumeSection {
  id: string;
  type: WebResumeSectionType;
  title: string;
  content: string;
  order: number;
}

export interface WebResume {
  sections: WebResumeSection[];
  updatedAt: string;
}
