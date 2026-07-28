"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ScrollAnimation } from "@/components/shared";
import { ProjectDetail } from "./ProjectDetail";
import type { Project } from "@/types/entities";

export interface ProjectGridProps {
  projects: Project[];
}

/** Max number of technology tags to display before showing "+N more" */
const MAX_VISIBLE_TAGS = 4;

function ProjectGrid({ projects }: ProjectGridProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        {projects.map((project, index) => (
          <ScrollAnimation
            key={project.id}
            animation="slide-up"
            duration={400}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <ProjectCard
              project={project}
              onClick={() => setSelectedProject(project)}
            />
          </ScrollAnimation>
        ))}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetail project={selectedProject} onClose={handleClose} />
      )}
    </>
  );
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const visibleTags = project.tags.slice(0, MAX_VISIBLE_TAGS);
  const remainingCount = project.tags.length - MAX_VISIBLE_TAGS;

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-sm transition-shadow duration-200 hover:shadow-lg"
      aria-label={`Project: ${project.title}`}
    >
      {/* Thumbnail area */}
      <div
        className="relative aspect-video w-full cursor-pointer overflow-hidden"
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${project.title}`}
      >
        {project.images[0] != null ? (
          <Image
            src={project.images[0].url}
            alt={project.images[0].altText ?? `${project.title} screenshot`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface text-foreground-subtle">
            <span className="text-sm">No preview</span>
          </div>
        )}

        {/* Featured badge */}
        {project.featured && (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-warning px-3 py-1 text-xs font-semibold text-foreground-inverse shadow-md">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Featured
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-[var(--spacing-lg)]">
        {/* Category badge */}
        <div>
          <span className="inline-block rounded-md bg-primary px-2.5 py-0.5 text-xs font-semibold text-foreground-inverse">
            {project.category}
          </span>
        </div>

        {/* Title */}
        <h3
          className="cursor-pointer text-[length:var(--font-size-h4)] font-bold leading-tight text-foreground transition-colors hover:text-primary"
          onClick={onClick}
        >
          {project.title}
        </h3>

        {/* Description (truncated) */}
        <p className="line-clamp-3 text-sm leading-relaxed text-foreground-muted">
          {project.description}
        </p>

        {/* Technology tags */}
        {project.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground-muted"
              >
                {tag}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-xs text-foreground-subtle">
                +{remainingCount} more
              </span>
            )}
          </div>
        )}

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          {project.deploymentUrl ? (
            <a
              href={project.deploymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-warning px-4 py-2.5 text-sm font-semibold text-foreground-inverse transition-colors hover:bg-warning/90 focus:outline-none focus:ring-2 focus:ring-warning focus:ring-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                width="14"
                height="14"
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
          ) : (
            <button
              type="button"
              onClick={onClick}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-foreground-inverse transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              View Details
            </button>
          )}

          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground transition-colors hover:bg-surface hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`View ${project.title} on GitHub`}
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}

export { ProjectGrid };
