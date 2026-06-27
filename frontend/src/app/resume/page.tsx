/**
 * Web Resume page (/resume) — server component that fetches structured
 * resume content from DynamoDB and displays it in admin-defined section order.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import type { Metadata } from "next";
import { getItem, queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { WebResumeSection } from "@/types/entities";
import { Placeholder } from "@/components/shared";
import { ResumeDownloadButton } from "@/components/sections/ResumeDownloadButton";

// ─── SEO Metadata ───────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Structured web resume showcasing professional experience, education, skills, and certifications.",
};

// ─── DynamoDB Item Types ────────────────────────────────────────────────────

interface WebResumeItem extends DynamoDBItem {
  sections: WebResumeSection[];
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

// ─── Data Fetching ──────────────────────────────────────────────────────────

async function getWebResume(): Promise<WebResumeItem | null> {
  return getItem<WebResumeItem>({
    PK: Keys.webResume.pk(),
    SK: Keys.webResume.sk(),
  });
}

async function hasPreferredResume(): Promise<boolean> {
  const { items } = await queryItems<ResumeItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :pk",
    expressionAttributeValues: {
      ":pk": Keys.resume.gsi1pk(),
      ":preferred": true,
    },
    filterExpression: "isPreferred = :preferred",
  });

  return items.some((item) => item.isPreferred === true);
}

// ─── Section Rendering ──────────────────────────────────────────────────────

function ResumeSection({ section }: { section: WebResumeSection }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-lg">
      <h2 className="mb-md text-h4 font-semibold text-foreground">
        {section.title}
      </h2>
      <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground-muted">
        {section.content}
      </div>
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default async function ResumePage() {
  const [webResume, showDownload] = await Promise.all([
    getWebResume(),
    hasPreferredResume(),
  ]);

  const sections = webResume?.sections
    ? [...webResume.sections].sort((a, b) => a.order - b.order)
    : [];

  const hasContent = sections.length > 0;

  return (
    <main className="px-md py-3xl">
      <div className="mx-auto max-w-[56rem]">
        <h1 className="mb-2xl text-center text-foreground">Resume</h1>

        {showDownload && (
          <div className="mb-2xl flex justify-center">
            <ResumeDownloadButton />
          </div>
        )}

        {!hasContent ? (
          <Placeholder
            message="Resume content has not been configured yet."
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
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            }
          />
        ) : (
          <div className="flex flex-col gap-xl">
            {sections.map((section) => (
              <ResumeSection key={section.id} section={section} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
