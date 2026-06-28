"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { ProjectListItem } from "./page";

interface ProjectListClientProps {
  initialProjects: ProjectListItem[];
}

export function ProjectListClient({ initialProjects }: ProjectListClientProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [deleteTarget, setDeleteTarget] = useState<ProjectListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete project");
      }

      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-[var(--spacing-lg)]">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-foreground-muted mt-[var(--spacing-xs)]">
            Manage your portfolio projects.
          </p>
        </div>
        <Link href="/admin/projects/new">
          <Button variant="primary">Create Project</Button>
        </Link>
      </div>

      {error && (
        <div
          className="mb-[var(--spacing-md)] rounded-md border border-error bg-error/10 p-[var(--spacing-md)] text-sm text-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-[var(--spacing-xl)] text-center">
          <p className="text-foreground-muted">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-foreground-muted border-b border-border">
              <tr>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Title
                </th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Status
                </th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Order
                </th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium">
                  Updated
                </th>
                <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => (
                <tr key={project.id} className="bg-background hover:bg-surface">
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-foreground">
                    {project.title}
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        project.published
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning",
                      ].join(" ")}
                    >
                      {project.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-foreground-muted">
                    {project.displayOrder}
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-foreground-muted">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-right">
                    <div className="flex items-center justify-end gap-[var(--spacing-sm)]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          router.push(`/admin/projects/${project.id}`)
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:text-error"
                        onClick={() => setDeleteTarget(project)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="mx-[var(--spacing-md)] w-full max-w-md rounded-lg border border-border bg-background p-[var(--spacing-lg)] shadow-xl">
            <h2
              id="delete-dialog-title"
              className="text-lg font-semibold text-foreground"
            >
              Delete Project
            </h2>
            <p className="mt-[var(--spacing-sm)] text-sm text-foreground-muted">
              Are you sure you want to delete &quot;{deleteTarget.title}&quot;?
              This will remove the project and all associated images. This action
              cannot be undone.
            </p>
            <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
              <Button
                variant="ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="bg-error hover:bg-error/90"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
