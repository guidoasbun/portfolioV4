/**
 * POST /api/projects/[id]/images
 *
 * Add image metadata records to a project in DynamoDB.
 * Called after images have been uploaded to S3 via presigned URLs.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getItem, putItem, queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";

interface ProjectDynamoItem extends DynamoDBItem {
  id: string;
}

interface ProjectImageDynamoItem extends DynamoDBItem {
  id: string;
  order: number;
}

const addImagesRequestSchema = z.object({
  images: z
    .array(
      z.object({
        id: z.string().min(1),
        s3Key: z.string().min(1),
        order: z.number().int().min(0),
        altText: z.string().optional(),
      }),
    )
    .min(1)
    .max(10),
});

export async function POST(
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

    const parseResult = addImagesRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      }
      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        errors,
      };
      return Response.json(response, { status: 400 });
    }

    // Verify project exists
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

    const { images } = parseResult.data;

    // Reject duplicate order values within the request
    const orderValues = images.map((img) => img.order);
    if (new Set(orderValues).size !== orderValues.length) {
      const response: ApiResponse = {
        success: false,
        error: "Duplicate order values are not allowed",
      };
      return Response.json(response, { status: 400 });
    }

    // Check for order collisions with existing images
    const { items: existingImages } = await queryItems<ProjectImageDynamoItem>({
      keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      expressionAttributeValues: {
        ":pk": Keys.projectImage.pk(id),
        ":skPrefix": "IMAGE#",
      },
      scanIndexForward: true,
    });

    const existingOrders = new Set(existingImages.map((img) => img.order));
    const conflicting = orderValues.filter((o) => existingOrders.has(o));
    if (conflicting.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: `Order values already occupied: ${conflicting.join(", ")}`,
      };
      return Response.json(response, { status: 409 });
    }

    // Save each image record
    await Promise.all(
      images.map((img) =>
        putItem({
          PK: Keys.projectImage.pk(id),
          SK: Keys.projectImage.sk(img.order),
          type: "PROJECT_IMAGE",
          id: img.id,
          s3Key: img.s3Key,
          order: img.order,
          altText: img.altText,
        }),
      ),
    );

    const response: ApiResponse = {
      success: true,
      message: "Images added successfully",
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Error adding project images:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to add images",
    };
    return Response.json(response, { status: 500 });
  }
}
