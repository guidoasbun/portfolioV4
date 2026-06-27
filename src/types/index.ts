/**
 * Central export for all types, interfaces, and schemas.
 */

// Entity interfaces
export type {
  Project,
  ProjectImage,
  Experience,
  Skill,
  SkillCategory,
  About,
  Resume,
  Message,
  WebResume,
  WebResumeSection,
  WebResumeSectionType,
} from "./entities";

// API types
export type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  ContactFormRequest,
  ContactFormResponse,
  ResumeUploadRequest,
  ResumeUploadResponseData,
  ResumeUploadResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateExperienceRequest,
  UpdateExperienceRequest,
  CreateSkillRequest,
  UpdateSkillRequest,
  CreateSkillCategoryRequest,
  UpdateSkillCategoryRequest,
  UpdateAboutRequest,
  MessageListResponse,
} from "./api";

// Zod schemas
export {
  projectImageSchema,
  projectSchema,
  experienceSchema,
  skillSchema,
  skillCategorySchema,
  aboutSchema,
  resumeSchema,
  messageSchema,
  webResumeSectionTypeSchema,
  webResumeSectionSchema,
  webResumeSchema,
  contactFormRequestSchema,
  resumeUploadRequestSchema,
  createProjectRequestSchema,
  updateProjectRequestSchema,
  createExperienceRequestSchema,
  updateExperienceRequestSchema,
  createSkillRequestSchema,
  updateSkillRequestSchema,
  createSkillCategoryRequestSchema,
  updateSkillCategoryRequestSchema,
  updateAboutRequestSchema,
} from "./schemas";

// Inferred types from schemas
export type {
  ProjectImageInput,
  ProjectInput,
  ExperienceInput,
  SkillInput,
  SkillCategoryInput,
  AboutInput,
  ResumeInput,
  MessageInput,
  WebResumeSectionInput,
  WebResumeInput,
  ContactFormRequestInput,
  ResumeUploadRequestInput,
  CreateProjectRequestInput,
  UpdateProjectRequestInput,
  CreateExperienceRequestInput,
  UpdateExperienceRequestInput,
  CreateSkillRequestInput,
  UpdateSkillRequestInput,
  CreateSkillCategoryRequestInput,
  UpdateSkillCategoryRequestInput,
  UpdateAboutRequestInput,
} from "./schemas";
