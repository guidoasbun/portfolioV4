# Implementation Plan: Portfolio Rebuild

## Overview

Full-stack portfolio website rebuild using Next.js App Router on AWS infrastructure. Implementation is split into phases: project scaffolding, infrastructure-as-code, data layer, API routes, public frontend, admin panel, auth, CI/CD pipeline, and testing. Each phase builds incrementally on previous work, ending with full integration.

## Tasks

- [ ] 1. Project scaffolding and core configuration
  - [x] 1.1 Initialize Next.js project with App Router and TypeScript
    - Create Next.js app with `create-next-app` using App Router, TypeScript, Tailwind CSS
    - Configure `tsconfig.json` with strict mode and path aliases
    - Set up ESLint and Prettier configuration
    - Create `.env.local.example` with all required environment variable names (no values)
    - _Requirements: 12.1, 14.1_

  - [x] 1.2 Define core TypeScript interfaces and data models
    - Create `frontend/src/types/` directory with interfaces for Project, Experience, Skill, SkillCategory, About, Resume, Message, WebResume as defined in design
    - Create validation schemas using Zod for each entity
    - Define API request/response types
    - _Requirements: 5.1, 6.1, 7.1, 8.1, 3.1, 10.1_

  - [x] 1.3 Set up design system tokens and theme configuration
    - Define CSS custom properties for color palette (max 6 primary colors), spacing scale, and typographic scale (max 5 heading levels)
    - Implement `data-theme` attribute toggling for dark/light themes
    - Configure Tailwind theme with custom design tokens
    - Set up transitions for background-color and color (≤300ms)
    - _Requirements: 15.5, 15.6, 17.2_

  - [x] 1.4 Set up testing framework
    - Configure Jest with React Testing Library for unit tests
    - Configure fast-check for property-based tests
    - Configure Playwright for E2E tests
    - Add test scripts to `package.json`
    - _Requirements: 16.4_

- [x] 2. Terraform infrastructure modules
  - [x] 2.1 Create Terraform project structure and backend configuration
    - Create `infrastructure/` directory structure with `main.tf`, `variables.tf`, `outputs.tf`, `backend.tf`
    - Create `environments/prod/terraform.tfvars` and `backend.tfvars`
    - Configure S3 remote state backend with DynamoDB state locking
    - Define AWS provider configuration
    - _Requirements: 12.7_

  - [x] 2.2 Implement networking module
    - Create `infrastructure/modules/networking/` with VPC, public/private subnets, security groups
    - Define Application Load Balancer with HTTPS listener (port 443) and target group
    - Configure security group rules for ALB and ECS tasks
    - _Requirements: 12.1_

  - [x] 2.3 Implement storage module
    - Create `infrastructure/modules/storage/` with DynamoDB single table (PK, SK, GSI1PK, GSI1SK)
    - Define GSI for alternate access patterns
    - Create S3 bucket with public read access for assets and CORS configuration
    - _Requirements: 12.2, 12.3_

  - [x] 2.4 Implement auth module
    - Create `infrastructure/modules/auth/` with Cognito User Pool and client
    - Configure password policy, account lockout (5 attempts, 15min lock)
    - Set token expiration to 1 hour
    - _Requirements: 12.4, 9.4_

  - [x] 2.5 Implement secrets module
    - Create `infrastructure/modules/secrets/` with Secrets Manager resources
    - Define secrets for database connection details, Cognito client secrets, API keys
    - _Requirements: 12.5, 14.1_

  - [x] 2.6 Implement compute module
    - Create `infrastructure/modules/compute/` with ECS Fargate cluster (ARM64/Graviton), task definition, and service
    - Define ECR repository for container images
    - Configure task role with IAM policies for DynamoDB, S3, Secrets Manager read access, and Cognito
    - _Requirements: 12.1, 12.8, 14.3_

  - [x] 2.7 Implement CI/CD module
    - Create `infrastructure/modules/cicd/` with OIDC provider resource for GitHub Actions
    - Define IAM role and policy for GitHub Actions to assume via OIDC
    - Grant permissions for ECR push, ECS deploy, and Secrets Manager read
    - _Requirements: 12.6, 13.3, 14.2_

  - [x] 2.8 Validate Terraform configuration
    - Run `terraform validate` in `infrastructure/` to ensure no errors
    - Run `terraform plan` to verify expected resource set
    - Fix any validation errors
    - _Requirements: 12.9_

