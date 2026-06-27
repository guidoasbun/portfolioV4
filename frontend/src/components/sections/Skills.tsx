/**
 * Skills section — server component that fetches skill categories
 * and their associated skills directly from DynamoDB.
 *
 * Categories are displayed in admin-defined displayOrder (ascending).
 * Empty categories (with no skills) are filtered out.
 * If no skills exist at all, a placeholder message is shown.
 */

import { queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { Placeholder } from "@/components/shared";
import { ScrollAnimation } from "@/components/shared";

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

async function fetchSkillsGroupedByCategory(): Promise<SkillCategoryWithSkills[]> {
  // 1. Query all skill categories ordered by displayOrder (ascending)
  const { items: categoryItems } = await queryItems<SkillCategoryDynamoItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :gsi1pk",
    expressionAttributeValues: {
      ":gsi1pk": Keys.skillCategory.gsi1pk(),
    },
    scanIndexForward: true,
  });

  // 2. For each category, query its skills concurrently
  const categorySkillResults = await Promise.all(
    categoryItems.map(async (category) => {
      const { items: skillItems } = await queryItems<SkillDynamoItem>({
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

  // 3. Filter out empty categories and sort by displayOrder
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

export async function Skills() {
  let categories: SkillCategoryWithSkills[] = [];

  try {
    categories = await fetchSkillsGroupedByCategory();
  } catch (error) {
    console.error("Failed to fetch skills:", error);
  }

  const hasSkills = categories.length > 0;

  return (
    <section
      id="skills"
      aria-labelledby="skills-heading"
      className="px-md py-3xl"
    >
      <div className="mx-auto max-w-[64rem]">
        <ScrollAnimation animation="fade-in">
          <h2
            id="skills-heading"
            className="mb-xl text-center text-foreground"
          >
            Skills
          </h2>
        </ScrollAnimation>

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
