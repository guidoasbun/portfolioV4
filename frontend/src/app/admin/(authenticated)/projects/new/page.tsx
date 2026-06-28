/**
 * Admin create project page.
 *
 * Validates: Requirements 10.1, 10.4, 10.5, 10.6, 10.7
 */

import { ProjectForm } from "../ProjectForm";

export default function NewProjectPage() {
  return (
    <div>
      <div className="mb-[var(--spacing-lg)]">
        <h1 className="text-2xl font-bold text-foreground">Create Project</h1>
        <p className="text-foreground-muted mt-[var(--spacing-xs)]">
          Add a new project to your portfolio.
        </p>
      </div>
      <ProjectForm mode="create" />
    </div>
  );
}
