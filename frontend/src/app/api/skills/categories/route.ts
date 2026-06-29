/**
 * GET /api/skills/categories - List all categories (admin, includes empty).
 * POST /api/skills/categories - Create a category (admin, auth via proxy).
 */

import { queryItems, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";
import { createSkillCategoryRequestSchema } from "@/types/schemas";
import { revalidateHomePage } from "@/lib/revalidate";

interface SkillCategoryDynamoItem extends DynamoDBItem {
  id: string;
  label: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function GET(): Promise<Response> {
  try {
    const { items } = await queryItems<SkillCategoryDynamoItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :gsi1pk",
      expressionAttributeValues: {
        ":gsi1pk": Keys.skillCategory.gsi1pk(),
      },
      scanIndexForward: true,
    });

    const categories = items.map((item) => ({
      id: item.id,
      label: item.label,
      displayOrder: item.displayOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const response: ApiResponse<typeof categories> = {
      success: true,
      data: categories,
    };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to fetch skill categories:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch skill categories",
    };
    return Response.json(response, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
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
  const parsed = createSkillCategoryRequestSchema.safeParse(body);
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

  const { label, displayOrder } = parsed.data;

  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await putItem({
      PK: Keys.skillCategory.pk(id),
      SK: Keys.skillCategory.sk(),
      GSI1PK: Keys.skillCategory.gsi1pk(),
      GSI1SK: Keys.skillCategory.gsi1sk(displayOrder),
      type: "skillCategory",
      id,
      label,
      displayOrder,
      createdAt: now,
      updatedAt: now,
    });

    // Invalidate cached home page so visitors see updated skill categories
    revalidateHomePage();

    const response: ApiResponse<{ id: string; label: string; displayOrder: number; createdAt: string; updatedAt: string }> = {
      success: true,
      data: { id, label, displayOrder, createdAt: now, updatedAt: now },
    };
    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to create skill category:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to create skill category",
    };
    return Response.json(response, { status: 500 });
  }
}
