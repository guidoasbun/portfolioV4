/**
 * PUT /api/experience/[id] - Update experience entry
 * DELETE /api/experience/[id] - Delete experience entry
 *
 * Both endpoints require authentication.
 */

import type { NextRequest } from "next/server";
import { getItem, updateItem, deleteItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Experience } from "@/types/entities";
import type { ApiResponse } from "@/types/api";
import { updateExperienceRequestSchema } from "@/types/schemas";
import { validateRequest } from "@/lib/auth";

interface ExperienceDynamoItem extends DynamoDBItem {
  id: string;
  jobTitle: string;
  company: string;
  startDate: string;
  endDate?: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * PUT /api/experience/[id]
 *
 * Updates an existing experience entry. Only provided fields are updated.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    // Verify authentication
    const authResult = await validateRequest(request);
    if (!authResult.valid) {
      const response: ApiResponse = { success: false, error: "Unauthorized" };
      return Response.json(response, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      const response: ApiResponse = { success: false, error: "Experience ID is required" };
      return Response.json(response, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = updateExperienceRequestSchema.safeParse(body);

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
        error: "Invalid request body",
        errors,
      };
      return Response.json(response, { status: 400 });
    }

    const updates = parseResult.data;

    // Check if there are any fields to update
    const updateFields = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (updateFields.length === 0) {
      const response: ApiResponse = { success: false, error: "No fields to update" };
      return Response.json(response, { status: 400 });
    }

    // Check if item exists
    const existingItem = await getItem<ExperienceDynamoItem>({
      PK: Keys.experience.pk(id),
      SK: Keys.experience.sk(),
    });

    if (!existingItem) {
      const response: ApiResponse = { success: false, error: "Experience entry not found" };
      return Response.json(response, { status: 404 });
    }

    // Build update expression
    const now = new Date().toISOString();
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, string> = {};
    const updateParts: string[] = [];

    for (const [key, value] of updateFields) {
      const attrName = `#${key}`;
      const attrValue = `:${key}`;
      expressionAttributeNames[attrName] = key;
      expressionAttributeValues[attrValue] = value as string;
      updateParts.push(`${attrName} = ${attrValue}`);
    }

    // Always update updatedAt
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = now;
    updateParts.push("#updatedAt = :updatedAt");

    // If startDate changes, update GSI1SK too
    if (updates.startDate) {
      expressionAttributeNames["#GSI1SK"] = "GSI1SK";
      expressionAttributeValues[":GSI1SK"] = Keys.experience.gsi1sk(updates.startDate);
      updateParts.push("#GSI1SK = :GSI1SK");
    }

    const updatedItem = await updateItem<ExperienceDynamoItem>({
      key: {
        PK: Keys.experience.pk(id),
        SK: Keys.experience.sk(),
      },
      updateExpression: `SET ${updateParts.join(", ")}`,
      expressionAttributeNames,
      expressionAttributeValues,
    });

    if (!updatedItem) {
      const response: ApiResponse = { success: false, error: "Failed to update experience entry" };
      return Response.json(response, { status: 500 });
    }

    const experience: Experience = {
      id: updatedItem.id,
      jobTitle: updatedItem.jobTitle,
      company: updatedItem.company,
      startDate: updatedItem.startDate,
      endDate: updatedItem.endDate,
      description: updatedItem.description,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
    };

    const response: ApiResponse<Experience> = {
      success: true,
      data: experience,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Failed to update experience entry:", error);

    const response: ApiResponse = {
      success: false,
      error: "Failed to update experience entry",
    };

    return Response.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/experience/[id]
 *
 * Deletes an experience entry by ID.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    // Verify authentication
    const authResult = await validateRequest(request);
    if (!authResult.valid) {
      const response: ApiResponse = { success: false, error: "Unauthorized" };
      return Response.json(response, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      const response: ApiResponse = { success: false, error: "Experience ID is required" };
      return Response.json(response, { status: 400 });
    }

    // Check if item exists
    const existingItem = await getItem<ExperienceDynamoItem>({
      PK: Keys.experience.pk(id),
      SK: Keys.experience.sk(),
    });

    if (!existingItem) {
      const response: ApiResponse = { success: false, error: "Experience entry not found" };
      return Response.json(response, { status: 404 });
    }

    // Delete from DynamoDB
    await deleteItem({
      PK: Keys.experience.pk(id),
      SK: Keys.experience.sk(),
    });

    const response: ApiResponse = {
      success: true,
      message: "Experience entry deleted successfully",
    };

    return Response.json(response);
  } catch (error) {
    console.error("Failed to delete experience entry:", error);

    const response: ApiResponse = {
      success: false,
      error: "Failed to delete experience entry",
    };

    return Response.json(response, { status: 500 });
  }
}