- [x] 3. Checkpoint - Infrastructure validation
  - Ensure all Terraform modules validate successfully, ask the user if questions arise.

- [ ] 4. Data access layer and utilities
  - [x] 4.1 Implement DynamoDB client and single-table helpers
    - Create `frontend/src/lib/dynamodb.ts` with DynamoDB Document Client initialization
    - Implement helper functions for key generation (PK/SK patterns for each entity)
    - Implement generic get, put, query, delete, and update operations
    - _Requirements: 8.4, 10.1, 10.2_

  - [x] 4.2 Implement S3 client and presigned URL generation
    - Create `frontend/src/lib/s3.ts` with S3 client initialization
    - Implement presigned URL generation for uploads (1hr expiry)
    - Implement asset URL generation for public access
    - Implement file deletion helper
    - _Requirements: 3.1, 10.5_

  - [x] 4.3 Implement secrets manager client and startup validation
    - Create `frontend/src/lib/secrets.ts` with Secrets Manager client
    - Implement startup validation that checks all required secrets are present and parseable
    - Fail application startup with specific error messages if any secret is missing or invalid
    - _Requirements: 14.1, 14.6, 14.8_

  - [x] 4.4 Write property test for secret startup validation
    - **Property 14: Secret Startup Validation**
    - **Validates: Requirements 14.6, 14.8**
    - Generate random configurations with missing/empty/unparseable secrets
    - Verify startup fails with error identifying the specific invalid secret

  - [ ] 4.5 Implement Cognito auth helpers
    - Create `frontend/src/lib/auth.ts` with token verification using Cognito JWKS
    - Implement middleware helper for extracting and validating JWT from cookies/headers
    - Implement login, logout, and token refresh flows
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

  - [ ] 4.6 Implement validation utilities
    - Create `frontend/src/lib/validation.ts` with Zod-based validators for all entities
    - Implement resume file validation (PDF only, ≤10MB)
    - Implement image upload validation (JPEG/PNG/WebP, ≤5MB, max 10 per project)
    - Implement contact form validation (name required, valid email, body required)
    - Implement project form validation (title and description required)
    - Implement meta tag validation (title ≤60 chars, description ≤160 chars)
    - _Requirements: 3.1, 3.7, 8.3, 10.4, 10.5, 10.6, 16.2_

  - [ ]* 4.7 Write property tests for validation utilities
    - **Property 1: Resume File Validation**
    - **Validates: Requirements 3.1, 3.7**
    - Generate random file types and sizes; verify only PDF ≤10MB accepted

  - [ ]* 4.8 Write property test for image upload validation
    - **Property 12: Image Upload Validation**
    - **Validates: Requirements 10.5, 10.6**
    - Generate random file types, sizes, and image counts; verify correct accept/reject

  - [ ]* 4.9 Write property test for contact form validation
    - **Property 8: Contact Form Validation**
    - **Validates: Requirements 8.3**
    - Generate random invalid inputs; verify field-specific error identifiers returned

  - [ ]* 4.10 Write property test for project form validation
    - **Property 11: Project Form Validation**
    - **Validates: Requirements 10.4**
    - Generate random forms missing title or description; verify rejection with correct errors

  - [ ]* 4.11 Write property test for meta tag constraints
    - **Property 15: Meta Tag Character Constraints**
    - **Validates: Requirements 16.2**
    - Generate random metadata; verify title ≤60 chars, description ≤160 chars

