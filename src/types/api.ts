/**
 * API request and response types for the portfolio application.
 */

// ─── Generic API Envelope ───────────────────────────────────────────────────

export interface ApiSuccessResponse<T = undefined> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error?: string;
  errors?: Record<string, string>;
}

export type ApiResponse<T = undefined> = ApiSuccessResponse<T> | ApiErrorResponse;

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Contact Form (POST /api/contact) ───────────────────────────────────────

export interface ContactFormRequest {
  name: string;
  email: string;
  message: string;
}

export type ContactFormResponse = ApiResponse;

// ─── Resume Upload (POST /api/resumes/upload) ───────────────────────────────

export interface ResumeUploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
}

export interface ResumeUploadResponseData {
  uploadUrl: string;
  resumeId: string;
  expiresIn: number;
}

export type ResumeUploadResponse = ApiResponse<ResumeUploadResponseData>;

// ─── Project CRUD ───────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  title: string;
  description: string;
  githubUrl: string;
  deploymentUrl?: string;
  published?: boolean;
  displayOrder?: number;
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  githubUrl?: string;
  deploymentUrl?: string;
  published?: boolean;
  displayOrder?: number;
}

// ─── Experience CRUD ────────────────────────────────────────────────────────

export interface CreateExperienceRequest {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string;
  description: string;
}

export interface UpdateExperienceRequest {
  jobTitle?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

// ─── Skill CRUD ─────────────────────────────────────────────────────────────

export interface CreateSkillRequest {
  name: string;
  categoryId: string;
}

export interface UpdateSkillRequest {
  name?: string;
  categoryId?: string;
}

// ─── Skill Category CRUD ────────────────────────────────────────────────────

export interface CreateSkillCategoryRequest {
  label: string;
  displayOrder?: number;
}

export interface UpdateSkillCategoryRequest {
  label?: string;
  displayOrder?: number;
}

// ─── About Update ───────────────────────────────────────────────────────────

export interface UpdateAboutRequest {
  personalDescription?: string;
  professionalPitch?: string;
}

// ─── Message List ───────────────────────────────────────────────────────────

import type { Message } from "./entities";

export type MessageListResponse = ApiResponse<PaginatedResponse<Message>>;
