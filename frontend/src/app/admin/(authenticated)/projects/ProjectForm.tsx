"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Project } from "@/types/entities";
import { ALLOWED_IMAGE_CONTENT_TYPES, IMAGE_MAX_SIZE, MAX_IMAGES_PER_PROJECT } from "@/lib/validation";

interface ProjectFormProps {
  /** Existing project data for editing, undefined for creating */
  project?: Project;
  mode: "create" | "edit";
}

interface ImageItem {
  id: string;
  s3Key: string;
  url: string;
  order: number;
  altText?: string;
  /** For newly uploaded images not yet saved to the project */
  isNew?: boolean;
  /** File reference for display (local preview) */
  previewUrl?: string;
}

export function ProjectForm({ project, mode }: ProjectFormProps) {
  const router = useRouter();

  // Form fields
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl ?? "");
  const [deploymentUrl, setDeploymentUrl] = useState(project?.deploymentUrl ?? "");
  const [published, setPublished] = useState(project?.published ?? false);

  // Images
  const [images, setImages] = useState<ImageItem[]>(
    project?.images.map((img) => ({ ...img })) ?? [],
  );

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Image Upload ──────────────────────────────────────────────────────────

  const handleFileSelect = async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setUploadError(null);

      const currentCount = images.length;
      const remaining = MAX_IMAGES_PER_PROJECT - currentCount;

      if (remaining <= 0) {
        setUploadError("Maximum of 10 images per project reached.");
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remaining);

      // Validate each file locally first
      for (const file of filesToUpload) {
        if (
          !ALLOWED_IMAGE_CONTENT_TYPES.includes(
            file.type as "image/jpeg" | "image/png" | "image/webp",
          )
        ) {
          setUploadError(`"${file.name}" is not a valid image type. Use JPEG, PNG, or WebP.`);
          return;
        }
        if (file.size > IMAGE_MAX_SIZE) {
          setUploadError(`"${file.name}" exceeds the 5MB size limit.`);
          return;
        }
      }

      setIsUploading(true);

      try {
        // The project ID is needed for the S3 key. For new projects we use a
        // temporary ID that the backend will accept (it just constructs the key path).
        const projectId = project?.id ?? "new-project";

        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i]!;

          // Request presigned URL from the API
          const uploadRes = await fetch("/api/projects/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              contentType: file.type,
              fileSize: file.size,
              currentImageCount: currentCount + i,
            }),
          });

          if (!uploadRes.ok) {
            const data = await uploadRes.json();
            const msg =
              data.errors
                ? Object.values(data.errors).join(", ")
                : data.error ?? "Upload failed";
            setUploadError(msg as string);
            break;
          }

          const { data } = await uploadRes.json();
          const { uploadUrl, imageId, s3Key } = data as {
            uploadUrl: string;
            imageId: string;
            s3Key: string;
          };

          // Upload directly to S3
          const s3Res = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!s3Res.ok) {
            setUploadError(`Failed to upload "${file.name}" to storage.`);
            break;
          }

          // Create a local preview URL
          const previewUrl = URL.createObjectURL(file);

          setImages((prev) => [
            ...prev,
            {
              id: imageId,
              s3Key,
              url: previewUrl,
              order: prev.length,
              isNew: true,
              previewUrl,
            },
          ]);
        }
      } catch {
        setUploadError("An error occurred during upload. Please try again.");
      } finally {
        setIsUploading(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
  };

  // ─── Drag & Drop Reorder ──────────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setImages((prev) => {
      const reordered = [...prev];
      const [dragged] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, dragged!);
      // Update order values
      return reordered.map((img, i) => ({ ...img, order: i }));
    });

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      // Revoke the object URL to free memory
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((img, i) => ({ ...img, order: i }));
    });
  };

  // Revoke all remaining preview URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      for (const img of images) {
        if (img.previewUrl) {
          URL.revokeObjectURL(img.previewUrl);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only on unmount
  }, []);

  // ─── Drop zone for files ──────────────────────────────────────────────────

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ─── Form Submission ──────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    if (!githubUrl.trim()) {
      newErrors.githubUrl = "GitHub URL is required";
    } else {
      try {
        new URL(githubUrl);
      } catch {
        newErrors.githubUrl = "GitHub URL must be a valid URL";
      }
    }
    if (deploymentUrl.trim()) {
      try {
        new URL(deploymentUrl);
      } catch {
        newErrors.deploymentUrl = "Deployment URL must be a valid URL";
      }
    }
    if (mode === "create" && images.length === 0) {
      newErrors.images = "At least one image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      if (mode === "create") {
        // Create project
        const createRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            githubUrl: githubUrl.trim(),
            deploymentUrl: deploymentUrl.trim() || undefined,
            published,
            displayOrder: 0,
          }),
        });

        if (!createRes.ok) {
          const data = await createRes.json();
          if (data.errors) {
            setErrors(data.errors);
          } else {
            setErrors({ form: data.error ?? "Failed to create project" });
          }
          return;
        }

        const { data: createdProject } = await createRes.json();

        // Save image metadata for each uploaded image
        // We need to store images in DynamoDB via the project's images
        // Since the POST /api/projects doesn't handle images directly,
        // we need to PUT images as a reorder call which also creates them
        if (images.length > 0) {
          await saveProjectImages(createdProject.id, images);
        }

        router.push("/admin/projects");
      } else {
        // Update project
        const updateRes = await fetch(`/api/projects/${project!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            githubUrl: githubUrl.trim(),
            deploymentUrl: deploymentUrl.trim() || undefined,
            published,
          }),
        });

        if (!updateRes.ok) {
          const data = await updateRes.json();
          if (data.errors) {
            setErrors(data.errors);
          } else {
            setErrors({ form: data.error ?? "Failed to update project" });
          }
          return;
        }

        // Handle new images and reorder as a unified operation.
        // First, save any newly uploaded images to DynamoDB.
        const newImages = images.filter((img) => img.isNew);
        if (newImages.length > 0) {
          await saveProjectImages(project!.id, newImages);
        }

        // Then reorder ALL images (new + existing) together to ensure
        // consistent order values without SK collisions.
        if (images.length > 0) {
          await fetch(`/api/projects/${project!.id}/reorder-images`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              images: images.map((img) => ({
                imageId: img.id,
                order: img.order,
              })),
            }),
          });
        }

        router.push("/admin/projects");
      }
    } catch {
      setErrors({ form: "An unexpected error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-[var(--spacing-lg)]">
      {errors.form && (
        <div
          className="rounded-md border border-error bg-error/10 p-[var(--spacing-md)] text-sm text-error"
          role="alert"
        >
          {errors.form}
        </div>
      )}

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        placeholder="My Awesome Project"
        maxLength={200}
        required
      />

      <Input
        label="Description"
        multiline
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        placeholder="Describe what this project does…"
        maxLength={5000}
        required
      />

      <Input
        label="GitHub URL"
        type="url"
        value={githubUrl}
        onChange={(e) => setGithubUrl(e.target.value)}
        error={errors.githubUrl}
        placeholder="https://github.com/user/repo"
        required
      />

      <Input
        label="Deployment URL (optional)"
        type="url"
        value={deploymentUrl}
        onChange={(e) => setDeploymentUrl(e.target.value)}
        error={errors.deploymentUrl}
        placeholder="https://my-project.vercel.app"
      />

      {/* Published toggle */}
      <div className="flex items-center gap-[var(--spacing-sm)]">
        <input
          type="checkbox"
          id="published"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
        />
        <label htmlFor="published" className="text-sm font-medium text-foreground">
          Published (visible on public site)
        </label>
      </div>

      {/* Image upload section */}
      <div className="space-y-[var(--spacing-sm)]">
        <label className="text-sm font-medium text-foreground">
          Images ({images.length}/{MAX_IMAGES_PER_PROJECT})
        </label>

        {errors.images && (
          <p className="text-sm text-error" role="alert">
            {errors.images}
          </p>
        )}

        {uploadError && (
          <p className="text-sm text-error" role="alert">
            {uploadError}
          </p>
        )}

        {/* Drop zone */}
        <div
          className={[
            "flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-[var(--spacing-lg)]",
            "transition-colors duration-200",
            images.length >= MAX_IMAGES_PER_PROJECT
              ? "border-border bg-surface opacity-50 cursor-not-allowed"
              : "border-border hover:border-primary hover:bg-surface",
          ].join(" ")}
          onDrop={handleDropFiles}
          onDragOver={handleDragOverZone}
          onClick={() => {
            if (images.length < MAX_IMAGES_PER_PROJECT) {
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Upload images by clicking or dropping files"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (images.length < MAX_IMAGES_PER_PROJECT) {
                fileInputRef.current?.click();
              }
            }
          }}
        >
          {isUploading ? (
            <p className="text-sm text-foreground-muted">Uploading…</p>
          ) : (
            <>
              <p className="text-sm text-foreground-muted">
                Drop images here or click to browse
              </p>
              <p className="text-xs text-foreground-subtle mt-[var(--spacing-xs)]">
                JPEG, PNG, or WebP up to 5MB each
              </p>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {/* Image list with drag-and-drop reorder */}
        {images.length > 0 && (
          <div className="space-y-[var(--spacing-sm)]">
            <p className="text-xs text-foreground-subtle">
              Drag images to reorder them.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[var(--spacing-sm)]">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={[
                    "relative aspect-video rounded-md border overflow-hidden cursor-grab active:cursor-grabbing",
                    "transition-all duration-150",
                    dragIndex === index ? "opacity-50 scale-95" : "",
                    dragOverIndex === index && dragIndex !== index
                      ? "ring-2 ring-primary"
                      : "",
                    "border-border",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.previewUrl ?? image.url}
                    alt={image.altText ?? `Project image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-foreground/0 hover:bg-foreground/10 transition-colors" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-foreground-inverse text-xs font-bold hover:bg-error/80 transition-colors"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    ×
                  </button>
                  <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-foreground-inverse text-xs">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form actions */}
      <div className="flex items-center gap-[var(--spacing-sm)] pt-[var(--spacing-md)]">
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
              ? "Create Project"
              : "Save Changes"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/projects")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Helper: Save image metadata to DynamoDB ────────────────────────────────

async function saveProjectImages(
  projectId: string,
  imageItems: ImageItem[],
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/images`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      images: imageItems.map((img) => ({
        id: img.id,
        s3Key: img.s3Key,
        order: img.order,
        altText: img.altText,
      })),
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message =
      data?.error ?? data?.errors
        ? Object.values(data.errors as Record<string, string>).join(", ")
        : "Failed to save image metadata";
    throw new Error(message as string);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error ?? "Failed to save image metadata");
  }
}