- [ ] 5. API routes - Public endpoints
  - [ ] 5.1 Implement GET /api/projects and GET /api/projects/[id]
    - Query DynamoDB GSI for published projects ordered by displayOrder
    - Return project list with images for grid display
    - Return single project with full details including image gallery data
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ]* 5.2 Write property test for published project filtering
    - **Property 4: Published Project Filtering**
    - **Validates: Requirements 5.1**
    - Generate random projects with mixed published status; verify only published returned

  - [ ]* 5.3 Write property test for admin-defined display ordering (projects)
    - **Property 3: Admin-Defined Display Ordering**
    - **Validates: Requirements 4.2, 5.4, 7.2**
    - Generate random items with display order values; verify ascending sort in output

  - [ ] 5.4 Implement GET /api/experience
    - Query DynamoDB GSI for experience entries sorted by start date descending
    - Return experience list in reverse chronological order
    - _Requirements: 6.1, 6.2_

  - [ ]* 5.5 Write property test for experience reverse chronological ordering
    - **Property 5: Experience Reverse Chronological Ordering**
    - **Validates: Requirements 6.1**
    - Generate random experience entries with dates; verify descending sort by start date

  - [ ] 5.6 Implement GET /api/skills
    - Query DynamoDB for skills grouped by category with display order
    - Filter out empty categories
    - Return skills grouped by category label
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ]* 5.7 Write property test for skills grouping and empty category filtering
    - **Property 7: Skills Grouping and Empty Category Filtering**
    - **Validates: Requirements 7.1, 7.4**
    - Generate random skills/categories; verify correct grouping and empty category exclusion

  - [ ] 5.8 Implement GET /api/about and GET /api/resumes/preferred
    - Return about content (personal description + professional pitch)
    - Return presigned download URL for the preferred resume PDF
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 5.9 Implement POST /api/contact
    - Validate contact form input (name, email, body)
    - Save message to DynamoDB with submission timestamp and isRead=false
    - Return success confirmation or field-specific validation errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 5.10 Write property test for message persistence integrity
    - **Property 9: Message Persistence Integrity**
    - **Validates: Requirements 8.4**
    - Generate random valid messages; verify stored record matches original with valid ISO 8601 timestamp

- [ ] 6. API routes - Admin endpoints
  - [ ] 6.1 Implement admin middleware for route protection
    - Create Next.js middleware matching `/admin/*` and `/api/*` admin routes
    - Verify Cognito JWT token from cookies/headers
    - Redirect to login page if token is missing or invalid
    - _Requirements: 9.5, 14.5_

  - [ ]* 6.2 Write property test for admin route protection
    - **Property 10: Admin Route Protection**
    - **Validates: Requirements 9.5, 14.5**
    - Generate random admin paths without valid auth; verify redirect to login

  - [ ] 6.3 Implement project CRUD admin endpoints
    - POST /api/projects - Create project with images upload via presigned URLs
    - PUT /api/projects/[id] - Update project metadata
    - DELETE /api/projects/[id] - Delete project + associated S3 images
    - PUT /api/projects/[id]/reorder-images - Update image display order
    - _Requirements: 10.1, 10.2, 10.3, 10.7_

  - [ ] 6.4 Implement experience CRUD admin endpoints
    - POST /api/experience - Create experience entry
    - PUT /api/experience/[id] - Update experience entry
    - DELETE /api/experience/[id] - Delete experience entry
    - _Requirements: 10.8_

  - [ ] 6.5 Implement skills CRUD admin endpoints
    - POST /api/skills - Create skill with category assignment
    - PUT /api/skills/[id] - Update skill
    - DELETE /api/skills/[id] - Delete skill
    - Support category management (create, edit, delete, reorder)
    - _Requirements: 10.9_

  - [ ] 6.6 Implement about and resume admin endpoints
    - PUT /api/about - Update about content
    - GET /api/resumes - List all resumes
    - POST /api/resumes/upload - Generate presigned upload URL for PDF
    - PUT /api/resumes/[id]/preferred - Set preferred resume
    - DELETE /api/resumes/[id] - Delete resume + S3 file
    - _Requirements: 10.10, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 6.7 Write property test for preferred resume invariant
    - **Property 2: Preferred Resume Invariant**
    - **Validates: Requirements 3.3**
    - Generate random resume sets + selection; verify exactly one preferred after operation

  - [ ] 6.8 Implement message management admin endpoints
    - GET /api/messages - List messages paginated (20/page), sorted by timestamp desc
    - GET /api/messages/[id] - Get full message, mark as read
    - DELETE /api/messages/[id] - Delete message with confirmation
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 6.9 Write property test for message listing order and pagination
    - **Property 13: Message Listing Order and Pagination**
    - **Validates: Requirements 11.1, 11.2**
    - Generate random messages with timestamps; verify descending sort, max 20/page, body truncated to 100 chars

