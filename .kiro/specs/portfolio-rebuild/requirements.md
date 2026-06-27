# Requirements Document

## Introduction

A full rebuild of a personal portfolio website designed to attract potential employers by showcasing the owner's work, skills, and experience. Built with Next.js on AWS infrastructure (ECS Fargate, DynamoDB, S3, Cognito), deployed via Terraform with a CI/CD pipeline using GitHub Actions. The site features a public-facing portfolio with dedicated sections (About, Projects, Experience, Skills, Contact) and an authenticated admin panel for content management. Security is a priority — all secrets are managed through AWS Secrets Manager, and GitHub authenticates to AWS via OIDC.

## Glossary

- **Portfolio_App**: The Next.js web application serving both public and admin interfaces
- **Admin_Panel**: The authenticated section of the application where the portfolio owner manages content
- **Project**: A portfolio entry consisting of images, a description, a GitHub link, and an optional deployment link
- **Visitor**: An unauthenticated user browsing the public portfolio
- **Admin**: The authenticated portfolio owner who manages content
- **Auth_Service**: AWS Cognito service handling admin authentication
- **Asset_Store**: AWS S3 bucket storing static assets and project images
- **Data_Store**: AWS DynamoDB tables storing portfolio data and contact messages
- **Compute_Service**: AWS ECS Fargate service running the Next.js application
- **Message**: A contact submission from a visitor containing their name, email, and message body
- **IaC_Module**: Terraform configuration defining all AWS infrastructure resources
- **CI_CD_Pipeline**: GitHub Actions workflows automating build, test, and deployment
- **Secrets_Manager**: AWS Secrets Manager service storing all sensitive configuration values
- **OIDC_Provider**: OpenID Connect identity provider enabling GitHub Actions to authenticate with AWS without static credentials

## Requirements

### Requirement 1: Site Layout and Navigation

**User Story:** As a visitor, I want a consistent layout with a static header and footer across all pages, so that I can navigate the site easily and find relevant information.

#### Acceptance Criteria

1. THE Portfolio_App SHALL display a static header on all public pages containing navigation links to About, Projects, Experience, Skills, and Contact sections
2. THE Portfolio_App SHALL display a static footer on all public pages containing social media links and copyright information including the owner name and current year
3. WHEN a visitor clicks a navigation link in the header, THE Portfolio_App SHALL perform an animated scroll to the corresponding section on the page completing within 300ms to 800ms
4. WHILE the visitor scrolls down the page, THE Portfolio_App SHALL keep the header visible and fixed at the top of the viewport and visually indicate the currently active section in the navigation
5. THE Portfolio_App SHALL make all header navigation links accessible via keyboard Tab navigation with visible focus indicators

### Requirement 2: About Me Section

**User Story:** As a visitor, I want to read about the portfolio owner and download their resume, so that I can quickly understand who they are and evaluate their qualifications.

#### Acceptance Criteria

1. THE Portfolio_App SHALL display an About section containing two distinct content blocks — a personal description and a professional pitch — as defined by the Admin
2. THE Portfolio_App SHALL display a download resume button in the About section
3. WHEN a visitor clicks the download resume button, THE Portfolio_App SHALL serve the currently preferred resume PDF as a file download (content-disposition: attachment) with the original filename preserved
4. WHEN the Admin updates the about content via the Admin_Panel, THE Portfolio_App SHALL reflect the changes on the public site within 10 seconds
5. IF no preferred resume PDF is set, THEN THE Portfolio_App SHALL hide or disable the download resume button
6. IF the About section content has not been configured by the Admin, THEN THE Portfolio_App SHALL display a placeholder message

### Requirement 3: Resume Management

**User Story:** As the portfolio owner, I want to upload and manage multiple resume versions and select which one visitors download, so that I can keep my resume current and tailor it as needed.

#### Acceptance Criteria

