/**
 * POST /api/projects/upload-image
 *
 * Generates presigned URLs for uploading project images to S3.
 * Validates file type (JPEG, PNG, WebP) and size (≤5MB).
 * Does NOT save the image metadata to DynamoDB — that happens
 * when the project form is submitted.
 */

import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { generateUploadUrl, projectImageKey, PRESIGNED_URL_EXPIRY } from "@/lib/s3";
import { validateImageUpload } from "@/lib/validation";
import type { ApiResponse } from "@/types/api";

const uploadImageRequestSchema = z.object({
  projectId: z.string().min(1),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
  currentImageCount: z.number().int().min(0).default(0),
});

interface UploadImageResponseData {
  uploadUrl: string;
  imageId: string;
  s3Key: string;
  expiresIn: number;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    const parseResult = uploadImageRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      }
      const response: ApiResponse = { success: false, errors };
      return Response.json(response, { status: 400 });
    }

    const { projectId, contentType, fileSize, currentImageCount } = parseResult.data;

    // Validate image constraints
    const validation = validateImageUpload({ contentType, fileSize }, currentImageCount);
    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        errors: validation.errors,
      };
      return Response.json(response, { status: 400 });
    }

    // Determine file extension from content type
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[contentType] ?? "jpg";

    const imageId = randomUUID();
    const s3Key = projectImageKey(projectId, imageId, ext);

    // Generate presigned upload URL
    const uploadUrl = await generateUploadUrl(s3Key, contentType);

    const data: UploadImageResponseData = {
      uploadUrl,
      imageId,
      s3Key,
      expiresIn: PRESIGNED_URL_EXPIRY,
    };

    const response: ApiResponse<UploadImageResponseData> = {
      success: true,
      data,
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to generate image upload URL:", error);
    return Response.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
