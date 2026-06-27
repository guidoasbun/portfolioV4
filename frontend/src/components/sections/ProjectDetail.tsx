"use client";

import { useCallback, useEffect, useRef } from "react";
import { ImageGallery } from "@/components/ui";
import type { Project } from "@/types/entities";
import type { GalleryImage } from "@/components/ui/ImageGallery";

export interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
}

function ProjectDetail({ project, onClose }: ProjectDetailProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll while modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (dialog.open) {
        dialog.close();
      }
    };
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const galleryImages: GalleryImage[] = project.images.map((img) => ({
    src: img.url,
    alt: img.altText ?? `${project.title} screenshot`,
  }));

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 m-auto w-[90vw] max-w-[48rem] rounded-lg border border-border bg-surface p-0 backdrop:bg-black/50"
      aria-label={`Project details: ${project.title}`}
    >
      <div className="flex max-h-[85vh] flex-col overflow-y-auto p-[var(--spacing-lg)]">
        {/* Header */}
        <div className="mb-[var(--spacing-md)] flex items-start justify-between">
          <h3 className="text-[length:var(--font-size-h4)] font-semibold text-foreground">
            {project.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-[var(--spacing-sm)] rounded-md p-1 text-foreground-muted transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Close project details"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Image Gallery */}
        {galleryImages.length > 0 && (
          <div className="mb-[var(--spacing-md)]">
            <ImageGallery images={galleryImages} height={280} />
          </div>
        )}

        {/* Description */}
        <p className="mb-[var(--spacing-lg)] text-foreground-muted leading-relaxed">
          {project.description}
        </p>

        {/* Links */}
        <div className="flex flex-wrap gap-[var(--spacing-sm)]">
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-[var(--spacing-xs)] rounded-md bg-primary px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm font-medium text-foreground-inverse transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            GitHub
          </a>
          {project.deploymentUrl && (
            <a
              href={project.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[var(--spacing-xs)] rounded-md border border-border bg-surface-elevated px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm font-medium text-foreground transition-colors hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path
                  d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3M10 2h4m0 0v4m0-4L7 9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Live Demo
            </a>
          )}
        </div>
      </div>
    </dialog>
  );
}

export { ProjectDetail };
