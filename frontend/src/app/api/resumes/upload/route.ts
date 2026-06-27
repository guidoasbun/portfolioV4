/**
 * POST /api/resumes/upload
 *
 * Validates resume upload request, generates a presigned URL for direct S3 upload,
 * and saves resume metadata to DynamoDB.
 */

import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { putItem, Keys } from "@/lib/dynamodb";
import { generateUploadUrl, resumeKey, PRESIGNED_URL_EXPIRY } from "@/lib/s3";
import { resumeUploadRequestSchema } from "@/types/schemas";
import { validateResumeFile } from "@/lib/validation";
import type { ApiResponse } from "@/types/api";
import type { ResumeUploadResponseData } from "@/types/api";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    // Validate request schema
    const parseResult = resumeUploadRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      }
      const response: ApiResponse = { success: false, errors };
      return Response.json(response, { status: 400 });
    }

    const { filename, contentType, fileSize } = parseResult.data;

    // Validate file type and size
    const fileValidation = validateResumeFile({ contentType, fileSize });
    if (!fileValidation.success) {
      const response: ApiResponse = {
        success: false,
        errors: fileValidation.errors,
      };
      return Response.json(response, { status: 400 });
    }

    // Generate resume ID and S3 key
    const resumeId = randomUUID();
    const s3Key = resumeKey(resumeId);

    // Generate presigned upload URL
    const uploadUrl = await generateUploadUrl(s3Key, contentType);

    // Save resume metadata to DynamoDB
    const now = new Date().toISOString();
    await putItem({
      PK: Keys.resume.pk(resumeId),
      SK: Keys.resume.sk(),
      GSI1PK: Keys.resume.gsi1pk(),
      GSI1SK: Keys.resume.gsi1sk(now),
      type: "resume",
      id: resumeId,
      filename,
      s3Key,
      fileSize,
      isPreferred: false,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const data: ResumeUploadResponseData = {
      uploadUrl,
      resumeId,
      expiresIn: PRESIGNED_URL_EXPIRY,
    };

    const response: ApiResponse<ResumeUploadResponseData> = {
      success: true,
      data,
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to generate resume upload URL:", error);
    return Response.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
