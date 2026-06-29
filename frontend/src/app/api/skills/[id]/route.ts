/**
 * PUT /api/skills/[id] - Update skill (admin, auth via proxy).
 * DELETE /api/skills/[id] - Delete skill (admin, auth via proxy).
 */

import type { NextRequest } from "next/server";
import { getItem, putItem, deleteItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";
import { updateSkillRequestSchema } from "@/types/schemas";
import { revalidateHomePage } from "@/lib/revalidate";

interface SkillDynamoItem extends DynamoDBItem {
  id: string;
  name: string;
  categoryId: string;
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
  const parsed = updateSkillRequestSchema.safeParse(body);
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
  if (!updates.name && !updates.categoryId) {
    const response: ApiResponse = {
      success: false,
      error: "At least one field must be provided for update",
    };
    return Response.json(response, { status: 400 });
  }

  try {
    // Fetch existing skill
    const existing = await getItem<SkillDynamoItem>({
      PK: Keys.skill.pk(id),
      SK: Keys.skill.sk(),
    });

    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: "Skill not found",
      };
      return Response.json(response, { status: 404 });
    }

    const newName = updates.name ?? existing.name;
    const newCategoryId = updates.categoryId ?? existing.categoryId;

    // If categoryId is changing, verify the new category exists
    if (updates.categoryId && updates.categoryId !== existing.categoryId) {
      const category = await getItem({
        PK: Keys.skillCategory.pk(updates.categoryId),
        SK: Keys.skillCategory.sk(),
      });

      if (!category) {
        const response: ApiResponse = {
          success: false,
          error: "Category not found",
        };
        return Response.json(response, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const gsiChanged =
      (updates.name && updates.name !== existing.name) ||
      (updates.categoryId && updates.categoryId !== existing.categoryId);

    if (gsiChanged) {
      // GSI keys changed: delete old item and put new item
      // (DynamoDB cannot update key attributes in-place)
      await deleteItem({
        PK: Keys.skill.pk(id),
        SK: Keys.skill.sk(),
      });

      await putItem({
        PK: Keys.skill.pk(id),
        SK: Keys.skill.sk(),
        GSI1PK: Keys.skill.gsi1pk(newCategoryId),
        GSI1SK: Keys.skill.gsi1sk(newName),
        type: "skill",
        id,
        name: newName,
        categoryId: newCategoryId,
        createdAt: existing.createdAt,
        updatedAt: now,
      });
    } else {
      // No GSI key changes, use putItem to overwrite
      await putItem({
        PK: Keys.skill.pk(id),
        SK: Keys.skill.sk(),
        GSI1PK: Keys.skill.gsi1pk(newCategoryId),
        GSI1SK: Keys.skill.gsi1sk(newName),
        type: "skill",
        id,
        name: newName,
        categoryId: newCategoryId,
        createdAt: existing.createdAt,
        updatedAt: now,
      });
    }

    // Invalidate cached home page so visitors see updated skill
    revalidateHomePage();

    const response: ApiResponse<{ id: string; name: string; categoryId: string; createdAt: string; updatedAt: string }> = {
      success: true,
      data: { id, name: newName, categoryId: newCategoryId, createdAt: existing.createdAt, updatedAt: now },
    };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to update skill:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to update skill",
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
    // Verify skill exists
    const existing = await getItem<SkillDynamoItem>({
      PK: Keys.skill.pk(id),
      SK: Keys.skill.sk(),
    });

    if (!existing) {
      const response: ApiResponse = {
        success: false,
        error: "Skill not found",
      };
      return Response.json(response, { status: 404 });
    }

    await deleteItem({
      PK: Keys.skill.pk(id),
      SK: Keys.skill.sk(),
    });

    // Invalidate cached home page so visitors see skill removal
    revalidateHomePage();

    const response: ApiResponse = {
      success: true,
      message: "Skill deleted successfully",
    };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to delete skill:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to delete skill",
    };
    return Response.json(response, { status: 500 });
  }
}
