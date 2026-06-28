/**
 * POST /api/projects/[id]/images
 *
 * Add image metadata records to a project in DynamoDB.
 * Called after images have been uploaded to S3 via presigned URLs.
 */

import type { NextRequest } from "next/server";
import { z } from "zod";
import { getItem, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";

interface ProjectDynamoItem extends DynamoDBItem {
  id: string;
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