- [ ] 7. Checkpoint - API layer validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Public frontend - Layout and shared components
  - [ ] 8.1 Implement root layout with theme provider
    - Create `frontend/src/app/layout.tsx` with HTML structure, font loading, and ThemeProvider
    - Implement ThemeProvider context with localStorage persistence and OS preference detection
    - Apply `data-theme` attribute to document root
    - _Requirements: 17.1, 17.3, 17.4, 17.5, 17.6_

  - [ ]* 8.2 Write property test for theme preference resolution
    - **Property 16: Theme Preference Resolution**
    - **Validates: Requirements 17.3, 17.4, 17.5**
    - Generate random localStorage/OS preference combos; verify correct priority resolution

  - [ ] 8.3 Implement Header component with navigation and theme toggle
    - Create fixed header with nav links (About, Projects, Experience, Skills, Contact)
    - Implement smooth scroll to sections on click (300-800ms)
    - Implement active section indicator based on scroll position
    - Add ThemeToggle component with visual state indicator
    - Support keyboard Tab navigation with visible focus indicators
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 17.1_

  - [ ] 8.4 Implement mobile navigation (hamburger menu)
    - Create MobileMenu component with open/close animation (200-400ms)
    - Show hamburger menu below 768px viewport width
    - Ensure minimum 44x44px touch targets for all interactive elements
    - _Requirements: 15.3, 15.8_

  - [ ] 8.5 Implement Footer component
    - Create footer with social media links and copyright (owner name + current year)
    - Open social links in new tab
    - _Requirements: 1.2_

  - [ ] 8.6 Implement shared UI components
    - Create Button, Card, Input, ImageGallery components
    - Implement hover states with transitions (150-300ms)
    - Implement focus indicators with ≥3:1 contrast ratio
    - Create ScrollAnimation wrapper for scroll-triggered animations (200-500ms)
    - Create Placeholder component for empty states
    - _Requirements: 15.7, 15.5_

  - [ ] 8.7 Implement SEO components and configuration
    - Create SEOHead component generating unique meta title (≤60 chars) and description (≤160 chars) per page
    - Create sitemap.xml at /sitemap.xml listing all public URLs
    - Create robots.txt at /robots.txt permitting crawling of public pages
    - _Requirements: 16.1, 16.2, 16.5_

