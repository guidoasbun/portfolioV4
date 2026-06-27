/**
 * GET /api/skills
 *
 * Returns all skills grouped by category in display order.
 * Empty categories (categories with zero skills) are filtered out.
 */

import { queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { ApiResponse } from "@/types/api";

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

    // For each category, query its skills
    const categoriesWithSkills: SkillCategoryWithSkills[] = [];

    for (const category of categoryItems) {
      const { items: skillItems } = await queryItems<SkillDynamoItem>({
        indexName: "GSI1",
        keyConditionExpression: "GSI1PK = :gsi1pk",
        expressionAttributeValues: {
          ":gsi1pk": Keys.skill.gsi1pk(category.id),
        },
        scanIndexForward: true,
      });

      // Filter out empty categories
      if (skillItems.length === 0) {
        continue;
      }

      categoriesWithSkills.push({
        id: category.id,
        label: category.label,
        displayOrder: category.displayOrder,
        skills: skillItems.map((skill) => ({
          id: skill.id,
          name: skill.name,
        })),
      });
    }

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
