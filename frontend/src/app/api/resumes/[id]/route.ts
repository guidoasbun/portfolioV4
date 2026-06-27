/**
 * DELETE /api/resumes/[id]
 *
 * Deletes a resume from S3 and DynamoDB.
 * Prevents deletion of the preferred resume if other resumes exist (must reassign first).
 * Prevents deletion of the only remaining preferred resume.
 */

import type { NextRequest } from "next/server";
import { getItem, deleteItem, queryAllItems, Keys } from "@/lib/dynamodb";
import { deleteFile } from "@/lib/s3";
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

export async function DELETE(
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

    // Get the resume record
    const resume = await getItem<ResumeDynamoItem>({
      PK: Keys.resume.pk(id),
      SK: Keys.resume.sk(),
    });

    if (!resume) {
      const response: ApiResponse = {
        success: false,
        error: "Resume not found",
      };
      return Response.json(response, { status: 404 });
    }

    // If this is the preferred resume, check constraints
    if (resume.isPreferred) {
      const allResumes = await queryAllItems<ResumeDynamoItem>({
        indexName: "GSI1",
        keyConditionExpression: "GSI1PK = :pk",
        expressionAttributeValues: {
          ":pk": Keys.resume.gsi1pk(),
        },
      });

      if (allResumes.length > 1) {
        // Req 3.5: Other resumes exist — prompt admin to select new preferred
        const response: ApiResponse = {
          success: false,
          error:
            "Cannot delete the preferred resume. Please set another resume as preferred first.",
        };
        return Response.json(response, { status: 409 });
      }

      // Req 3.6: It's the only resume and it's preferred — prevent deletion
      const response: ApiResponse = {
        success: false,
        error:
          "Cannot delete the only preferred resume. At least one preferred resume must exist.",
      };
      return Response.json(response, { status: 409 });
    }

    // Delete from S3
    await deleteFile(resume.s3Key);

    // Delete from DynamoDB
    await deleteItem({
      PK: Keys.resume.pk(id),
      SK: Keys.resume.sk(),
    });

    const response: ApiResponse = {
      success: true,
      message: "Resume deleted successfully",
    };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to delete resume:", error);
    return Response.json(
      { success: false, error: "Failed to delete resume" },
      { status: 500 },
    );
  }
}
