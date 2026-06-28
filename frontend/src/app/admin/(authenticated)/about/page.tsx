/**
 * Admin About content editor page.
 *
 * Allows the admin to edit the personal description and professional pitch
 * displayed in the public About section.
 *
 * Validates: Requirements 10.10
 */

import { AboutEditor } from "./AboutEditor";
import { getItem, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";

interface AboutItem extends DynamoDBItem {
  personalDescription: string;
  professionalPitch: string;
  updatedAt: string;
}

async function getAboutContent() {
  try {
    const item = await getItem<AboutItem>({
      PK: Keys.about.pk(),
      SK: Keys.about.sk(),
    });
    if (!item) return null;
    return {
      personalDescription: item.personalDescription,
      professionalPitch: item.professionalPitch,
    };
  } catch {
    return null;
  }
}

export default async function AdminAboutPage() {
  const about = await getAboutContent();

  return (
    <div>
      <div className="mb-[var(--spacing-xl)]">
        <h1 className="text-2xl font-bold text-foreground">About</h1>
        <p className="text-foreground-muted mt-[var(--spacing-xs)]">
          Edit the content displayed in the public About section.
        </p>
      </div>

      <AboutEditor
        initialPersonalDescription={about?.personalDescription ?? ""}
        initialProfessionalPitch={about?.professionalPitch ?? ""}
      />
    </div>
  );
}
