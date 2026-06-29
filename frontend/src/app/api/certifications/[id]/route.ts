/**
 * PUT /api/certifications/[id] - Update certification.
 * DELETE /api/certifications/[id] - Delete certification + badge from S3.
 */

import type { NextRequest } from "next/server";
import { getItem, updateItem, deleteItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl, deleteFile } from "@/lib/s3";
import { updateCertificationRequestSchema } from "@/types/schemas";
import type { Certification } from "@/types/entities";
import type { ApiResponse } from "@/types/api";
import { validateRequest } from "@/lib/auth";
import { revalidateHomePage } from "@/lib/revalidate";

interface CertDynamoItem extends DynamoDBItem {
  id: string;
  issuer: string;
  name: string;
  verificationUrl: string;
  badgeS3Key?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

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

    const body = await request.json();
    const parseResult = updateCertificationRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      return Response.json({ success: false, error: "Invalid request body", errors } satisfies ApiResponse, { status: 400 });
    }

    const updates = parseResult.data;
    const updateFields = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (updateFields.length === 0) {
      return Response.json({ success: false, error: "No fields to update" } satisfies ApiResponse, { status: 400 });
    }

    const existing = await getItem<CertDynamoItem>({
      PK: Keys.certification.pk(id),
      SK: Keys.certification.sk(),
    });

    if (!existing) {
      return Response.json({ success: false, error: "Certification not found" } satisfies ApiResponse, { status: 404 });
    }

    const now = new Date().toISOString();
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    const parts: string[] = [];

    for (const [key, value] of updateFields) {
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
      parts.push(`#${key} = :${key}`);
    }

    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = now;
    parts.push("#updatedAt = :updatedAt");

    if (updates.displayOrder !== undefined) {
      expressionAttributeNames["#GSI1SK"] = "GSI1SK";
      expressionAttributeValues[":GSI1SK"] = Keys.certification.gsi1sk(updates.displayOrder);
      parts.push("#GSI1SK = :GSI1SK");
    }

    const updatedItem = await updateItem<CertDynamoItem>({
      key: { PK: Keys.certification.pk(id), SK: Keys.certification.sk() },
      updateExpression: `SET ${parts.join(", ")}`,
      expressionAttributeNames,
      expressionAttributeValues,
    });

    if (!updatedItem) {
      return Response.json({ success: false, error: "Failed to update" } satisfies ApiResponse, { status: 500 });
    }

    const cert: Certification = {
      id: updatedItem.id,
      issuer: updatedItem.issuer,
      name: updatedItem.name,
      verificationUrl: updatedItem.verificationUrl,
      badgeS3Key: updatedItem.badgeS3Key,
      badgeUrl: updatedItem.badgeS3Key ? getAssetUrl(updatedItem.badgeS3Key) : undefined,
      displayOrder: updatedItem.displayOrder,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    revalidateHomePage();

    return Response.json({ success: true, data: cert } satisfies ApiResponse<Certification>);
  } catch (error) {
    console.error("Failed to update certification:", error);
    return Response.json({ success: false, error: "Failed to update certification" } satisfies ApiResponse, { status: 500 });
  }
}

export async function DELETE(
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

    // Delete badge from S3 if one exists (ignore errors if file is already gone)
    if (existing.badgeS3Key) {
      try {
        await deleteFile(existing.badgeS3Key);
      } catch {
        // File may not exist — that's fine, continue with deletion
      }
    }

    await deleteItem({ PK: Keys.certification.pk(id), SK: Keys.certification.sk() });

    revalidateHomePage();

    return Response.json({ success: true, message: "Certification deleted" } satisfies ApiResponse);
  } catch (error) {
    console.error("Failed to delete certification:", error);
    return Response.json({ success: false, error: "Failed to delete certification" } satisfies ApiResponse, { status: 500 });
  }
}