1. WHEN the Admin uploads a resume file via the Admin_Panel, THE Admin_Panel SHALL validate that the file is in PDF format and does not exceed 10MB, store the file in the Asset_Store, and add it to a list of uploaded resumes with an upload timestamp and filename
2. THE Admin_Panel SHALL display all previously uploaded resume PDFs in a list with filename, upload date, and a preferred indicator
3. WHEN the Admin marks a resume as preferred, THE Admin_Panel SHALL set that resume as the active download for the public site and remove the preferred status from any previously preferred resume
4. WHEN the Admin deletes a resume, THE Admin_Panel SHALL remove the file from the Asset_Store and remove the entry from the Data_Store
5. IF the Admin deletes the currently preferred resume and at least one other resume exists, THEN THE Admin_Panel SHALL prompt the Admin to select a new preferred resume before completing the deletion
6. IF the Admin attempts to delete the only remaining resume and it is the preferred resume, THEN THE Admin_Panel SHALL prevent deletion and display a message indicating that at least one preferred resume must exist
7. IF the Admin uploads a file that is not in PDF format or exceeds 10MB, THEN THE Admin_Panel SHALL reject the upload and display a message indicating the file type or size constraint that was violated
8. IF the resume upload fails due to the Asset_Store being unavailable, THEN THE Admin_Panel SHALL display an error message indicating the upload could not be completed and preserve any form data entered by the Admin

### Requirement 4: Web Resume Page

**User Story:** As a visitor, I want to view the portfolio owner's resume in a dedicated web page format, so that I can read it directly in the browser without downloading a PDF.

#### Acceptance Criteria

1. THE Portfolio_App SHALL serve a dedicated /resume route displaying the resume content as a structured web page with clearly separated, labeled sections and readable typography
2. THE Portfolio_App SHALL display the web resume with sections for summary, experience, education, skills, and certifications in the order defined by the Admin
3. WHEN the Admin updates the web resume content via the Admin_Panel, THE Portfolio_App SHALL reflect the changes on the /resume page within 10 seconds
4. WHEN a visitor clicks the download PDF button on the /resume page, THE Portfolio_App SHALL serve the currently preferred resume PDF as a file download from the Asset_Store
5. IF no web resume content has been configured by the Admin, THEN THE Portfolio_App SHALL display a placeholder message indicating that resume content is not yet available
6. IF no preferred resume PDF is set, THEN THE Portfolio_App SHALL hide the download PDF button on the /resume page

### Requirement 5: Projects Section

**User Story:** As a visitor, I want to browse portfolio projects with images and links, so that I can evaluate the owner's technical work and see live demos.

#### Acceptance Criteria

1. WHEN a visitor navigates to the Projects section, THE Portfolio_App SHALL display a grid of all projects marked as published by the Admin, showing their titles and thumbnail images
2. WHEN a visitor selects a project, THE Portfolio_App SHALL display the project's full description, a horizontally scrollable image gallery, a GitHub link, and a deployment link if one exists
3. IF a project has no deployment link, THEN THE Portfolio_App SHALL hide the deployment link element rather than displaying an empty or broken link
4. THE Portfolio_App SHALL display projects in the display order defined by the Admin
5. WHEN a visitor clicks the GitHub link or deployment link, THE Portfolio_App SHALL open the URL in a new browser tab

### Requirement 6: Experience Section

**User Story:** As a visitor, I want to see the portfolio owner's professional experience, so that I can understand their career history and relevant roles.

#### Acceptance Criteria

1. THE Portfolio_App SHALL display an Experience section listing professional roles in reverse chronological order based on start date
2. THE Portfolio_App SHALL display each experience entry with a job title, company name, date range (start and end month/year, or "Present" if current), and description of responsibilities
3. WHEN the Admin adds or updates experience entries via the Admin_Panel, THE Portfolio_App SHALL reflect the changes on the public site within 10 seconds
4. IF no experience entries exist in the Data_Store, THEN THE Portfolio_App SHALL display the Experience section with a placeholder message
5. THE Portfolio_App SHALL support experience entries with a null end date to represent a current role, displayed as "Present"

### Requirement 7: Skills Section

**User Story:** As a visitor, I want to see the portfolio owner's technical skills organized by category, so that I can quickly assess their competencies.

#### Acceptance Criteria

