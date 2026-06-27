/**
 * Experience section - displays work experience in a timeline layout.
 * Server Component that fetches data directly from DynamoDB.
 *
 * Validates: Requirements 6.1, 6.2, 6.4, 6.5
 */

import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Experience } from "@/types/entities";
import { Placeholder, ScrollAnimation } from "@/components/shared";
import { formatDateRange } from "./experience-utils";

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
      className="px-[var(--spacing-md)] py-[var(--spacing-3xl)]"
    >
      <div className="mx-auto max-w-[56rem]">
        <ScrollAnimation animation="fade-in">
          <h2 className="mb-[var(--spacing-2xl)] text-center text-[var(--font-size-h2)] font-bold leading-[var(--line-height-tight)] text-foreground">
            Experience
          </h2>
        </ScrollAnimation>

        {experiences.length === 0 ? (
          <Placeholder message="No experience entries yet." />
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div
              className="absolute left-4 top-0 bottom-0 w-0.5 bg-border md:left-1/2 md:-translate-x-1/2"
              aria-hidden="true"
            />

            <div className="flex flex-col gap-[var(--spacing-xl)]">
              {experiences.map((entry, index) => (
                <ScrollAnimation
                  key={entry.id}
                  animation="slide-up"
                  duration={400}
                >
                  <div
                    className={`relative flex flex-col pl-12 md:w-1/2 ${
                      index % 2 === 0
                        ? "md:pl-0 md:pr-8 md:self-start md:text-right"
                        : "md:pl-8 md:self-end"
                    }`}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute top-1 h-3 w-3 rounded-full bg-primary left-[13px] ${
                        index % 2 === 0
                          ? "md:left-auto md:right-[-6px]"
                          : "md:left-[-6px] md:right-auto"
                      }`}
                      aria-hidden="true"
                    />

                    <h3 className="text-[var(--font-size-h5)] font-semibold text-foreground">
                      {entry.jobTitle}
                    </h3>
                    <p className="text-[var(--font-size-base)] font-medium text-primary">
                      {entry.company}
                    </p>
                    <p className="mt-[var(--spacing-xs)] text-[var(--font-size-sm)] text-foreground-muted">
                      {formatDateRange(entry.startDate, entry.endDate)}
                    </p>
                    <p className="mt-[var(--spacing-sm)] text-[var(--font-size-base)] leading-[var(--line-height-normal)] text-foreground-muted">
                      {entry.description}
                    </p>
                  </div>
                </ScrollAnimation>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
