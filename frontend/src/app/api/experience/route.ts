import { queryItems, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Experience } from "@/types/entities";
import type { ApiResponse } from "@/types/api";
import { createExperienceRequestSchema } from "@/types/schemas";
import { validateRequest } from "@/lib/auth";

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

/**
 * POST /api/experience
 *
 * Creates a new experience entry. Requires authentication.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Verify authentication
    const authResult = await validateRequest(request);
    if (!authResult.valid) {
      const response: ApiResponse = { success: false, error: "Unauthorized" };
      return Response.json(response, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = createExperienceRequestSchema.safeParse(body);

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

    const { jobTitle, company, startDate, endDate, description } = parseResult.data;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Save to DynamoDB
    await putItem({
      PK: Keys.experience.pk(id),
      SK: Keys.experience.sk(),
      GSI1PK: Keys.experience.gsi1pk(),
      GSI1SK: Keys.experience.gsi1sk(startDate),
      type: "experience",
      id,
      jobTitle,
      company,
      startDate,
      endDate,
      description,
      createdAt: now,
      updatedAt: now,
    });

    const experience: Experience = {
      id,
      jobTitle,
      company,
      startDate,
      endDate,
      description,
      createdAt: now,
      updatedAt: now,
    };

    const response: ApiResponse<Experience> = {
      success: true,
      data: experience,
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to create experience entry:", error);

    const response: ApiResponse = {
      success: false,
      error: "Failed to create experience entry",
    };

    return Response.json(response, { status: 500 });
  }
}
