"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui";
import { ScrollAnimation } from "@/components/shared";
import { ProjectDetail } from "./ProjectDetail";
import type { Project } from "@/types/entities";

export interface ProjectGridProps {
  projects: Project[];
}

function ProjectGrid({ projects }: ProjectGridProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 gap-[var(--spacing-lg)] md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, index) => (
          <ScrollAnimation
            key={project.id}
            animation="slide-up"
            duration={400}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <Card
              hoverable
              className="cursor-pointer overflow-hidden p-0"
              onClick={() => setSelectedProject(project)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedProject(project);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View details for ${project.title}`}
            >
              {/* Thumbnail */}
              {project.images[0] != null && (
                <div className="relative aspect-video w-full overflow-hidden">
                  <Image
                    src={project.images[0].url}
                    alt={project.images[0].altText ?? `${project.title} thumbnail`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Title */}
              <div className="p-[var(--spacing-md)]">
                <h3 className="text-[length:var(--font-size-lg)] font-semibold text-foreground">
                  {project.title}
                </h3>
              </div>
            </Card>
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

export { ProjectGrid };
