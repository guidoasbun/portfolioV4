/**
 * GET /api/about
 *
 * Returns the about content (personal description + professional pitch).
 * Returns { success: true, data: null } if no about content has been configured.
 */

import { getItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";

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
