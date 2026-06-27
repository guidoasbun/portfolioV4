/**
 * PUT /api/resumes/[id]/preferred
 *
 * Sets the specified resume as preferred and removes preferred status from all others.
 */

import type { NextRequest } from "next/server";
import { getItem, queryAllItems, updateItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";

interface ResumeDynamoItem extends DynamoDBItem {
  id: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  isPreferred: boolean;
  uploadedAt: string;
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    if (!id) {
      const response: ApiResponse = {
        success: false,
        error: "Resume ID is required",
      };
      return Response.json(response, { status: 400 });
    }

    // Verify the target resume exists
    const targetResume = await getItem<ResumeDynamoItem>({
      PK: Keys.resume.pk(id),
      SK: Keys.resume.sk(),
    });

    if (!targetResume) {
      const response: ApiResponse = {
        success: false,
        error: "Resume not found",
      };
      return Response.json(response, { status: 404 });
    }

    // Query all resumes to unset preferred on others
    const allResumes = await queryAllItems<ResumeDynamoItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.resume.gsi1pk(),
      },
    });

    const now = new Date().toISOString();

    // Set all resumes to isPreferred: false, then set target to true
    await Promise.all(
      allResumes.map((resume) =>
        updateItem({
          key: {
            PK: Keys.resume.pk(resume.id),
            SK: Keys.resume.sk(),
          },
          updateExpression:
            "SET isPreferred = :preferred, updatedAt = :updatedAt",
          expressionAttributeValues: {
            ":preferred": resume.id === id,
            ":updatedAt": now,
          },
        }),
      ),
    );

    const response: ApiResponse = {
      success: true,
      message: "Resume set as preferred",
    };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to set preferred resume:", error);
    return Response.json(
      { success: false, error: "Failed to set preferred resume" },
      { status: 500 },
    );
  }
}
