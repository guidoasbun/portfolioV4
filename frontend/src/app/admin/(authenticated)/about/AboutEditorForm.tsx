"use client";

/**
 * Client form for editing About section content.
 * Saves via PUT /api/about with personal description and professional pitch fields.
 *
 * Validates: Requirements 10.10
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AboutEditorFormProps {
  initialData: {
    personalDescription: string;
    professionalPitch: string;
  } | null;
}

export function AboutEditorForm({ initialData }: AboutEditorFormProps) {
  const [personalDescription, setPersonalDescription] = useState(
    initialData?.personalDescription ?? "",
  );
  const [professionalPitch, setProfessionalPitch] = useState(
    initialData?.professionalPitch ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalDescription, professionalPitch }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: "success", text: "About content saved successfully." });
      } else {
        const errorMsg =
          data.error ?? Object.values(data.errors ?? {}).join(", ") ?? "Failed to save.";
        setMessage({ type: "error", text: errorMsg });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--spacing-lg)] max-w-2xl">
      <Input
        label="Personal Description"
        multiline
        rows={6}
        value={personalDescription}
        onChange={(e) => setPersonalDescription(e.target.value)}
        placeholder="Write a personal description about yourself…"
      />

      <Input
        label="Professional Pitch"
        multiline
        rows={6}
        value={professionalPitch}
        onChange={(e) => setProfessionalPitch(e.target.value)}
        placeholder="Write your professional elevator pitch…"
      />

      {message && (
        <p
          role="alert"
          className={[
            "text-sm",
            message.type === "success" ? "text-green-600" : "text-error",
          ].join(" ")}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
