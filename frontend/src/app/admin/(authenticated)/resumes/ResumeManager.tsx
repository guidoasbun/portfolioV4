"use client";

/**
 * Resume management client component.
 *
 * Handles upload (with client-side PDF/size validation), listing,
 * set preferred, and delete with preferred-resume guards.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Resume } from "@/types/entities";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ResumeManagerProps {
  initialResumes: Resume[];
}

export function ResumeManager({ initialResumes }: ResumeManagerProps) {
  const [resumes, setResumes] = useState<Resume[]>(initialResumes);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPreferredId, setSettingPreferredId] = useState<string | null>(null);
  const [showPreferredPrompt, setShowPreferredPrompt] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearMessages = () => {
    setUploadError(null);
    setActionError(null);
    setActionSuccess(null);
  };

  // --- Upload ---
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    e.target.value = "";

    clearMessages();

    // Client-side validation: PDF only (Req 3.7)
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }

    // Client-side validation: ≤10MB (Req 3.7)
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("File size must not exceed 10MB.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Step 1: Get presigned upload URL
      const uploadRes = await fetch("/api/resumes/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
        }),
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        const errorMsg =
          uploadData.error ??
          Object.values(uploadData.errors ?? {}).join(", ") ??
          "Upload failed.";
        setUploadError(errorMsg as string);
        return;
      }

      const { uploadUrl, resumeId } = uploadData.data;

      // Step 2: Upload file directly to S3
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!s3Res.ok) {
        setUploadError("Failed to upload file. Please try again.");
        return;
      }

      // Step 3: Add the new resume to local state
      const newResume: Resume = {
        id: resumeId,
        filename: file.name,
        s3Key: "", // Not needed client-side
        fileSize: file.size,
        isPreferred: false,
        uploadedAt: new Date().toISOString(),
      };

      setResumes((prev) => [newResume, ...prev]);
      setActionSuccess(`"${file.name}" uploaded successfully.`);
    } catch {
      // Req 3.8: Show error if upload fails, preserve form data
      setUploadError("An error occurred during upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // --- Set Preferred (Req 3.3) ---
  const handleSetPreferred = async (id: string) => {
    clearMessages();
    setSettingPreferredId(id);

    try {
      const res = await fetch(`/api/resumes/${id}/preferred`, {
        method: "PUT",
      });

      const data = await res.json();

      if (data.success) {
        setResumes((prev) =>
          prev.map((r) => ({
            ...r,
            isPreferred: r.id === id,
          })),
        );
        setActionSuccess("Preferred resume updated.");
      } else {
        setActionError(data.error ?? "Failed to set preferred resume.");
      }
    } catch {
      setActionError("An unexpected error occurred.");
    } finally {
      setSettingPreferredId(null);
    }
  };

  // --- Delete (Req 3.4, 3.5, 3.6) ---
  const handleDeleteClick = (id: string) => {
    clearMessages();

    const resume = resumes.find((r) => r.id === id);
    if (!resume) return;

    // Guard: If it's the only resume and it's preferred → prevent (Req 3.6)
    if (resume.isPreferred && resumes.length === 1) {
      setActionError("Cannot delete the only preferred resume. At least one preferred resume must exist.");
      return;
    }

    // Guard: If it's the preferred resume and others exist → prompt (Req 3.5)
    if (resume.isPreferred && resumes.length > 1) {
      setPendingDeleteId(id);
      setShowPreferredPrompt(true);
      return;
    }

    // Normal delete
    performDelete(id);
  };

  const performDelete = async (id: string) => {
    setDeletingId(id);

    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setResumes((prev) => prev.filter((r) => r.id !== id));
        setActionSuccess("Resume deleted.");
      } else {
        setActionError(data.error ?? "Failed to delete resume.");
      }
    } catch {
      setActionError("An unexpected error occurred.");
    } finally {
      setDeletingId(null);
      setShowPreferredPrompt(false);
      setPendingDeleteId(null);
    }
  };

  const handlePreferredPromptSelect = async (newPreferredId: string) => {
    // First set the new preferred, then delete the old one
    clearMessages();
    setSettingPreferredId(newPreferredId);

    try {
      const res = await fetch(`/api/resumes/${newPreferredId}/preferred`, {
        method: "PUT",
      });

      const data = await res.json();

      if (data.success) {
        setResumes((prev) =>
          prev.map((r) => ({
            ...r,
            isPreferred: r.id === newPreferredId,
          })),
        );
        // Now delete the pending resume
        if (pendingDeleteId) {
          await performDelete(pendingDeleteId);
        }
      } else {
        setActionError(data.error ?? "Failed to set new preferred resume.");
        setShowPreferredPrompt(false);
        setPendingDeleteId(null);
      }
    } catch {
      setActionError("An unexpected error occurred.");
      setShowPreferredPrompt(false);
      setPendingDeleteId(null);
    } finally {
      setSettingPreferredId(null);
    }
  };

  const handleCancelPrompt = () => {
    setShowPreferredPrompt(false);
    setPendingDeleteId(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-full max-w-[48rem] space-y-6">
      {/* Upload section */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Upload resume PDF"
        />
        <Button onClick={handleUploadClick} disabled={uploading}>
          {uploading ? "Uploading…" : "Upload Resume"}
        </Button>
        <p className="text-sm text-foreground-muted mt-[var(--spacing-xs)]">
          PDF only, maximum 10MB.
        </p>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div
          role="alert"
          className="rounded-md bg-error/10 px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-error"
        >
          {uploadError}
        </div>
      )}

      {/* Action feedback */}
      {actionError && (
        <div
          role="alert"
          className="rounded-md bg-error/10 px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-error"
        >
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div
          role="status"
          className="rounded-md bg-success/10 px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm text-success"
        >
          {actionSuccess}
        </div>
      )}

      {/* Preferred resume deletion prompt (Req 3.5) */}
      {showPreferredPrompt && (
        <Card hoverable={false} className="border-warning">
          <div className="space-y-[var(--spacing-md)]">
            <p className="font-medium text-foreground">
              Select a new preferred resume
            </p>
            <p className="text-sm text-foreground-muted">
              You are deleting the currently preferred resume. Please select another resume
              to set as preferred before proceeding.
            </p>
            <div className="space-y-[var(--spacing-sm)]">
              {resumes
                .filter((r) => r.id !== pendingDeleteId)
                .map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handlePreferredPromptSelect(r.id)}
                    disabled={settingPreferredId === r.id}
                    className={[
                      "w-full text-left px-[var(--spacing-md)] py-[var(--spacing-sm)]",
                      "rounded-md border border-border",
                      "hover:bg-surface-elevated transition-colors duration-200",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {r.filename}
                    </span>
                    <span className="text-xs text-foreground-muted ml-2">
                      ({formatDate(r.uploadedAt)})
                    </span>
                  </button>
                ))}
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancelPrompt}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Resume list (Req 3.2) */}
      {resumes.length === 0 ? (
        <Card hoverable={false}>
          <p className="text-foreground-muted text-center">
            No resumes uploaded yet. Upload your first resume PDF above.
          </p>
        </Card>
      ) : (
        <div className="space-y-[var(--spacing-sm)]">
          {resumes.map((resume) => (
            <Card key={resume.id} hoverable={false}>
              <div className="flex items-center justify-between gap-[var(--spacing-md)]">
                <div className="flex items-center gap-[var(--spacing-md)] min-w-0">
                  {resume.isPreferred && (
                    <span
                      className="text-warning text-lg shrink-0"
                      title="Preferred resume"
                      aria-label="Preferred"
                    >
                      ⭐
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {resume.filename}
                    </p>
                    <p className="text-xs text-foreground-muted">
                      {formatFileSize(resume.fileSize)} · Uploaded{" "}
                      {formatDate(resume.uploadedAt)}
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
                      {settingPreferredId === resume.id
                        ? "Setting…"
                        : "Set Preferred"}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(resume.id)}
                    disabled={deletingId === resume.id}
                    className="text-error hover:bg-error/10"
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
