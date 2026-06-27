/**
 * GET /api/resumes
 *
 * Returns all resumes sorted by upload date (most recent first).
 * Admin endpoint for resume management.
 */

import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Resume } from "@/types/entities";
import type { ApiResponse } from "@/types/api";

interface ResumeDynamoItem extends DynamoDBItem {
  id: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  isPreferred: boolean;
  uploadedAt: string;
}

export async function GET(): Promise<Response> {
  try {
    const items = await queryAllItems<ResumeDynamoItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.resume.gsi1pk(),
      },
      scanIndexForward: false, // Most recent first
    });

    const resumes: Resume[] = items.map((item) => ({
      id: item.id,
      filename: item.filename,
      s3Key: item.s3Key,
      fileSize: item.fileSize,
      isPreferred: item.isPreferred,
      uploadedAt: item.uploadedAt,
    }));

    const response: ApiResponse<Resume[]> = {
      success: true,
      data: resumes,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Failed to fetch resumes:", error);
    return Response.json(
      { success: false, error: "Failed to fetch resumes" },
      { status: 500 },
    );
  }
}
