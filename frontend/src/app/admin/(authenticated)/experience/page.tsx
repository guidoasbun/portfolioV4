/**
 * Experience management page.
 *
 * Lists all experience entries with create, edit, and delete actions.
 * Uses a client component for interactive CRUD operations.
 *
 * Requirements: 10.8
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Experience } from "@/types/entities";
import type { ApiResponse } from "@/types/api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExperienceFormData {
  jobTitle: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrentRole: boolean;
  description: string;
}

const EMPTY_FORM: ExperienceFormData = {
  jobTitle: "",
  company: "",
  startDate: "",
  endDate: "",
  isCurrentRole: false,
  description: "",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateRange(startDate: string, endDate?: string): string {
  const formatMonth = (d: string) => {
    const [year, month] = d.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };
  const start = formatMonth(startDate);
  const end = endDate ? formatMonth(endDate) : "Present";
  return `${start} — ${end}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ExperienceManagementPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ExperienceFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/experience")
      .then((res) => res.json())
      .then((json: ApiResponse<Experience[]>) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setExperiences(json.data);
        } else {
          setError("Failed to load experience entries.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load experience entries.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const refetchExperiences = () => setRefreshKey((k) => k + 1);

  // ─── Form handlers ─────────────────────────────────────────────────────

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEditForm = (exp: Experience) => {
    setEditingId(exp.id);
    setFormData({
      jobTitle: exp.jobTitle,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate ?? "",
      isCurrentRole: !exp.endDate,
      description: exp.description,
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

  const handleFieldChange = (
    field: keyof ExperienceFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.jobTitle.trim()) errors.jobTitle = "Job title is required";
    if (!formData.company.trim()) errors.company = "Company is required";
    if (!formData.startDate) errors.startDate = "Start date is required";
    if (!formData.isCurrentRole && !formData.endDate) {
      errors.endDate = "End date is required (or mark as current role)";
    }
    if (!formData.description.trim()) errors.description = "Description is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload = {
        jobTitle: formData.jobTitle.trim(),
        company: formData.company.trim(),
        startDate: formData.startDate,
        endDate: formData.isCurrentRole ? undefined : formData.endDate,
        description: formData.description.trim(),
      };

      const url = editingId
        ? `/api/experience/${editingId}`
        : "/api/experience";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json: ApiResponse<Experience> = await res.json();

      if (json.success) {
        closeForm();
        refetchExperiences();
      } else {
        if (!json.success && json.errors) {
          setFormErrors(json.errors);
        } else if (!json.success && json.error) {
          setError(json.error);
        }
      }
    } catch {
      setError("Failed to save experience entry.");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete handlers ───────────────────────────────────────────────────

  const confirmDelete = (id: string) => {
    setDeletingId(id);
  };

  const cancelDelete = () => {
    setDeletingId(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/experience/${deletingId}`, {
        method: "DELETE",
      });
      const json: ApiResponse = await res.json();
      if (json.success) {
        setDeletingId(null);
        refetchExperiences();
      } else {
        setError("Failed to delete experience entry.");
      }
    } catch {
      setError("Failed to delete experience entry.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-spacing-lg">
        <h1 className="text-h3 font-bold text-foreground">Experience</h1>
        {!showForm && (
          <Button onClick={openCreateForm}>Add Experience</Button>
        )}
      </div>

      {error && (
        <div
          className="mb-spacing-md p-spacing-sm bg-surface border border-error rounded-md text-error text-sm"
          role="alert"
        >
          {error}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ─── Form ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-spacing-lg p-spacing-lg bg-surface border border-border rounded-lg">
          <h2 className="text-h5 font-semibold text-foreground mb-spacing-md">
            {editingId ? "Edit Experience" : "New Experience"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-spacing-md">
            <Input
              label="Job Title"
              value={formData.jobTitle}
              onChange={(e) =>
                handleFieldChange("jobTitle", (e.target as HTMLInputElement).value)
              }
              error={formErrors.jobTitle}
              required
              placeholder="e.g. Senior Software Engineer"
            />

            <Input
              label="Company"
              value={formData.company}
              onChange={(e) =>
                handleFieldChange("company", (e.target as HTMLInputElement).value)
              }
              error={formErrors.company}
              required
              placeholder="e.g. Acme Inc."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-spacing-md">
              <Input
                label="Start Date"
                type="month"
                value={formData.startDate}
                onChange={(e) =>
                  handleFieldChange("startDate", (e.target as HTMLInputElement).value)
                }
                error={formErrors.startDate}
                required
              />

              <div>
                <Input
                  label="End Date"
                  type="month"
                  value={formData.endDate}
                  onChange={(e) =>
                    handleFieldChange("endDate", (e.target as HTMLInputElement).value)
                  }
                  error={formErrors.endDate}
                  disabled={formData.isCurrentRole}
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-foreground-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCurrentRole}
                    onChange={(e) => {
                      handleFieldChange("isCurrentRole", e.target.checked);
                      if (e.target.checked) {
                        handleFieldChange("endDate", "");
                      }
                    }}
                    className="rounded border-border"
                  />
                  Current role
                </label>
              </div>
            </div>

            <Input
              label="Description"
              multiline
              value={formData.description}
              onChange={(e) =>
                handleFieldChange(
                  "description",
                  (e.target as HTMLTextAreaElement).value,
                )
              }
              error={formErrors.description}
              required
              placeholder="Describe your role and responsibilities..."
            />

            <div className="flex gap-spacing-sm">
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving…"
                  : editingId
                    ? "Update"
                    : "Create"}
              </Button>
              <Button variant="ghost" onClick={closeForm} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── List ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <p className="text-foreground-muted">Loading…</p>
      ) : experiences.length === 0 ? (
        <div className="text-center py-spacing-xl text-foreground-muted">
          <p className="text-lg mb-spacing-sm">No experience entries yet.</p>
          <p className="text-sm">
            Click &quot;Add Experience&quot; to create your first entry.
          </p>
        </div>
      ) : (
        <ul className="space-y-spacing-md">
          {experiences.map((exp) => (
            <li
              key={exp.id}
              className="p-spacing-md bg-surface border border-border rounded-lg"
            >
              <div className="flex items-start justify-between gap-spacing-md">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground">
                    {exp.jobTitle}
                  </h3>
                  <p className="text-sm text-foreground-muted">{exp.company}</p>
                  <p className="text-xs text-foreground-muted mt-1">
                    {formatDateRange(exp.startDate, exp.endDate)}
                  </p>
                  <p className="text-sm text-foreground mt-spacing-sm line-clamp-2">
                    {exp.description}
                  </p>
                </div>

                <div className="flex gap-spacing-xs shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm(exp)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => confirmDelete(exp.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Delete confirmation */}
              {deletingId === exp.id && (
                <div className="mt-spacing-sm p-spacing-sm bg-background border border-error rounded-md">
                  <p className="text-sm text-foreground mb-spacing-sm">
                    Are you sure you want to delete this experience entry?
                  </p>
                  <div className="flex gap-spacing-xs">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting…" : "Confirm Delete"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelDelete}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
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
