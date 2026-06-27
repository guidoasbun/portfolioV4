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
      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        errors: parseResult.error.flatten().fieldErrors as Record<string, string>,
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

    // For each reorder entry: delete old item and put with new SK
    await Promise.all(
      reorderData.map(async ({ imageId, order }) => {
        const existingImage = imageMap.get(imageId)!;

        // Delete the old item (with old SK based on old order)
        await deleteItem({
          PK: Keys.projectImage.pk(id),
          SK: Keys.projectImage.sk(existingImage.order),
        });

        // Put item with new order (new SK)
        await putItem({
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
