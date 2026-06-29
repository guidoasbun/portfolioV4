/**
 * GET /api/certifications - List all certifications ordered by displayOrder.
 * POST /api/certifications - Create a new certification (admin).
 */

import { queryAllItems, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl } from "@/lib/s3";
import { createCertificationRequestSchema } from "@/types/schemas";
import type { Certification } from "@/types/entities";
import type { ApiResponse } from "@/types/api";
import { validateRequest } from "@/lib/auth";
import { revalidateHomePage } from "@/lib/revalidate";

function mapToCertification(item: DynamoDBItem): Certification {
  const badgeS3Key = item.badgeS3Key as string | undefined;
  return {
    id: item.id as string,
    issuer: item.issuer as string,
    name: item.name as string,
    verificationUrl: item.verificationUrl as string,
    badgeS3Key,
    badgeUrl: badgeS3Key ? getAssetUrl(badgeS3Key) : undefined,
    displayOrder: item.displayOrder as number,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

export async function GET(): Promise<Response> {
  try {
    const items = await queryAllItems({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.certification.gsi1pk(),
      },
      scanIndexForward: true,
    });

    const certifications: Certification[] = items.map(mapToCertification);

    const response: ApiResponse<Certification[]> = {
      success: true,
      data: certifications,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Failed to fetch certifications:", error);
    return Response.json(
      { success: false, error: "Service temporarily unavailable" } satisfies ApiResponse,
      { status: 503 },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const authResult = await validateRequest(request);
    if (!authResult.valid) {
      return Response.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse,
        { status: 401 },
      );
    }

    const body = await request.json();
    const parseResult = createCertificationRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) errors[field] = issue.message;
      }
      return Response.json(
        { success: false, error: "Invalid request body", errors } satisfies ApiResponse,
        { status: 400 },
      );
    }

    const { issuer, name, verificationUrl, displayOrder } = parseResult.data;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await putItem({
      PK: Keys.certification.pk(id),
      SK: Keys.certification.sk(),
      GSI1PK: Keys.certification.gsi1pk(),
      GSI1SK: Keys.certification.gsi1sk(displayOrder),
      type: "certification",
      id,
      issuer,
      name,
      verificationUrl,
      displayOrder,
      createdAt: now,
      updatedAt: now,
    });

    const certification: Certification = {
      id,
      issuer,
      name,
      verificationUrl,
      displayOrder,
      createdAt: now,
      updatedAt: now,
    };

    revalidateHomePage();

    const response: ApiResponse<Certification> = {
      success: true,
      data: certification,
    };

    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to create certification:", error);
    return Response.json(
      { success: false, error: "Failed to create certification" } satisfies ApiResponse,
      { status: 500 },
    );
  }
}