- [ ] 9. Public frontend - Content sections
  - [ ] 9.1 Implement About section
    - Fetch about content via server component
    - Display personal description and professional pitch blocks
    - Show download resume button (hidden if no preferred resume set)
    - Serve preferred resume PDF as file download with original filename
    - Show placeholder if no content configured
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ] 9.2 Implement Projects section
    - Fetch published projects via server component
    - Display grid layout (single column below 768px)
    - Show project titles and thumbnail images with Next.js Image (lazy loading, optimized formats)
    - Implement project detail view with description, horizontal scrollable image gallery, GitHub/deployment links
    - Open links in new tab; hide deployment link if not present
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 15.4, 16.3_

  - [ ] 9.3 Implement Experience section
    - Fetch experience entries via server component
    - Display timeline in reverse chronological order
    - Show job title, company, date range (start-end or start-Present), description
    - Show placeholder if no entries exist
    - _Requirements: 6.1, 6.2, 6.4, 6.5_

  - [ ]* 9.4 Write property test for experience entry rendering
    - **Property 6: Experience Entry Rendering**
    - **Validates: Requirements 6.2, 6.5**
    - Generate random experience entries; verify all fields present, null end date → "Present"

  - [ ] 9.5 Implement Skills section
    - Fetch skills via server component
    - Display skills grouped by category in admin-defined order
    - Hide empty categories
    - Show placeholder if no skills exist
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 9.6 Implement Contact section
    - Create contact form with name (max 100), email (max 254), body (max 2000) fields
    - Implement client-side and server-side validation with field-specific errors
    - Display success confirmation (disappears after 5s or on dismiss)
    - Preserve form data on submission failure
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [ ] 9.7 Implement Web Resume page (/resume)
    - Create `frontend/src/app/resume/page.tsx` with structured sections (summary, experience, education, skills, certifications)
    - Display sections in admin-defined order
    - Add download PDF button (hidden if no preferred resume)
    - Show placeholder if no content configured
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 9.8 Implement home page composition
    - Create `frontend/src/app/page.tsx` composing About, Projects, Experience, Skills, Contact sections
    - Wire server-side rendering for all data fetching
    - Ensure proper section IDs for scroll navigation
    - _Requirements: 1.1, 16.1_

- [ ] 10. Checkpoint - Public frontend validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Admin panel
  - [ ] 11.1 Implement admin layout with auth guard and sidebar navigation
    - Create `frontend/src/app/admin/layout.tsx` with sidebar nav (Projects, Experience, Skills, About, Resumes, Messages)
    - Implement auth guard redirecting to login if no valid session
    - Create admin login page with email/password form
    - Display error messages for invalid credentials (without revealing which field is wrong)
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ] 11.2 Implement admin dashboard
    - Create `frontend/src/app/admin/page.tsx` with overview (message count, project count, etc.)
    - Add quick links to content management sections
    - Include logout button that invalidates session and redirects to public site
    - _Requirements: 9.6_

  - [ ] 11.3 Implement project management pages
    - Create project list page with create/edit/delete actions
    - Create project form with title, description, GitHub URL, deployment URL (optional), published toggle
    - Implement image upload with drag-and-drop reordering (max 10 images)
    - Show validation errors for missing title/description or invalid file types
    - Implement delete confirmation dialog with associated S3 asset cleanup
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ] 11.4 Implement experience management page
    - Create experience list with create/edit/delete actions
    - Create experience form with job title, company, start date, end date (optional for current role), description
    - _Requirements: 10.8_

  - [ ] 11.5 Implement skills management page
    - Create skills list grouped by category
    - Support category CRUD (create, edit, delete, reorder)
    - Support skill CRUD within categories
    - _Requirements: 10.9_

  - [ ] 11.6 Implement about content editor and resume management page
    - Create about editor with personal description and professional pitch fields
    - Create resume management page with upload, list, set preferred, and delete actions
    - Implement preferred resume deletion guard (prompt for new preferred or prevent if only one)
    - Show upload validation errors (PDF only, ≤10MB)
    - _Requirements: 10.10, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 11.7 Implement message inbox page
    - Create message list with pagination (20/page), sorted by timestamp desc
    - Show sender name, email, truncated body (100 chars), timestamp, read/unread indicator
    - Implement message detail view (marks as read)
    - Implement delete with confirmation dialog
    - Show empty state if no messages
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 12. CI/CD Pipeline
  - [ ] 12.1 Create Dockerfile for Next.js application
    - Create multi-stage Dockerfile (build + production) targeting `linux/arm64`
    - Optimize for small image size (Alpine base)
    - Configure for standalone Next.js output
    - _Requirements: 13.1_

  - [ ] 12.2 Create GitHub Actions workflow for build and deploy
    - Create `.github/workflows/deploy.yml` triggered on push to main
    - Run linting and type-checking as first steps (halt if failed) from `frontend/` directory
    - Build Next.js application and Docker image for `linux/arm64` (using QEMU or native ARM runner) from `frontend/`
    - Tag image with Git commit SHA
    - Authenticate to AWS via OIDC (no static keys)
    - Push image to ECR
    - Deploy updated task definition to ECS
    - Wait for service steady state (10 minute timeout)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ] 12.3 Add secrets scanning step to CI pipeline
    - Add step to verify no sensitive values in source code or build artifacts
    - Fail pipeline if secrets are detected
    - _Requirements: 14.7_