1. THE Portfolio_App SHALL display a Skills section listing technical skills grouped by category, displaying each skill by name within its assigned category
2. THE Portfolio_App SHALL display skill categories with labels defined by the Admin (e.g., Languages, Frameworks, Tools, Cloud) in the display order set by the Admin
3. WHEN the Admin adds or updates skills via the Admin_Panel, THE Portfolio_App SHALL reflect the changes on the public site within 10 seconds
4. IF a skill category contains no skills, THEN THE Portfolio_App SHALL hide that category from the public Skills section
5. IF no skills exist in the Data_Store, THEN THE Portfolio_App SHALL display the Skills section with a placeholder message indicating no skills have been added

### Requirement 8: Contact Section (Get In Touch)

**User Story:** As a visitor, I want to send a message to the portfolio owner without creating an account, so that I can reach out about job opportunities or collaboration.

#### Acceptance Criteria

1. THE Portfolio_App SHALL display a Contact section with a form containing fields for name (max 100 characters), email (max 254 characters), and message body (max 2000 characters) accessible without authentication
2. WHEN a visitor submits a valid contact form, THE Portfolio_App SHALL save the message to the Data_Store and display a success confirmation message that disappears after 5 seconds or when dismissed
3. IF a visitor submits a contact form with an empty name, invalid email format, or empty message body, THEN THE Portfolio_App SHALL display field-specific validation errors and prevent submission
4. WHEN a contact message is saved, THE Data_Store SHALL record the visitor's name, email, message body, and submission timestamp
5. IF the message fails to save to the Data_Store, THEN THE Portfolio_App SHALL display an error message indicating the message could not be sent and preserve the form data

### Requirement 9: Admin Authentication

**User Story:** As the portfolio owner, I want to securely log in to an admin panel, so that only I can manage my portfolio content.

#### Acceptance Criteria

1. WHEN the Admin navigates to the admin panel URL, THE Auth_Service SHALL present a login interface requiring email and password credentials
2. WHEN valid credentials are provided, THE Auth_Service SHALL issue a session token with an expiration time of 1 hour and redirect the Admin to the Admin_Panel dashboard
3. IF invalid credentials are provided, THEN THE Auth_Service SHALL display an error message indicating invalid credentials without revealing which field is incorrect, and deny access to the Admin_Panel
4. IF 5 consecutive failed login attempts occur for the same account, THEN THE Auth_Service SHALL lock the account for 15 minutes and display a message indicating the account is temporarily locked
5. WHILE no valid session token is present, THE Portfolio_App SHALL redirect any request to Admin_Panel routes back to the login page
6. WHEN the Admin clicks the logout button, THE Auth_Service SHALL invalidate the session token and redirect the Admin to the public portfolio page

### Requirement 10: Admin Content Management

**User Story:** As the portfolio owner, I want to manage all portfolio content (projects, experience, skills, about) from the admin panel, so that I can keep my site current without touching code.

#### Acceptance Criteria

1. WHEN the Admin submits a new project form with a title, description, GitHub link, and at least one image, THE Admin_Panel SHALL save the project to the Data_Store and upload images to the Asset_Store
2. WHEN the Admin edits an existing project, THE Admin_Panel SHALL update the project record in the Data_Store
3. WHEN the Admin deletes a project, THE Admin_Panel SHALL display a confirmation dialog, and upon confirmation remove the project record from the Data_Store and remove associated images from the Asset_Store
4. IF the Admin submits a project form without a title or description, THEN THE Admin_Panel SHALL display a validation error and prevent submission
5. WHEN the Admin uploads project images, THE Asset_Store SHALL accept images in JPEG, PNG, and WebP formats up to 5MB per file, with a maximum of 10 images per project
6. IF the Admin uploads a file that is not JPEG, PNG, or WebP, or exceeds 5MB, THEN THE Admin_Panel SHALL reject the upload and display a message indicating the constraint that was violated
7. THE Admin_Panel SHALL allow the Admin to reorder project images via drag-and-drop
8. THE Admin_Panel SHALL allow the Admin to manage experience entries with create, edit, and delete operations
9. THE Admin_Panel SHALL allow the Admin to manage skill entries with create, edit, and delete operations grouped by category
10. THE Admin_Panel SHALL allow the Admin to edit the About section content and upload a resume PDF

