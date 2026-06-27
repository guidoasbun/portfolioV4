/**
 * GET /api/resumes/preferred
 *
 * Returns a presigned download URL for the preferred resume PDF.
 * Returns 404 if no preferred resume is set.
 */

import { queryItems, Keys } from "@/lib/dynamodb";
import { generateDownloadUrl } from "@/lib/s3";
import type { DynamoDBItem } from "@/lib/dynamodb";

interface ResumeItem extends DynamoDBItem {
  id: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  isPreferred: boolean;
  uploadedAt: string;
}

export async function GET() {
  try {
    const { items } = await queryItems<ResumeItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.resume.gsi1pk(),
        ":preferred": true,
      },
      filterExpression: "isPreferred = :preferred",
    });

    // Filter for the preferred resume client-side as a safety net
    const preferred = items.find((item) => item.isPreferred === true);

    if (!preferred) {
      return Response.json(
        { success: false, error: "No preferred resume found" },
        { status: 404 },
      );
    }

    const downloadUrl = await generateDownloadUrl(preferred.s3Key);

    return Response.json({
      success: true,
      data: {
        downloadUrl,
        filename: preferred.filename,
        resumeId: preferred.id,
      },
    });
  } catch (error) {
    console.error("Failed to fetch preferred resume:", error);
    return Response.json(
      { success: false, error: "Failed to fetch preferred resume" },
      { status: 500 },
    );
  }
}
