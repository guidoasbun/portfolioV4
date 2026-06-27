/**
 * GET /api/skills - Public listing of skills grouped by category.
 * POST /api/skills - Create a new skill (admin, auth via proxy).
 *
 * Empty categories (categories with zero skills) are filtered out in GET.
 */

import { queryItems, getItem, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";
import { createSkillRequestSchema } from "@/types/schemas";

interface SkillCategoryDynamoItem extends DynamoDBItem {
  id: string;
  label: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface SkillDynamoItem extends DynamoDBItem {
  id: string;
  name: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCategoryWithSkills {
  id: string;
  label: string;
  displayOrder: number;
  skills: { id: string; name: string }[];
}

export async function GET(): Promise<Response> {
  try {
    // Query all skill categories ordered by displayOrder (ascending)
    const { items: categoryItems } =
      await queryItems<SkillCategoryDynamoItem>({
        indexName: "GSI1",
        keyConditionExpression: "GSI1PK = :gsi1pk",
        expressionAttributeValues: {
          ":gsi1pk": Keys.skillCategory.gsi1pk(),
        },
        scanIndexForward: true,
      });

    // Query skills for all categories concurrently to avoid N+1 sequential latency
    const categorySkillResults = await Promise.all(
      categoryItems.map(async (category) => {
        const { items: skillItems } = await queryItems<SkillDynamoItem>({
          indexName: "GSI1",
          keyConditionExpression: "GSI1PK = :gsi1pk",
          expressionAttributeValues: {
            ":gsi1pk": Keys.skill.gsi1pk(category.id),
          },
          scanIndexForward: true,
        });
        return { category, skillItems };
      }),
    );

    // Filter out empty categories, preserve displayOrder sort
    const categoriesWithSkills: SkillCategoryWithSkills[] = categorySkillResults
      .filter(({ skillItems }) => skillItems.length > 0)
      .sort((a, b) => a.category.displayOrder - b.category.displayOrder)
      .map(({ category, skillItems }) => ({
        id: category.id,
        label: category.label,
        displayOrder: category.displayOrder,
        skills: skillItems.map((skill) => ({
          id: skill.id,
          name: skill.name,
        })),
      }));

    const response: ApiResponse<SkillCategoryWithSkills[]> = {
      success: true,
      data: categoriesWithSkills,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Failed to fetch skills:", error);

    const response: ApiResponse = {
      success: false,
      error: "Service temporarily unavailable",
    };

    return Response.json(response, { status: 503 });
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
  const parsed = createSkillRequestSchema.safeParse(body);
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

  const { name, categoryId } = parsed.data;

  try {
    // Verify the category exists
    const category = await getItem({
      PK: Keys.skillCategory.pk(categoryId),
      SK: Keys.skillCategory.sk(),
    });

    if (!category) {
      const response: ApiResponse = {
        success: false,
        error: "Category not found",
      };
      return Response.json(response, { status: 400 });
    }

    // Create the skill
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await putItem({
      PK: Keys.skill.pk(id),
      SK: Keys.skill.sk(),
      GSI1PK: Keys.skill.gsi1pk(categoryId),
      GSI1SK: Keys.skill.gsi1sk(name),
      type: "skill",
      id,
      name,
      categoryId,
      createdAt: now,
      updatedAt: now,
    });

    const response: ApiResponse<{ id: string; name: string; categoryId: string; createdAt: string; updatedAt: string }> = {
      success: true,
      data: { id, name, categoryId, createdAt: now, updatedAt: now },
    };
    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to create skill:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to create skill",
    };
    return Response.json(response, { status: 500 });
  }
}
