/**
 * GET /api/about - Returns the about content (personal description + professional pitch).
 * PUT /api/about - Update about content (admin).
 */

import type { NextRequest } from "next/server";
import { getItem, putItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { updateAboutRequestSchema } from "@/types/schemas";
import type { ApiResponse } from "@/types/api";
import type { About } from "@/types/entities";

interface AboutItem extends DynamoDBItem {
  personalDescription: string;
  professionalPitch: string;
  updatedAt: string;
}

export async function GET() {
  try {
    const item = await getItem<AboutItem>({
      PK: Keys.about.pk(),
      SK: Keys.about.sk(),
    });

    if (!item) {
      return Response.json({ success: true, data: null });
    }

    return Response.json({
      success: true,
      data: {
        personalDescription: item.personalDescription,
        professionalPitch: item.professionalPitch,
        updatedAt: item.updatedAt,
      },
    });
  } catch (error) {
    console.error("Failed to fetch about content:", error);
    return Response.json(
      { success: false, error: "Failed to fetch about content" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    const parseResult = updateAboutRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path.join(".");
        errors[field] = issue.message;
      }
      const response: ApiResponse = { success: false, errors };
      return Response.json(response, { status: 400 });
    }

    const { personalDescription, professionalPitch } = parseResult.data;

    // Get existing content to merge with updates
    const existing = await getItem<AboutItem>({
      PK: Keys.about.pk(),
      SK: Keys.about.sk(),
    });

    const now = new Date().toISOString();

    const updatedItem: AboutItem = {
      PK: Keys.about.pk(),
      SK: Keys.about.sk(),
      type: "about",
      personalDescription:
        personalDescription ?? existing?.personalDescription ?? "",
      professionalPitch:
        professionalPitch ?? existing?.professionalPitch ?? "",
      updatedAt: now,
    };

    await putItem(updatedItem);

    const data: About = {
      personalDescription: updatedItem.personalDescription,
      professionalPitch: updatedItem.professionalPitch,
      updatedAt: updatedItem.updatedAt,
    };

    const response: ApiResponse<About> = { success: true, data };
    return Response.json(response);
  } catch (error) {
    console.error("Failed to update about content:", error);
    return Response.json(
      { success: false, error: "Failed to update about content" },
      { status: 500 },
    );
  }
}