- [ ] 13. Checkpoint - Full integration validation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Final integration and polish
  - [ ] 14.1 Wire admin content updates to public site refresh
    - Ensure admin edits to about, projects, experience, skills reflect on public site within 10 seconds
    - Implement revalidation strategy (on-demand or short cache TTL)
    - _Requirements: 2.4, 6.3, 7.3_

  - [ ] 14.2 Implement responsive design polish and accessibility audit
    - Verify all pages render correctly from 320px to 2560px without horizontal scroll
    - Verify all spacing, colors, and font sizes map to design scale tokens
    - Verify touch targets ≥44x44px on mobile
    - Add ARIA labels and ensure keyboard accessibility throughout
    - _Requirements: 15.1, 15.2, 15.6, 15.8, 1.5_

  - [ ]* 14.3 Write unit tests for key UI components
    - Test component rendering with mock data (About, Projects, Experience, Skills, Contact)
    - Test empty state placeholders
    - Test conditional rendering (deployment links, download buttons)
    - Test navigation scroll behavior and mobile menu toggle
    - _Requirements: 2.6, 5.3, 6.4, 7.5_

  - [ ]* 14.4 Write E2E tests with Playwright
    - Test public page load and navigation flow
    - Test contact form submission (success and validation errors)
    - Test theme toggle persistence
    - Test admin login and content management flow
    - Test resume upload and download
    - _Requirements: 1.3, 8.2, 8.3, 9.1, 17.2_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation between phases
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases using Jest + React Testing Library
- E2E tests validate full user flows using Playwright
- All infrastructure is defined in Terraform — no manual AWS console operations
- The design uses TypeScript throughout — all implementation tasks use TypeScript

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.2", "2.3", "2.4", "2.5"] },
    { "id": 2, "tasks": ["2.6", "2.7"] },
    { "id": 3, "tasks": ["2.8", "4.1", "4.2", "4.3", "4.5", "4.6"] },
    { "id": 4, "tasks": ["4.4", "4.7", "4.8", "4.9", "4.10", "4.11"] },
    { "id": 5, "tasks": ["5.1", "5.4", "5.6", "5.8", "5.9", "6.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.5", "5.7", "5.10", "6.2", "6.3", "6.4", "6.5", "6.6", "6.8"] },
    { "id": 7, "tasks": ["6.7", "6.9"] },
    { "id": 8, "tasks": ["8.1", "8.5", "8.6", "8.7"] },
    { "id": 9, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 10, "tasks": ["9.1", "9.2", "9.3", "9.5", "9.6", "9.7"] },
    { "id": 11, "tasks": ["9.4", "9.8"] },
    { "id": 12, "tasks": ["11.1", "12.1"] },
    { "id": 13, "tasks": ["11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "12.2"] },
    { "id": 14, "tasks": ["12.3"] },
    { "id": 15, "tasks": ["14.1", "14.2"] },
    { "id": 16, "tasks": ["14.3", "14.4"] }
  ]
}
```
