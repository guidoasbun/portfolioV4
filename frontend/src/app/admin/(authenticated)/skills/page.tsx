/**
 * Skills management page.
 *
 * Displays skill categories with their skills, supporting full CRUD
 * operations for both categories and skills. Categories can be reordered
 * with up/down controls.
 *
 * Requirements: 10.9
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SkillData {
  id: string;
  name: string;
}

interface CategoryData {
  id: string;
  label: string;
  displayOrder: number;
  skills: SkillData[];
}

// ─── Skills Management Page ─────────────────────────────────────────────────

export default function SkillsManagementPage() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Skill form state
  const [addingSkillToCategoryId, setAddingSkillToCategoryId] = useState<string | null>(null);
  const [editingSkill, setEditingSkill] = useState<{ id: string; categoryId: string } | null>(null);
  const [skillName, setSkillName] = useState("");
  const [skillFormError, setSkillFormError] = useState<string | null>(null);
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  // Delete confirmation state
  const [deletingCategory, setDeletingCategory] = useState<CategoryData | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<{ id: string; name: string; categoryId: string } | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    Promise.all([
      fetch("/api/skills/categories").then((r) => r.json()),
      fetch("/api/skills").then((r) => r.json()),
    ])
      .then(([catJson, skillsJson]) => {
        if (cancelled) return;
        if (!catJson.success) throw new Error(catJson.error || "Failed to fetch categories");

        const categoriesList = catJson.data as Array<{
          id: string;
          label: string;
          displayOrder: number;
        }>;

        const skillsByCategory: Record<string, SkillData[]> = {};
        if (skillsJson.success && skillsJson.data) {
          for (const group of skillsJson.data) {
            skillsByCategory[group.id] = group.skills;
          }
        }

        const merged: CategoryData[] = categoriesList
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((cat) => ({
            id: cat.id,
            label: cat.label,
            displayOrder: cat.displayOrder,
            skills: skillsByCategory[cat.id] ?? [],
          }));

        setCategories(merged);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "An unexpected error occurred");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  const refetchData = () => setRefreshKey((k) => k + 1);

  // ─── Category CRUD ──────────────────────────────────────────────────────

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryLabel("");
    setCategoryFormError(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: CategoryData) => {
    setEditingCategory(category);
    setCategoryLabel(category.label);
    setCategoryFormError(null);
    setShowCategoryForm(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryLabel.trim()) {
      setCategoryFormError("Label is required");
      return;
    }

    setCategorySubmitting(true);
    setCategoryFormError(null);

    try {
      if (editingCategory) {
        // Update existing category
        const res = await fetch(`/api/skills/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: categoryLabel.trim() }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to update category");
      } else {
        // Create new category
        const nextOrder = categories.length > 0
          ? Math.max(...categories.map((c) => c.displayOrder)) + 1
          : 0;
        const res = await fetch("/api/skills/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: categoryLabel.trim(), displayOrder: nextOrder }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to create category");
      }

      setShowCategoryForm(false);
      setCategoryLabel("");
      setEditingCategory(null);
      refetchData();
    } catch (err) {
      setCategoryFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      const res = await fetch(`/api/skills/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete category");

      setDeletingCategory(null);
      refetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
      setDeletingCategory(null);
    }
  };

  const handleReorderCategory = async (categoryId: string, direction: "up" | "down") => {
    const index = categories.findIndex((c) => c.id === categoryId);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === categories.length - 1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const current = categories[index] as CategoryData;
    const swap = categories[swapIndex] as CategoryData;

    try {
      // Swap display orders between the two categories
      await Promise.all([
        fetch(`/api/skills/categories/${current.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: swap.displayOrder }),
        }),
        fetch(`/api/skills/categories/${swap.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: current.displayOrder }),
        }),
      ]);

      refetchData();
    } catch {
      setError("Failed to reorder categories");
    }
  };

  // ─── Skill CRUD ─────────────────────────────────────────────────────────

  const handleAddSkill = (categoryId: string) => {
    setEditingSkill(null);
    setSkillName("");
    setSkillFormError(null);
    setAddingSkillToCategoryId(categoryId);
  };

  const handleEditSkill = (skill: SkillData, categoryId: string) => {
    setAddingSkillToCategoryId(null);
    setEditingSkill({ id: skill.id, categoryId });
    setSkillName(skill.name);
    setSkillFormError(null);
  };

  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillName.trim()) {
      setSkillFormError("Skill name is required");
      return;
    }

    setSkillSubmitting(true);
    setSkillFormError(null);

    try {
      if (editingSkill) {
        // Update existing skill
        const res = await fetch(`/api/skills/${editingSkill.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: skillName.trim() }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to update skill");
        setEditingSkill(null);
      } else if (addingSkillToCategoryId) {
        // Create new skill
        const res = await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: skillName.trim(), categoryId: addingSkillToCategoryId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to create skill");
        setAddingSkillToCategoryId(null);
      }

      setSkillName("");
      refetchData();
    } catch (err) {
      setSkillFormError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSkillSubmitting(false);
    }
  };

  const handleDeleteSkill = async () => {
    if (!deletingSkill) return;

    try {
      const res = await fetch(`/api/skills/${deletingSkill.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete skill");

      setDeletingSkill(null);
      refetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
      setDeletingSkill(null);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-48 bg-surface rounded mb-spacing-lg" />
        <div className="space-y-4">
          <div className="h-32 bg-surface rounded" />
          <div className="h-32 bg-surface rounded" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-spacing-lg">
        <h1 className="text-h3 font-bold text-foreground">Skills</h1>
        <Button onClick={handleCreateCategory} size="sm">
          Add Category
        </Button>
      </div>

      {error && (
        <div className="mb-spacing-md p-spacing-sm bg-error/10 border border-error rounded-md">
          <p className="text-sm text-error">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-error underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Category Form Modal */}
      {showCategoryForm && (
        <div className="mb-spacing-lg p-spacing-md bg-surface border border-border rounded-md">
          <h2 className="text-lg font-semibold text-foreground mb-spacing-sm">
            {editingCategory ? "Edit Category" : "New Category"}
          </h2>
          <form onSubmit={handleCategorySubmit} className="flex items-end gap-spacing-sm">
            <div className="flex-1">
              <Input
                label="Category Label"
                value={categoryLabel}
                onChange={(e) => setCategoryLabel(e.target.value)}
                placeholder="e.g. Frontend, Backend, DevOps"
                error={categoryFormError ?? undefined}
                autoFocus
              />
            </div>
            <Button type="submit" size="sm" disabled={categorySubmitting}>
              {categorySubmitting ? "Saving…" : editingCategory ? "Update" : "Create"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
                setCategoryLabel("");
                setCategoryFormError(null);
              }}
            >
              Cancel
            </Button>
          </form>
        </div>
      )}

      {/* Delete Category Confirmation */}
      {deletingCategory && (
        <div className="mb-spacing-lg p-spacing-md bg-surface border border-error rounded-md">
          <p className="text-sm text-foreground mb-spacing-sm">
            Delete category <strong>&ldquo;{deletingCategory.label}&rdquo;</strong>?
            {deletingCategory.skills.length > 0 && (
              <span className="block text-error mt-1">
                This category has {deletingCategory.skills.length} skill(s). Remove them first.
              </span>
            )}
          </p>
          <div className="flex gap-spacing-sm">
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteCategory}
              disabled={deletingCategory.skills.length > 0}
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingCategory(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Delete Skill Confirmation */}
      {deletingSkill && (
        <div className="mb-spacing-lg p-spacing-md bg-surface border border-error rounded-md">
          <p className="text-sm text-foreground mb-spacing-sm">
            Delete skill <strong>&ldquo;{deletingSkill.name}&rdquo;</strong>?
          </p>
          <div className="flex gap-spacing-sm">
            <Button variant="primary" size="sm" onClick={handleDeleteSkill}>
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeletingSkill(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-spacing-xl">
          <p className="text-foreground-muted">No skill categories yet.</p>
          <p className="text-sm text-foreground-muted mt-1">
            Create a category to start adding skills.
          </p>
        </div>
      ) : (
        <div className="space-y-spacing-md">
          {categories.map((category, index) => (
            <div
              key={category.id}
              className="border border-border rounded-md bg-surface overflow-hidden"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between p-spacing-md border-b border-border bg-surface">
                <h2 className="text-base font-semibold text-foreground">
                  {category.label}
                </h2>
                <div className="flex items-center gap-1">
                  {/* Reorder buttons */}
                  <button
                    type="button"
                    onClick={() => handleReorderCategory(category.id, "up")}
                    disabled={index === 0}
                    className="p-1.5 text-foreground-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Move ${category.label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReorderCategory(category.id, "down")}
                    disabled={index === categories.length - 1}
                    className="p-1.5 text-foreground-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Move ${category.label} down`}
                  >
                    ↓
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditCategory(category)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingCategory(category)}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSkill(category.id)}
                  >
                    Add Skill
                  </Button>
                </div>
              </div>

              {/* Skills List */}
              <div className="p-spacing-sm">
                {/* Add Skill Form (inline) */}
                {addingSkillToCategoryId === category.id && (
                  <form
                    onSubmit={handleSkillSubmit}
                    className="flex items-end gap-spacing-sm mb-spacing-sm p-spacing-sm bg-background rounded-md"
                  >
                    <div className="flex-1">
                      <Input
                        label="Skill Name"
                        value={skillName}
                        onChange={(e) => setSkillName(e.target.value)}
                        placeholder="e.g. React, TypeScript"
                        error={skillFormError ?? undefined}
                        autoFocus
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={skillSubmitting}>
                      {skillSubmitting ? "Saving…" : "Add"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddingSkillToCategoryId(null);
                        setSkillName("");
                        setSkillFormError(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </form>
                )}

                {category.skills.length === 0 && addingSkillToCategoryId !== category.id ? (
                  <p className="text-sm text-foreground-muted py-spacing-sm px-spacing-sm">
                    No skills in this category.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {category.skills.map((skill) => (
                      <li
                        key={skill.id}
                        className="flex items-center justify-between py-2 px-spacing-sm"
                      >
                        {editingSkill?.id === skill.id ? (
                          <form
                            onSubmit={handleSkillSubmit}
                            className="flex items-end gap-spacing-sm flex-1"
                          >
                            <div className="flex-1">
                              <Input
                                label="Skill Name"
                                value={skillName}
                                onChange={(e) => setSkillName(e.target.value)}
                                error={skillFormError ?? undefined}
                                autoFocus
                              />
                            </div>
                            <Button type="submit" size="sm" disabled={skillSubmitting}>
                              {skillSubmitting ? "Saving…" : "Save"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSkill(null);
                                setSkillName("");
                                setSkillFormError(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <>
                            <span className="text-sm text-foreground">{skill.name}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSkill(skill, category.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeletingSkill({
                                    id: skill.id,
                                    name: skill.name,
                                    categoryId: category.id,
                                  })
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