### Requirement 11: Message Management

**User Story:** As the portfolio owner, I want to view and manage contact messages from my admin panel, so that I can respond to inquiries from potential employers.

#### Acceptance Criteria

1. WHEN the Admin navigates to the messages section, THE Admin_Panel SHALL display received messages sorted by submission timestamp in descending order, paginated with 20 messages per page
2. THE Admin_Panel SHALL display each message's sender name, email, message body truncated to 100 characters, submission timestamp, and a read/unread status indicator
3. WHEN the Admin selects a message, THE Admin_Panel SHALL display the full message body and mark the message as read
4. WHEN the Admin requests to delete a message, THE Admin_Panel SHALL prompt the Admin with a confirmation dialog before removing the message record from the Data_Store
5. IF there are no messages in the Data_Store, THEN THE Admin_Panel SHALL display an empty state indicating no messages have been received

### Requirement 12: AWS Infrastructure via Terraform

**User Story:** As the portfolio owner, I want all AWS infrastructure defined as code using Terraform, so that the environment is reproducible and version-controlled.

#### Acceptance Criteria

1. THE IaC_Module SHALL define the ECS Fargate cluster (ARM64/Graviton), task definition, and service for running the Portfolio_App container, including an Application Load Balancer with HTTPS listener and target group
2. THE IaC_Module SHALL define the S3 bucket for the Asset_Store with public read access for served assets and CORS configuration allowing requests from the Portfolio_App domain
3. THE IaC_Module SHALL define DynamoDB tables for Projects, Experience, Skills, About, Resumes, and Messages entities
4. THE IaC_Module SHALL define the Cognito User Pool and client for the Auth_Service
5. THE IaC_Module SHALL define the AWS Secrets Manager secrets for all sensitive configuration values
6. THE IaC_Module SHALL define the OIDC_Provider resource enabling GitHub Actions to assume an IAM role for deployment
7. THE IaC_Module SHALL store Terraform state in a remote S3 backend with DynamoDB state locking
8. THE IaC_Module SHALL define an Amazon ECR repository for storing Portfolio_App container images
9. WHEN terraform validate is run against the IaC_Module, THE IaC_Module SHALL produce no errors

### Requirement 13: CI/CD Pipeline with GitHub Actions

**User Story:** As the portfolio owner, I want automated build and deployment via GitHub Actions, so that pushing to main automatically deploys the latest version.

#### Acceptance Criteria

1. WHEN code is pushed to the main branch, THE CI_CD_Pipeline SHALL build the Next.js application, build the Docker container image for ARM64 architecture, tag the image with the Git commit SHA, and push the image to Amazon ECR
2. WHEN the container image is pushed to ECR, THE CI_CD_Pipeline SHALL deploy the updated task definition to the Compute_Service and wait for the service to reach a steady state with healthy running tasks within 10 minutes before marking the deployment as successful
3. THE CI_CD_Pipeline SHALL authenticate to AWS using the OIDC_Provider without static access keys
4. IF a build or deployment step fails, THEN THE CI_CD_Pipeline SHALL mark the GitHub Actions workflow run as failed and halt further deployment steps
5. WHEN code is pushed to the main branch, THE CI_CD_Pipeline SHALL run linting and type-checking as the first pipeline steps, and IF linting or type-checking fails, THEN THE CI_CD_Pipeline SHALL halt the pipeline before proceeding to the build step

### Requirement 14: Security and Secrets Management

**User Story:** As the portfolio owner, I want all sensitive values stored securely and never exposed in code, so that my application credentials remain protected.

#### Acceptance Criteria

1. THE Portfolio_App SHALL retrieve all sensitive configuration values (database connection details, Cognito client secrets, API keys) from the Secrets_Manager during application startup, before serving any requests
2. THE CI_CD_Pipeline SHALL retrieve deployment secrets from the Secrets_Manager via the OIDC-authenticated IAM role
3. THE IaC_Module SHALL define IAM policies granting the Compute_Service task role read access only to the secrets enumerated in criterion 1
4. THE Portfolio_App SHALL serve all traffic over HTTPS
5. IF a request to the Admin_Panel lacks a valid authentication token, THEN THE Portfolio_App SHALL deny access and redirect the user to the login page
6. IF the Portfolio_App cannot retrieve a required secret from the Secrets_Manager during startup, THEN THE Portfolio_App SHALL fail to start and log an error message indicating which secret could not be retrieved
7. THE CI_CD_Pipeline SHALL verify that no sensitive configuration values (database connection details, Cognito client secrets, API keys) are present in source code files or build artifacts
8. IF a secret retrieved from the Secrets_Manager is empty or cannot be parsed as the expected format, THEN THE Portfolio_App SHALL fail to start and log an error message indicating which secret is invalid

