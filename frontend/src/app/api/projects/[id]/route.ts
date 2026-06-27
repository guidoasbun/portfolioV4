/**
 * GET /api/projects/[id]
 *
 * Returns a single project by ID with full details including image gallery data.
 */

import type { NextRequest } from "next/server";
import { getItem, queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl } from "@/lib/s3";
import type { Project, ProjectImage } from "@/types/entities";
import type { ApiResponse } from "@/types/api";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    if (!id) {
      const response: ApiResponse = {
        success: false,
        error: "Project ID is required",
      };
      return Response.json(response, { status: 400 });
    }

    // Fetch the project metadata
    const projectItem = await getItem<ProjectDynamoItem>({
      PK: Keys.project.pk(id),
      SK: Keys.project.sk(),
    });

    if (!projectItem || !projectItem.published) {
      const response: ApiResponse = {
        success: false,
        error: "Project not found",
      };
      return Response.json(response, { status: 404 });
    }

    // Fetch associated images
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

    const project: Project = {
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

    const response: ApiResponse<Project> = {
      success: true,
      data: project,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error fetching project:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch project",
    };
    return Response.json(response, { status: 500 });
  }
}
