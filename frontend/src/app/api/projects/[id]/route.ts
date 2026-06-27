/**
 * GET /api/projects/[id] - Returns a single project by ID (public, published only).
 * PUT /api/projects/[id] - Update project metadata (admin, protected by proxy).
 * DELETE /api/projects/[id] - Delete project and associated S3 images (admin, protected by proxy).
 */

import type { NextRequest } from "next/server";
import { getItem, queryItems, deleteItem, updateItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl, deleteFiles } from "@/lib/s3";
import { updateProjectRequestSchema } from "@/types/schemas";
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

export async function PUT(
  request: NextRequest,
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

    const body = await request.json();

    // Validate request body
    const parseResult = updateProjectRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        errors: parseResult.error.flatten().fieldErrors as Record<string, string>,
      };
      return Response.json(response, { status: 400 });
    }

    const data = parseResult.data;

    // Check if project exists
    const existing = await getItem<ProjectDynamoItem>({
      PK: Keys.project.pk(id),
      SK: Keys.project.sk(),
    });

    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: "Project not found",
      };
      return Response.json(response, { status: 404 });
    }

    // Build update expression dynamically from provided fields
    const updateParts: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (data.title !== undefined) {
      updateParts.push("#title = :title");
      expressionAttributeNames["#title"] = "title";
      expressionAttributeValues[":title"] = data.title;
    }
    if (data.description !== undefined) {
      updateParts.push("#description = :description");
      expressionAttributeNames["#description"] = "description";
      expressionAttributeValues[":description"] = data.description;
    }
    if (data.githubUrl !== undefined) {
      updateParts.push("githubUrl = :githubUrl");
      expressionAttributeValues[":githubUrl"] = data.githubUrl;
    }
    if (data.deploymentUrl !== undefined) {
      updateParts.push("deploymentUrl = :deploymentUrl");
      expressionAttributeValues[":deploymentUrl"] = data.deploymentUrl;
    }
    if (data.published !== undefined) {
      updateParts.push("published = :published");
      expressionAttributeValues[":published"] = data.published;
    }
    if (data.displayOrder !== undefined) {
      updateParts.push("displayOrder = :displayOrder");
      expressionAttributeValues[":displayOrder"] = data.displayOrder;
      // Also update GSI1SK when displayOrder changes
      updateParts.push("GSI1SK = :gsi1sk");
      expressionAttributeValues[":gsi1sk"] = Keys.project.gsi1sk(data.displayOrder);
    }

    // Always update the updatedAt timestamp
    updateParts.push("updatedAt = :updatedAt");
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    const updatedItem = await updateItem<ProjectDynamoItem>({
      key: {
        PK: Keys.project.pk(id),
        SK: Keys.project.sk(),
      },
      updateExpression: `SET ${updateParts.join(", ")}`,
      expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && { expressionAttributeNames }),
    });

    if (!updatedItem) {
      const response: ApiResponse = {
        success: false,
        error: "Failed to update project",
      };
      return Response.json(response, { status: 500 });
    }

    // Fetch images for the response
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
      id: updatedItem.id,
      title: updatedItem.title,
      description: updatedItem.description,
      githubUrl: updatedItem.githubUrl,
      deploymentUrl: updatedItem.deploymentUrl,
      published: updatedItem.published,
      displayOrder: updatedItem.displayOrder,
      images,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    const response: ApiResponse<Project> = {
      success: true,
      data: project,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error updating project:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to update project",
    };
    return Response.json(response, { status: 500 });
  }
}

export async function DELETE(
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

    // Check if project exists
    const existing = await getItem<ProjectDynamoItem>({
      PK: Keys.project.pk(id),
      SK: Keys.project.sk(),
    });

    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: "Project not found",
      };
      return Response.json(response, { status: 404 });
    }

    // Query all images for the project
    const { items: imageItems } = await queryItems<ProjectImageDynamoItem>({
      keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      expressionAttributeValues: {
        ":pk": Keys.projectImage.pk(id),
        ":skPrefix": "IMAGE#",
      },
      scanIndexForward: true,
    });

    // Delete all image S3 files
    if (imageItems.length > 0) {
      const s3Keys = imageItems.map((img) => img.s3Key);
      await deleteFiles(s3Keys);
    }

    // Delete all image DynamoDB items
    await Promise.all(
      imageItems.map((img) =>
        deleteItem({
          PK: Keys.projectImage.pk(id),
          SK: Keys.projectImage.sk(img.order),
        }),
      ),
    );

    // Delete the project item
    await deleteItem({
      PK: Keys.project.pk(id),
      SK: Keys.project.sk(),
    });

    const response: ApiResponse = {
      success: true,
      message: "Project deleted successfully",
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error deleting project:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete project",
    };
    return Response.json(response, { status: 500 });
  }
}
