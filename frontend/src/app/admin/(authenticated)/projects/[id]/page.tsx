/**
 * Admin edit project page — server component that fetches project data
 * including images, then renders the ProjectForm in edit mode.
 *
 * Validates: Requirements 10.2, 10.4, 10.5, 10.6, 10.7
 */

import { notFound } from "next/navigation";
import { getItem, queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl } from "@/lib/s3";
import type { Project, ProjectImage } from "@/types/entities";
import { ProjectForm } from "../ProjectForm";

interface ProjectDynamoItem extends DynamoDBItem {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  deploymentUrl?: string;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectImageDynamoItem extends DynamoDBItem {
  id: string;
  s3Key: string;
  order: number;
  altText?: string;
}

async function getProject(id: string): Promise<Project | null> {
  const projectItem = await getItem<ProjectDynamoItem>({
    PK: Keys.project.pk(id),
    SK: Keys.project.sk(),
  });

  if (!projectItem) return null;

  const { items: imageItems } = await queryItems<ProjectImageDynamoItem>({
    keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
    expressionAttributeValues: {
      ":pk": Keys.projectImage.pk(id),
      ":skPrefix": "IMAGE#",
    },
    scanIndexForward: true,
  });

  const images: ProjectImage[] = imageItems.map((img) => ({
    id: img.id,
    s3Key: img.s3Key,
    url: getAssetUrl(img.s3Key),
    order: img.order,
    altText: img.altText,
  }));

  return {
    id: projectItem.id,
    title: projectItem.title,
    description: projectItem.description,
    githubUrl: projectItem.githubUrl,
    deploymentUrl: projectItem.deploymentUrl,
    published: projectItem.published,
    displayOrder: projectItem.displayOrder,
    images,
    createdAt: projectItem.createdAt,
    updatedAt: projectItem.updatedAt,
  };
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return (
    <div>
      <div className="mb-[var(--spacing-lg)]">
        <h1 className="text-2xl font-bold text-foreground">Edit Project</h1>
        <p className="text-foreground-muted mt-[var(--spacing-xs)]">
          Update project details, images, and publishing status.
        </p>
      </div>
      <ProjectForm project={project} mode="edit" />
    </div>
  );
}