### Requirement 15: Modern Design and Mobile-First Responsiveness

**User Story:** As a visitor, I want the portfolio to have a modern, clean design that works flawlessly on mobile devices, so that potential employers get a professional impression regardless of how they access the site.

#### Acceptance Criteria

1. THE Portfolio_App SHALL use a mobile-first design approach where base styles target mobile viewports and scale up to larger screens
2. THE Portfolio_App SHALL render all public pages responsively across viewport widths from 320px to 2560px without horizontal scrolling or content overflow
3. WHEN the viewport width is below 768px, THE Portfolio_App SHALL display the navigation as a collapsible hamburger menu with an open/close animation completing within 200ms to 400ms
4. WHEN the viewport width is below 768px, THE Portfolio_App SHALL stack project grid items in a single column layout
5. THE Portfolio_App SHALL use a defined spacing scale, a limited color palette of no more than 6 primary colors, a typographic scale with no more than 5 heading levels, and scroll-triggered animations with durations between 200ms and 500ms
6. THE Portfolio_App SHALL use consistent spacing, color palette, and typography scale across all sections such that each spacing value, color, and font size used maps to a value in the defined design scale
7. WHEN a visitor interacts with buttons, links, or cards, THE Portfolio_App SHALL provide visual feedback through hover states with transitions between 150ms and 300ms, and focus indicators that meet a minimum contrast ratio of 3:1 against adjacent colors
8. WHEN the viewport width is below 768px, THE Portfolio_App SHALL render all interactive elements (buttons, links, menu items) with a minimum touch target size of 44x44 CSS pixels

### Requirement 16: SEO and Performance

**User Story:** As the portfolio owner, I want my site to rank well in search engines and load quickly, so that potential employers can find me easily.

#### Acceptance Criteria

1. THE Portfolio_App SHALL render public pages using server-side rendering for search engine crawlability
2. THE Portfolio_App SHALL generate unique meta title (maximum 60 characters) and description (maximum 160 characters) tags for each public page including the home page, project pages, and the /resume page
3. THE Portfolio_App SHALL serve project images in optimized formats using Next.js Image component with lazy loading
4. WHEN a public page is requested, THE Portfolio_App SHALL achieve a Largest Contentful Paint under 2.5 seconds under simulated 4G conditions (1.6 Mbps throughput, 150ms RTT)
5. THE Portfolio_App SHALL serve a valid sitemap.xml at the /sitemap.xml path listing all public page URLs and a robots.txt at /robots.txt that permits crawling of all public pages

### Requirement 17: Dark/Light Theme Toggle

**User Story:** As a visitor, I want to switch between dark and light themes, so that I can browse the portfolio comfortably in any lighting condition.

#### Acceptance Criteria

1. THE Portfolio_App SHALL display a theme toggle control in the header that visually indicates the currently active theme (dark or light)
2. WHEN a visitor clicks the theme toggle, THE Portfolio_App SHALL switch all page elements between dark and light color schemes within 300 milliseconds without a full page reload
3. WHEN a visitor returns to the site and a theme preference exists in browser local storage, THE Portfolio_App SHALL apply the stored theme preference
4. IF no theme preference exists in local storage and the operating system color scheme preference is detectable, THEN THE Portfolio_App SHALL default to the visitor's operating system color scheme preference
5. IF no theme preference exists in local storage and the operating system color scheme preference is not detectable, THEN THE Portfolio_App SHALL default to the light theme
6. IF browser local storage is unavailable, THEN THE Portfolio_App SHALL still allow theme toggling for the current session without persisting the preference
