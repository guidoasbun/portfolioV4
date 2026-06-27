/**
 * PUT /api/skills/categories/[id] - Update a skill category (admin, auth via proxy).
 * DELETE /api/skills/categories/[id] - Delete a skill category (admin, auth via proxy).
 */

import type { NextRequest } from "next/server";
import { getItem, putItem, deleteItem, queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";
import { updateSkillCategoryRequestSchema } from "@/types/schemas";

interface SkillCategoryDynamoItem extends DynamoDBItem {
  id: string;
  label: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const response: ApiResponse = {
      success: false,
      error: "Invalid request body",
    };
    return Response.json(response, { status: 400 });
  }

  // Validate input
  const parsed = updateSkillCategoryRequestSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    const response: ApiResponse = {
      success: false,
      errors,
    };
    return Response.json(response, { status: 400 });
  }

  const updates = parsed.data;

  // Must have at least one field to update
  if (updates.label === undefined && updates.displayOrder === undefined) {
    const response: ApiResponse = {
      success: false,
      error: "At least one field must be provided for update",
    };
    return Response.json(response, { status: 400 });
  }

  try {
    // Fetch existing category
    const existing = await getItem<SkillCategoryDynamoItem>({
      PK: Keys.skillCategory.pk(id),
      SK: Keys.skillCategory.sk(),
    });

    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: "Category not found",
      };
      return Response.json(response, { status: 404 });
    }

    const newLabel = updates.label ?? existing.label;
    const newDisplayOrder = updates.displayOrder ?? existing.displayOrder;
    const now = new Date().toISOString();

    const gsiChanged =
      updates.displayOrder !== undefined && updates.displayOrder !== existing.displayOrder;

    if (gsiChanged) {
      // GSI1SK changed: delete old item and put new item
      await deleteItem({
        PK: Keys.skillCategory.pk(id),
        SK: Keys.skillCategory.sk(),
      });

      await putItem({
        PK: Keys.skillCategory.pk(id),
        SK: Keys.skillCategory.sk(),
        GSI1PK: Keys.skillCategory.gsi1pk(),
        GSI1SK: Keys.skillCategory.gsi1sk(newDisplayOrder),
        type: "skillCategory",
        id,
        label: newLabel,
        displayOrder: newDisplayOrder,
        createdAt: existing.createdAt,
        updatedAt: now,
      });
    } else {
      // No GSI key changes, overwrite item
      await putItem({
        PK: Keys.skillCategory.pk(id),
        SK: Keys.skillCategory.sk(),
        GSI1PK: Keys.skillCategory.gsi1pk(),
        GSI1SK: Keys.skillCategory.gsi1sk(newDisplayOrder),
        type: "skillCategory",
        id,
        label: newLabel,
        displayOrder: newDisplayOrder,
        createdAt: existing.createdAt,
        updatedAt: now,
      });
    }

    const response: ApiResponse<{ id: string; label: string; displayOrder: number; createdAt: string; updatedAt: string }> = {
      success: true,
      data: { id, label: newLabel, displayOrder: newDisplayOrder, createdAt: existing.createdAt, updatedAt: now },
    };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to update skill category:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to update skill category",
    };
    return Response.json(response, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  try {
    // Verify category exists
    const existing = await getItem<SkillCategoryDynamoItem>({
      PK: Keys.skillCategory.pk(id),
      SK: Keys.skillCategory.sk(),
    });

    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: "Category not found",
      };
      return Response.json(response, { status: 404 });
    }

    // Check if category has skills assigned
    const { items: skills } = await queryItems({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": Keys.skill.gsi1pk(id),
      },
      limit: 1,
    });

    if (skills.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: "Cannot delete category that has skills assigned",
      };
      return Response.json(response, { status: 409 });
    }

    await deleteItem({
      PK: Keys.skillCategory.pk(id),
      SK: Keys.skillCategory.sk(),
    });

    const response: ApiResponse = {
      success: true,
      message: "Category deleted successfully",
    };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to delete skill category:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete skill category",
    };
    return Response.json(response, { status: 500 });
  }
}
