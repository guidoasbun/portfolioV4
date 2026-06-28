"use client";

/**
 * Client component for resume management — upload, list, set preferred, delete.
 *
 * Handles:
 * - File upload with PDF-only and ≤10MB validation
 * - Presigned URL upload flow
 * - Set preferred action
 * - Delete with confirmation and preferred resume guard (409 handling)
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Resume } from "@/types/entities";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ResumeManagementClientProps {
  initialResumes: Resume[];
}

export function ResumeManagementClient({ initialResumes }: ResumeManagementClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resumes, setResumes] = useState<Resume[]>(initialResumes);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [settingPreferredId, setSettingPreferredId] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setActionError(null);
    setActionSuccess(null);
  }, []);

  // ─── Upload Flow ────────────────────────────────────────────────────────────

  const handleUploadClick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so the same file can be selected again
    e.target.value = "";

    // Client-side validation
    if (file.type !== "application/pdf") {
      setUploadError("File must be in PDF format.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size must not exceed 10MB.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    clearMessages();

    try {
      // Step 1: Get presigned upload URL
      const uploadResponse = await fetch("/api/resumes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.success) {
        const errorMsg =
          uploadData.error ??
          Object.values(uploadData.errors ?? {}).join(", ") ??
          "Failed to initiate upload.";
        setUploadError(errorMsg);
        setIsUploading(false);
        return;
      }

      const { uploadUrl, resumeId } = uploadData.data;

      // Step 2: Upload file directly to S3 via presigned URL
      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!s3Response.ok) {
        setUploadError("Upload failed. Please try again.");
        setIsUploading(false);
        return;
      }

      // Step 3: Add to local state and refresh
      const newResume: Resume = {
        id: resumeId,
        filename: file.name,
        s3Key: `resumes/${resumeId}.pdf`,
        fileSize: file.size,
        isPreferred: false,
        uploadedAt: new Date().toISOString(),
      };

      setResumes((prev) => [newResume, ...prev]);
      setActionSuccess(`"${file.name}" uploaded successfully.`);
      router.refresh();
    } catch {
      setUploadError("An error occurred while uploading. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Set Preferred ──────────────────────────────────────────────────────────

  const handleSetPreferred = async (resumeId: string) => {
    clearMessages();
    setSettingPreferredId(resumeId);

    try {
      const response = await fetch(`/api/resumes/${resumeId}/preferred`, {
        method: "PUT",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResumes((prev) =>
          prev.map((r) => ({
            ...r,
            isPreferred: r.id === resumeId,
          })),
        );
        setActionSuccess("Preferred resume updated.");
        router.refresh();
      } else {
        setActionError(data.error ?? "Failed to set preferred resume.");
      }
    } catch {
      setActionError("An error occurred. Please try again.");
    } finally {
      setSettingPreferredId(null);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteRequest = (resumeId: string) => {
    clearMessages();
    setConfirmDeleteId(resumeId);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;

    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/resumes/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResumes((prev) => prev.filter((r) => r.id !== id));
        setActionSuccess("Resume deleted.");
        router.refresh();
      } else if (response.status === 409) {
        // Preferred resume deletion guard
        setActionError(
          data.error ??
            "Cannot delete the preferred resume. Please set another resume as preferred first.",
        );
      } else {
        setActionError(data.error ?? "Failed to delete resume.");
      }
    } catch {
      setActionError("An error occurred. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-[var(--spacing-lg)]">
      {/* Upload section */}
      <div className="flex items-center gap-[var(--spacing-md)]">
        <Button onClick={handleUploadClick} disabled={isUploading}>
          {isUploading ? "Uploading…" : "Upload Resume"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload resume PDF"
        />
        <span className="text-sm text-foreground-muted">PDF only, max 10MB</span>
      </div>

      {/* Upload validation error */}
      {uploadError && (
        <p role="alert" className="text-sm text-error">
          {uploadError}
        </p>
      )}

      {/* Action messages */}
      {actionError && (
        <p role="alert" className="text-sm text-error">
          {actionError}
        </p>
      )}
      {actionSuccess && (
        <p role="status" className="text-sm text-green-600">
          {actionSuccess}
        </p>
      )}

      {/* Delete confirmation dialog */}
      {confirmDeleteId && (
        <Card hoverable={false} className="border-error">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="flex gap-[var(--spacing-sm)] ml-[var(--spacing-md)]">
              <Button variant="ghost" size="sm" onClick={handleDeleteCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                className="bg-error hover:bg-error/90"
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Resume list */}
      {resumes.length === 0 ? (
        <Card hoverable={false}>
          <p className="text-foreground-muted text-center py-[var(--spacing-lg)]">
            No resumes uploaded yet. Upload your first PDF resume above.
          </p>
        </Card>
      ) : (
        <div className="space-y-[var(--spacing-sm)]">
          {resumes.map((resume) => (
            <Card key={resume.id} hoverable={false}>
              <div className="flex items-center justify-between gap-[var(--spacing-md)]">
                <div className="flex items-center gap-[var(--spacing-md)] min-w-0">
                  {/* Preferred indicator */}
                  {resume.isPreferred && (
                    <span
                      className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      title="Preferred resume"
                    >
                      ⭐ Preferred
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {resume.filename}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {formatFileSize(resume.fileSize)} · Uploaded {formatDate(resume.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-[var(--spacing-sm)] shrink-0">
                  {!resume.isPreferred && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPreferred(resume.id)}
                      disabled={settingPreferredId === resume.id}
                    >
                      {settingPreferredId === resume.id ? "Setting…" : "Set Preferred"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRequest(resume.id)}
                    disabled={deletingId === resume.id}
                    className="text-error hover:text-error hover:bg-error/10"
                  >
                    {deletingId === resume.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
