/**
 * Admin Resume management page.
 *
 * Allows the admin to upload, list, set preferred, and delete resumes.
 * Implements deletion guards for preferred resumes.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { ResumeManager } from "./ResumeManager";
import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import type { Resume } from "@/types/entities";

interface ResumeDynamoItem extends DynamoDBItem {
  id: string;
  filename: string;
  s3Key: string;
  fileSize: number;
  isPreferred: boolean;
  uploadedAt: string;
}

async function getResumes(): Promise<Resume[]> {
  try {
    const items = await queryAllItems<ResumeDynamoItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.resume.gsi1pk(),
      },
      scanIndexForward: false,
    });

    return items.map((item) => ({
      id: item.id,
      filename: item.filename,
      s3Key: item.s3Key,
      fileSize: item.fileSize,
      isPreferred: item.isPreferred,
      uploadedAt: item.uploadedAt,
    }));
  } catch {
    return [];
  }
}

export default async function AdminResumesPage() {
  const resumes = await getResumes();

  return (
    <div>
      <div className="mb-[var(--spacing-xl)]">
        <h1 className="text-2xl font-bold text-foreground">Resumes</h1>
        <p className="text-foreground-muted mt-[var(--spacing-xs)]">
          Upload and manage resume PDFs. The preferred resume is available for download on
          the public site.
        </p>
      </div>

      <ResumeManager initialResumes={resumes} />
    </div>
  );
}
