/**
 * Skills & Technologies section — server component that fetches certifications
 * and skill categories with their associated skills from DynamoDB.
 *
 * Certifications are shown at the top as clickable cards linking to verification.
 * Skills are displayed grouped by category in admin-defined order below.
 * Empty categories (with no skills) are filtered out.
 */

import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl } from "@/lib/s3";
import { Placeholder } from "@/components/shared";
import { ScrollAnimation } from "@/components/shared";
import type { Certification } from "@/types/entities";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SkillCategoryDynamoItem extends DynamoDBItem {
  id: string;
  label: string;
  displayOrder: number;
}

interface SkillDynamoItem extends DynamoDBItem {
  id: string;
  name: string;
  categoryId: string;
}

interface SkillCategoryWithSkills {
  id: string;
  label: string;
  displayOrder: number;
  skills: { id: string; name: string }[];
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function fetchCertifications(): Promise<Certification[]> {
  const items = await queryAllItems({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :pk",
    expressionAttributeValues: {
      ":pk": Keys.certification.gsi1pk(),
    },
    scanIndexForward: true,
  });

  return items.map((item) => {
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
  });
}

async function fetchSkillsGroupedByCategory(): Promise<SkillCategoryWithSkills[]> {
  const categoryItems = await queryAllItems<SkillCategoryDynamoItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :gsi1pk",
    expressionAttributeValues: {
      ":gsi1pk": Keys.skillCategory.gsi1pk(),
    },
    scanIndexForward: true,
  });

  const categorySkillResults = await Promise.all(
    categoryItems.map(async (category) => {
      const skillItems = await queryAllItems<SkillDynamoItem>({
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

  return categorySkillResults
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
}

// ─── Component ──────────────────────────────────────────────────────────────

export async function Skills() {
  let categories: SkillCategoryWithSkills[] = [];
  let certifications: Certification[] = [];

  try {
    [categories, certifications] = await Promise.all([
      fetchSkillsGroupedByCategory(),
      fetchCertifications(),
    ]);
  } catch (error) {
    console.error("Failed to fetch skills/certifications:", error);
  }

  const hasSkills = categories.length > 0;
  const hasCertifications = certifications.length > 0;

  return (
    <section
      id="skills"
      aria-labelledby="skills-heading"
      className="px-md py-3xl"
    >
      <div className="mx-auto max-w-[64rem]">
        <ScrollAnimation animation="fade-in">
          <div className="text-center mb-2xl">
            <h2
              id="skills-heading"
              className="text-[length:var(--font-size-h2)] font-bold text-primary mb-sm"
            >
              Skills &amp; Technologies
            </h2>
            <p className="text-foreground-muted text-lg">
              Technologies and tools I work with to build modern web applications
            </p>
          </div>
        </ScrollAnimation>

        {/* Certifications */}
        {hasCertifications && (
          <ScrollAnimation animation="slide-up">
            <div className="mb-2xl">
              <div className="flex flex-wrap items-center justify-center gap-lg">
                {certifications.map((cert) => (
                  <a
                    key={cert.id}
                    href={cert.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-md rounded-xl border border-border bg-surface p-md pr-lg hover:shadow-md hover:border-primary/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                    aria-label={`Verify ${cert.name} credential from ${cert.issuer}`}
                  >
                    {/* Badge image */}
                    {cert.badgeUrl ? (
                      <img
                        src={cert.badgeUrl}
                        alt={`${cert.name} badge`}
                        className="w-16 h-16 object-contain shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-8 text-primary" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
                        </svg>
                      </div>
                    )}

                    {/* Certification info */}
                    <div className="min-w-0">
                      <p className="text-sm text-foreground-muted">{cert.issuer}</p>
                      <p className="font-semibold text-foreground">{cert.name}</p>
                      <p className="text-sm text-primary group-hover:underline inline-flex items-center gap-xs">
                        Verify credential
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3.5" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </ScrollAnimation>
        )}

        {/* Skills Grid */}
        {!hasSkills ? (
          <Placeholder message="No skills have been added yet." />
        ) : (
          <div className="grid gap-xl sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <ScrollAnimation
                key={category.id}
                animation="slide-up"
              >
                <div className="rounded-lg border border-border bg-surface p-lg">
                  <h3 className="mb-md text-h5 font-semibold text-foreground">
                    {category.label}
                  </h3>
                  <ul className="flex flex-wrap gap-sm">
                    {category.skills.map((skill) => (
                      <li
                        key={skill.id}
                        className="rounded-md bg-surface-elevated px-sm py-xs text-sm text-foreground-muted"
                      >
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollAnimation>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
