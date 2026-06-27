/**
 * About section — server component that fetches about content and
 * displays the personal description, professional pitch, and resume download.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6
 */

import { getItem, queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { Placeholder } from "@/components/shared";
import { ScrollAnimation } from "@/components/shared";
import { ResumeDownloadButton } from "./ResumeDownloadButton";

interface AboutItem extends DynamoDBItem {
  personalDescription: string;
  professionalPitch: string;
  updatedAt: string;
}

interface ResumeItem extends DynamoDBItem {
  id: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  isPreferred: boolean;
  uploadedAt: string;
}

async function getAboutContent(): Promise<AboutItem | null> {
  return getItem<AboutItem>({
    PK: Keys.about.pk(),
    SK: Keys.about.sk(),
  });
}

async function getPreferredResume(): Promise<ResumeItem | null> {
  const items = await queryAllItems<ResumeItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :pk",
    expressionAttributeValues: {
      ":pk": Keys.resume.gsi1pk(),
      ":preferred": true,
    },
    filterExpression: "isPreferred = :preferred",
  });

  return items.find((item) => item.isPreferred === true) ?? null;
}

export default async function About() {
  let aboutContent: AboutItem | null = null;
  let preferredResume: ResumeItem | null = null;

  try {
    [aboutContent, preferredResume] = await Promise.all([
      getAboutContent(),
      getPreferredResume(),
    ]);
  } catch (error) {
    console.error("Failed to fetch about content:", error);
  }

  const hasContent =
    aboutContent &&
    (aboutContent.personalDescription || aboutContent.professionalPitch);

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="px-md py-3xl"
    >
      <div className="mx-auto max-w-[56rem]">
        <ScrollAnimation animation="fade-in">
          <h2
            id="about-heading"
            className="mb-xl text-center text-foreground"
          >
            About Me
          </h2>
        </ScrollAnimation>

        {!hasContent ? (
          <Placeholder
            message="About content has not been configured yet."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            }
          />
        ) : (
          <div className="flex flex-col gap-xl">
            {aboutContent!.personalDescription && (
              <ScrollAnimation animation="slide-up">
                <div className="rounded-lg border border-border bg-surface p-lg">
                  <h3 className="mb-sm text-foreground">
                    Who I Am
                  </h3>
                  <p className="text-lg leading-relaxed text-foreground-muted">
                    {aboutContent!.personalDescription}
                  </p>
                </div>
              </ScrollAnimation>
            )}

            {aboutContent!.professionalPitch && (
              <ScrollAnimation animation="slide-up">
                <div className="rounded-lg border border-border bg-surface p-lg">
                  <h3 className="mb-sm text-foreground">
                    What I Do
                  </h3>
                  <p className="text-lg leading-relaxed text-foreground-muted">
                    {aboutContent!.professionalPitch}
                  </p>
                </div>
              </ScrollAnimation>
            )}

            {preferredResume && (
              <ScrollAnimation animation="fade-in">
                <div className="flex justify-center pt-md">
                  <ResumeDownloadButton />
                </div>
              </ScrollAnimation>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
