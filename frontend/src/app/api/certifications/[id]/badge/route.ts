/**
 * POST /api/certifications/[id]/badge - Generate presigned upload URL for badge image.
 *   Does NOT save the badge key to DynamoDB yet. Client must call PUT after upload.
 *
 * PUT /api/certifications/[id]/badge - Confirm badge upload succeeded.
 *   Saves the badge S3 key to DynamoDB after client confirms the upload completed.
 */

import type { NextRequest } from "next/server";
import { getItem, updateItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { generateUploadUrl, certificationBadgeKey, getAssetUrl, deleteFile } from "@/lib/s3";
import type { ApiResponse } from "@/types/api";
import { validateRequest } from "@/lib/auth";
import { revalidateHomePage } from "@/lib/revalidate";
import { z } from "zod";

const badgeUploadSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]),
  filename: z.string().min(1),
});

const badgeConfirmSchema = z.object({
  s3Key: z.string().min(1),
});

interface CertDynamoItem extends DynamoDBItem {
  id: string;
  badgeS3Key?: string;
}

/**
 * POST - Generate presigned upload URL. Does not persist badge key yet.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const authResult = await validateRequest(request);
    if (!authResult.valid) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 });
    }

    const { id } = await params;

    const existing = await getItem<CertDynamoItem>({
      PK: Keys.certification.pk(id),
      SK: Keys.certification.sk(),
    });

    if (!existing) {
      return Response.json({ success: false, error: "Certification not found" } satisfies ApiResponse, { status: 404 });
    }

    const body = await request.json();
    const parseResult = badgeUploadSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { success: false, error: "Invalid request. Accepted types: JPEG, PNG, WebP, SVG" } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const { contentType, filename } = parseResult.data;
    const ext = filename.split(".").pop() ?? "png";
    const s3Key = certificationBadgeKey(id, ext);

    // Generate presigned upload URL (don't persist to DB yet)
    const uploadUrl = await generateUploadUrl(s3Key, contentType);

    return Response.json({
      success: true,
      data: {
        uploadUrl,
        s3Key,
        badgeUrl: getAssetUrl(s3Key),
      },
    });
  } catch (error) {
    console.error("Failed to generate badge upload URL:", error);
    return Response.json(
      { success: false, error: "Failed to generate upload URL" } satisfies ApiResponse,
      { status: 500 },
    );
  }
}

/**
 * PUT - Confirm badge upload succeeded. Persists badge S3 key to DynamoDB.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const authResult = await validateRequest(request);
    if (!authResult.valid) {
      return Response.json({ success: false, error: "Unauthorized" } satisfies ApiResponse, { status: 401 });
    }

    const { id } = await params;

    const existing = await getItem<CertDynamoItem>({
      PK: Keys.certification.pk(id),
      SK: Keys.certification.sk(),
    });

    if (!existing) {
      return Response.json({ success: false, error: "Certification not found" } satisfies ApiResponse, { status: 404 });
    }

    const body = await request.json();
    const parseResult = badgeConfirmSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json({ success: false, error: "s3Key is required" } satisfies ApiResponse, { status: 400 });
    }

    const { s3Key } = parseResult.data;

    // Delete old badge if it exists and is different
    if (existing.badgeS3Key && existing.badgeS3Key !== s3Key) {
      await deleteFile(existing.badgeS3Key);
    }

    // Save the new badge key
    const now = new Date().toISOString();
    await updateItem({
      key: { PK: Keys.certification.pk(id), SK: Keys.certification.sk() },
      updateExpression: "SET #badgeS3Key = :badgeS3Key, #updatedAt = :updatedAt",
      expressionAttributeNames: {
        "#badgeS3Key": "badgeS3Key",
        "#updatedAt": "updatedAt",
      },
      expressionAttributeValues: {
        ":badgeS3Key": s3Key,
        ":updatedAt": now,
      },
    });

    revalidateHomePage();

    return Response.json({
      success: true,
      data: { badgeUrl: getAssetUrl(s3Key) },
    });
  } catch (error) {
    console.error("Failed to confirm badge upload:", error);
    return Response.json(
      { success: false, error: "Failed to confirm badge upload" } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
