/**
 * S3 client and asset management helpers.
 *
 * Provides presigned URL generation for direct uploads, public asset URL
 * construction for serving assets to visitors, and file deletion for cleanup.
 * Uses the same bucket structure convention:
 *   - projects/<project-id>/<image-id>.<ext>
 *   - resumes/<resume-id>.pdf
 */

import "server-only";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Client Initialization ─────────────────────────────────────────────────

const client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

export const s3Client = client;

export const BUCKET_NAME = process.env.S3_BUCKET_NAME ?? "portfolio-assets";

/**
 * Base URL for publicly accessible assets.
 * Falls back to the standard S3 URL pattern if S3_PUBLIC_URL is not set.
 */
export const PUBLIC_URL =
  process.env.S3_PUBLIC_URL ??
  `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION ?? "us-east-1"}.amazonaws.com`;

// ─── Constants ──────────────────────────────────────────────────────────────

/** Presigned URL expiry time in seconds (1 hour). */
export const PRESIGNED_URL_EXPIRY = 3600;

// ─── S3 Key Helpers ─────────────────────────────────────────────────────────

/**
 * Generate an S3 key for a project image.
 */
export function projectImageKey(projectId: string, imageId: string, ext: string): string {
  return `projects/${projectId}/${imageId}.${ext}`;
}

/**
 * Generate an S3 key for a resume PDF.
 */
export function resumeKey(resumeId: string): string {
  return `resumes/${resumeId}.pdf`;
}

/**
 * Generate an S3 key for a certification badge image.
 */
export function certificationBadgeKey(certId: string, ext: string): string {
  return `certifications/${certId}.${ext}`;
}

// ─── Presigned URL Generation ───────────────────────────────────────────────

/**
 * Generate a presigned URL for uploading a file to S3.
 * The URL expires after 1 hour (3600 seconds).
 *
 * @param s3Key - The S3 object key (path) for the upload
 * @param contentType - The MIME type of the file being uploaded
 * @returns A presigned PUT URL for direct upload
 */
export async function generateUploadUrl(
  s3Key: string,
  contentType: string,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });
}

/**
 * Generate a presigned URL for downloading a file from S3.
 * The URL expires after 1 hour (3600 seconds).
 *
 * @param s3Key - The S3 object key to generate a download URL for
 * @returns A presigned GET URL for download
 */
export async function generateDownloadUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  return getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });
}

// ─── Public Asset URL ───────────────────────────────────────────────────────

/**
 * Construct the public URL for an asset stored in S3.
 * Used when serving images and files to public visitors.
 *
 * @param s3Key - The S3 object key
 * @returns The publicly accessible URL for the asset
 */
export function getAssetUrl(s3Key: string): string {
  return `${PUBLIC_URL}/${s3Key}`;
}

// ─── File Deletion ──────────────────────────────────────────────────────────

/**
 * Delete a file from S3.
 * Used for cleanup when projects or resumes are deleted.
 *
 * @param s3Key - The S3 object key to delete
 */
export async function deleteFile(s3Key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    }),
  );
}

/**
 * Delete multiple files from S3.
 * Used for bulk cleanup (e.g., deleting all images when a project is removed).
 *
 * @param s3Keys - Array of S3 object keys to delete
 */
export async function deleteFiles(s3Keys: string[]): Promise<void> {
  await Promise.all(s3Keys.map((key) => deleteFile(key)));
}
