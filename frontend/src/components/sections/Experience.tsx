/**
 * Experience section — timeline layout with category filters, location,
 * duration badges, and tech tags.
 *
 * Server Component that fetches data from DynamoDB + Client wrapper for filters.
 *
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5
 */

import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Experience } from "@/types/entities";
import { Placeholder, ScrollAnimation } from "@/components/shared";
import { ExperienceTimeline } from "./ExperienceTimeline";

/**
 * Maps a DynamoDB item to an Experience entity.
 */
function mapToExperience(item: DynamoDBItem): Experience {
  return {
    id: item.id as string,
    jobTitle: item.jobTitle as string,
    company: item.company as string,
    type: (item.experienceType as Experience["type"]) ?? "full-time",
    location: (item.location as string) ?? undefined,
    startDate: item.startDate as string,
    endDate: (item.endDate as string) ?? undefined,
    description: item.description as string,
    tags: (item.tags as string[]) ?? undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

export default async function ExperienceSection() {
  let experiences: Experience[] = [];

  try {
    const items = await queryAllItems({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.experience.gsi1pk(),
      },
      scanIndexForward: false,
    });

    experiences = items.map(mapToExperience);
  } catch (error) {
    console.error("Failed to fetch experience entries:", error);
  }

  return (
    <section
      id="experience"
      aria-labelledby="experience-heading"
      className="px-md py-3xl"
    >
      <div className="mx-auto max-w-[56rem]">
        <ScrollAnimation animation="fade-in">
          <div className="text-center mb-2xl">
            <h2
              id="experience-heading"
              className="text-[length:var(--font-size-h2)] font-bold text-primary mb-sm"
            >
              Experience
            </h2>
            <p className="text-foreground-muted text-lg">
              My professional journey, education, and career milestones
            </p>
          </div>
        </ScrollAnimation>

        {experiences.length === 0 ? (
          <Placeholder message="No experience entries yet." />
        ) : (
          <ExperienceTimeline experiences={experiences} />
        )}
      </div>
    </section>
  );
}
