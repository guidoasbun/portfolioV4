/**
 * GET /api/projects - Returns all published projects ordered by displayOrder.
 * POST /api/projects - Create a new project (admin, protected by proxy).
 *
 * Each project includes its associated images with public URLs.
 */

import { randomUUID } from "crypto";
import { queryAllItems, queryItems, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl } from "@/lib/s3";
import { createProjectRequestSchema } from "@/types/schemas";
import type { Project, ProjectImage } from "@/types/entities";
import type { ApiResponse } from "@/types/api";
import { revalidateHomePage } from "@/lib/revalidate";

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

export async function GET(): Promise<Response> {
  try {
    // Query GSI1 for all published projects, paginating through all DynamoDB pages
    const projectItems = await queryAllItems<ProjectDynamoItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": Keys.project.gsi1pk(),
        ":published": true,
      },
      filterExpression: "published = :published",
      scanIndexForward: true,
    });

    // For each project, query its images
    const projects: Project[] = await Promise.all(
      projectItems.map(async (item) => {
        const { items: imageItems } =
          await queryItems<ProjectImageDynamoItem>({
            keyConditionExpression:
              "PK = :pk AND begins_with(SK, :skPrefix)",
            expressionAttributeValues: {
              ":pk": Keys.projectImage.pk(item.id),
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
          id: item.id,
          title: item.title,
          description: item.description,
          githubUrl: item.githubUrl,
          deploymentUrl: item.deploymentUrl,
          published: item.published,
          displayOrder: item.displayOrder,
          images,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    );

    const response: ApiResponse<Project[]> = {
      success: true,
      data: projects,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error fetching projects:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch projects",
    };
    return Response.json(response, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = createProjectRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        errors,
      };
      return Response.json(response, { status: 400 });
    }

    const data = parseResult.data;
    const projectId = randomUUID();
    const now = new Date().toISOString();

    // Save project metadata to DynamoDB
    await putItem({
      PK: Keys.project.pk(projectId),
      SK: Keys.project.sk(),
      GSI1PK: Keys.project.gsi1pk(),
      GSI1SK: Keys.project.gsi1sk(data.displayOrder),
      type: "PROJECT",
      id: projectId,
      title: data.title,
      description: data.description,
      githubUrl: data.githubUrl,
      deploymentUrl: data.deploymentUrl,
      published: data.published,
      displayOrder: data.displayOrder,
      createdAt: now,
      updatedAt: now,
    });

    const project: Project = {
      id: projectId,
      title: data.title,
      description: data.description,
      githubUrl: data.githubUrl,
      deploymentUrl: data.deploymentUrl,
      published: data.published,
      displayOrder: data.displayOrder,
      images: [],
      createdAt: now,
      updatedAt: now,
    };

    // Invalidate cached home page so visitors see new project (if published)
    revalidateHomePage();

    const response: ApiResponse<Project> = {
      success: true,
      data: project,
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to create project",
    };
    return Response.json(response, { status: 500 });
  }
}
