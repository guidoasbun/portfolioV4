import { queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Experience } from "@/types/entities";
import type { ApiResponse } from "@/types/api";

/**
 * Maps a DynamoDB item to an Experience entity.
 */
function mapToExperience(item: DynamoDBItem): Experience {
  return {
    id: item.id as string,
    jobTitle: item.jobTitle as string,
    company: item.company as string,
    startDate: item.startDate as string,
    endDate: (item.endDate as string) ?? undefined,
    description: item.description as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

/**
 * GET /api/experience
 *
 * Returns all experience entries sorted by start date in descending order
 * (most recent first / reverse chronological).
 */
export async function GET(): Promise<Response> {
  try {
    const { items } = await queryItems({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.experience.gsi1pk(),
      },
      scanIndexForward: false,
    });

    const experiences: Experience[] = items.map(mapToExperience);

    const response: ApiResponse<Experience[]> = {
      success: true,
      data: experiences,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Failed to fetch experience entries:", error);

    const response: ApiResponse = {
      success: false,
      error: "Service temporarily unavailable",
    };

    return Response.json(response, { status: 503 });
  }
}
