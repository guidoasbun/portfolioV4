/**
 * PUT /api/projects/[id]/reorder-images
 *
 * Update image display order for a project.
 * Accepts an array of { imageId, order } objects and updates each image's
 * sort key in DynamoDB (deletes old SK, puts with new SK).
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getItem, queryItems, deleteItem, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";

interface ProjectDynamoItem extends DynamoDBItem {
  id: string;
}

interface ProjectImageDynamoItem extends DynamoDBItem {
  id: string;
  s3Key: string;
  order: number;
  altText?: string;
}

const reorderRequestSchema = z.object({
  images: z.array(
    z.object({
      imageId: z.string().min(1),
      order: z.number().int().min(0),
    }),
  ).min(1),
});

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
    const parseResult = reorderRequestSchema.safeParse(body);
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

    // Get all current images for this project
    const { items: currentImages } = await queryItems<ProjectImageDynamoItem>({
      keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      expressionAttributeValues: {
        ":pk": Keys.projectImage.pk(id),
        ":skPrefix": "IMAGE#",
      },
      scanIndexForward: true,
    });

    const { images: reorderData } = parseResult.data;

    // Build a map of current images by their id
    const imageMap = new Map(currentImages.map((img) => [img.id, img]));

    // Validate all imageIds exist
    for (const item of reorderData) {
      if (!imageMap.has(item.imageId)) {
        const response: ApiResponse = {
          success: false,
          error: `Image not found: ${item.imageId}`,
        };
        return Response.json(response, { status: 400 });
      }
    }

    // Validate no duplicate order values (would overwrite at same SK)
    const orderValues = reorderData.map((item) => item.order);
    if (new Set(orderValues).size !== orderValues.length) {
      const response: ApiResponse = {
        success: false,
        error: "Duplicate order values are not allowed",
      };
      return Response.json(response, { status: 400 });
    }

    // Two-phase reorder to avoid SK collisions:
    // Phase 1: Delete all affected image records
    // Phase 2: Put all image records with new order values
    // This prevents races where a parallel delete+put can overwrite another image.

    // Phase 1: Delete all current records that are being reordered
    await Promise.all(
      reorderData.map(({ imageId }) => {
        const existingImage = imageMap.get(imageId)!;
        return deleteItem({
          PK: Keys.projectImage.pk(id),
          SK: Keys.projectImage.sk(existingImage.order),
        });
      }),
    );

    // Phase 2: Put all records with new order values
    await Promise.all(
      reorderData.map(({ imageId, order }) => {
        const existingImage = imageMap.get(imageId)!;
        return putItem({
          PK: Keys.projectImage.pk(id),
          SK: Keys.projectImage.sk(order),
          type: "PROJECT_IMAGE",
          id: existingImage.id,
          s3Key: existingImage.s3Key,
          order,
          altText: existingImage.altText,
        });
      }),
    );

    const response: ApiResponse = {
      success: true,
      message: "Images reordered successfully",
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error reordering images:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to reorder images",
    };
    return Response.json(response, { status: 500 });
  }
}
