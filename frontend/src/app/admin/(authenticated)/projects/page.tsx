/**
 * Admin project list page — server component that fetches ALL projects
 * (both published and unpublished) and renders them in a management table.
 *
 * Validates: Requirements 10.1, 10.2, 10.3
 */

import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { ProjectListClient } from "./ProjectListClient";

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

export interface ProjectListItem {
  id: string;
  title: string;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

async function getAllProjects(): Promise<ProjectListItem[]> {
  try {
    const items = await queryAllItems<ProjectDynamoItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": Keys.project.gsi1pk(),
      },
      scanIndexForward: true,
    });

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      published: item.published,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch {
    return [];
  }
}

export default async function AdminProjectsPage() {
  const projects = await getAllProjects();

  return (
    <div>
      <ProjectListClient initialProjects={projects} />
    </div>
  );
}
