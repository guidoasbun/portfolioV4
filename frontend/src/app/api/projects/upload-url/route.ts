/**
 * POST /api/projects/upload-url
 *
 * Generates a presigned S3 upload URL for a project image.
 * Accepts the projectId, filename, and contentType; returns the upload URL and S3 key.
 */

import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { generateUploadUrl, projectImageKey } from "@/lib/s3";
import type { ApiResponse } from "@/types/api";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadUrlRequestSchema = z.object({
  projectId: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().refine((ct) => ALLOWED_IMAGE_TYPES.includes(ct), {
    message: "Only JPEG, PNG, and WebP images are allowed",
  }),
  fileSize: z.number().int().positive().max(MAX_FILE_SIZE, {
    message: "File size must not exceed 5MB",
  }),
});

interface UploadUrlResponseData {
  uploadUrl: string;
  s3Key: string;
  imageId: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    const parseResult = uploadUrlRequestSchema.safeParse(body);
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

    const { projectId, filename, contentType } = parseResult.data;

    // Generate a unique image ID and determine the file extension
    const imageId = randomUUID();
    const ext = filename.split(".").pop() ?? "jpg";
    const s3Key = projectImageKey(projectId, imageId, ext);

    const uploadUrl = await generateUploadUrl(s3Key, contentType);

    const response: ApiResponse<UploadUrlResponseData> = {
      success: true,
      data: { uploadUrl, s3Key, imageId },
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to generate upload URL",
    };
    return Response.json(response, { status: 500 });
  }
}
