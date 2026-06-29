/**
 * Certifications management page.
 *
 * Lists all certifications with create, edit, delete, and badge upload.
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Certification } from "@/types/entities";
import type { ApiResponse } from "@/types/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CertFormData {
  issuer: string;
  name: string;
  verificationUrl: string;
  displayOrder: string;
}

const EMPTY_FORM: CertFormData = {
  issuer: "",
  name: "",
  verificationUrl: "",
  displayOrder: "0",
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CertFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Badge upload state
  const [uploadingBadgeId, setUploadingBadgeId] = useState<string | null>(null);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/certifications")
      .then((res) => res.json())
      .then((json: ApiResponse<Certification[]>) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setCertifications(json.data);
        } else {
          setError("Failed to load certifications.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load certifications.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  // ─── Form handlers ─────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEditForm = (cert: Certification) => {
    setEditingId(cert.id);
    setFormData({
      issuer: cert.issuer,
      name: cert.name,
      verificationUrl: cert.verificationUrl,
      displayOrder: String(cert.displayOrder),
    });
    setFormErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const handleFieldChange = (field: keyof CertFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.issuer.trim()) errors.issuer = "Issuer is required";
    if (!formData.name.trim()) errors.name = "Certification name is required";
    if (!formData.verificationUrl.trim()) errors.verificationUrl = "Verification URL is required";
    try {
      new URL(formData.verificationUrl.trim());
    } catch {
      if (!errors.verificationUrl) errors.verificationUrl = "Must be a valid URL";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload = {
        issuer: formData.issuer.trim(),
        name: formData.name.trim(),
        verificationUrl: formData.verificationUrl.trim(),
        displayOrder: parseInt(formData.displayOrder, 10) || 0,
      };

      const url = editingId ? `/api/certifications/${editingId}` : "/api/certifications";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse = await res.json();

      if (json.success) {
        closeForm();
        refetch();
      } else {
        if (json.errors) setFormErrors(json.errors);
        else if (json.error) setError(json.error);
      }
    } catch {
      setError("Failed to save certification.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Badge upload ──────────────────────────────────────────────────────

  const handleBadgeUpload = async (certId: string, file: File) => {
    setUploadingBadgeId(certId);
    try {
      // 1. Get presigned URL
      const res = await fetch(`/api/certifications/${certId}/badge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          filename: file.name,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to get upload URL");
        return;
      }

      const { uploadUrl, s3Key } = json.data;

      // 2. Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        setError("Failed to upload badge to storage");
        return;
      }

      // 3. Confirm upload — persist badge key in DynamoDB
      const confirmRes = await fetch(`/api/certifications/${certId}/badge`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s3Key }),
      });

      const confirmJson = await confirmRes.json();
      if (!confirmJson.success) {
        setError(confirmJson.error ?? "Failed to confirm badge upload");
        return;
      }

      refetch();
    } catch {
      setError("Failed to upload badge.");
    } finally {
      setUploadingBadgeId(null);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────

  const confirmDelete = (id: string) => setDeletingId(id);
  const cancelDelete = () => setDeletingId(null);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/certifications/${deletingId}`, { method: "DELETE" });
      const json: ApiResponse = await res.json();
      if (json.success) {
        setDeletingId(null);
        refetch();
      } else {
        setError("Failed to delete certification.");
      }
    } catch {
      setError("Failed to delete certification.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-spacing-lg">
        <h1 className="text-h3 font-bold text-foreground">Certifications</h1>
        {!showForm && (
          <Button onClick={openCreateForm}>Add Certification</Button>
        )}
      </div>

      {error && (
        <div className="mb-spacing-md p-spacing-sm bg-surface border border-error rounded-md text-error text-sm" role="alert">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-spacing-lg p-spacing-lg bg-surface border border-border rounded-lg">
          <h2 className="text-h5 font-semibold text-foreground mb-spacing-md">
            {editingId ? "Edit Certification" : "New Certification"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-spacing-md">
            <Input
              label="Issuer"
              value={formData.issuer}
              onChange={(e) => handleFieldChange("issuer", (e.target as HTMLInputElement).value)}
              error={formErrors.issuer}
              required
              placeholder="e.g. CompTIA"
            />
            <Input
              label="Certification Name"
              value={formData.name}
              onChange={(e) => handleFieldChange("name", (e.target as HTMLInputElement).value)}
              error={formErrors.name}
              required
              placeholder="e.g. CompTIA Security+"
            />
            <Input
              label="Verification URL"
              value={formData.verificationUrl}
              onChange={(e) => handleFieldChange("verificationUrl", (e.target as HTMLInputElement).value)}
              error={formErrors.verificationUrl}
              required
              placeholder="https://www.credly.com/badges/..."
            />
            <Input
              label="Display Order"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => handleFieldChange("displayOrder", (e.target as HTMLInputElement).value)}
              placeholder="0"
            />

            <div className="flex gap-spacing-sm">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : editingId ? "Update" : "Create"}
              </Button>
              <Button variant="ghost" onClick={closeForm} disabled={isSaving}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <p className="text-foreground-muted">Loading…</p>
      ) : certifications.length === 0 ? (
        <div className="text-center py-spacing-xl text-foreground-muted">
          <p className="text-lg mb-spacing-sm">No certifications yet.</p>
          <p className="text-sm">Click &quot;Add Certification&quot; to create your first entry.</p>
        </div>
      ) : (
        <ul className="space-y-spacing-md">
          {certifications.map((cert) => (
            <li key={cert.id} className="p-spacing-md bg-surface border border-border rounded-lg">
              <div className="flex items-center gap-spacing-md">
                {/* Badge preview */}
                <div className="shrink-0 w-16 h-16 rounded-lg bg-surface-elevated flex items-center justify-center overflow-hidden">
                  {cert.badgeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cert.badgeUrl} alt={`${cert.name} badge`} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-foreground-muted">No badge</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground-muted">{cert.issuer}</p>
                  <h3 className="text-base font-semibold text-foreground">{cert.name}</h3>
                  <a
                    href={cert.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Verify credential ↗
                  </a>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-spacing-xs shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(cert)}>Edit</Button>
                  <label className="cursor-pointer inline-block">
                    <span
                      className={[
                        "inline-flex items-center justify-center rounded-md font-medium text-sm",
                        "px-3 py-1.5 min-h-[44px] md:min-h-0",
                        "border-2 border-primary text-primary hover:bg-primary hover:text-foreground-inverse",
                        "transition-all duration-200 ease-in-out",
                        "focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary",
                        uploadingBadgeId === cert.id ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      {uploadingBadgeId === cert.id ? "Uploading…" : "Upload Badge"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={uploadingBadgeId === cert.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBadgeUpload(cert.id, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => confirmDelete(cert.id)}>Delete</Button>
                </div>
              </div>

              {/* Delete confirmation */}
              {deletingId === cert.id && (
                <div className="mt-spacing-sm p-spacing-sm bg-background border border-error rounded-md">
                  <p className="text-sm text-foreground mb-spacing-sm">Delete this certification?</p>
                  <div className="flex gap-spacing-xs">
                    <Button variant="primary" size="sm" onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? "Deleting…" : "Confirm"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelDelete} disabled={isDeleting}>Cancel</Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
