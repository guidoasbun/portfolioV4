"use client";

/**
 * About content editor form component.
 *
 * Provides textarea fields for personal description and professional pitch
 * with save functionality and success/error feedback.
 *
 * Validates: Requirements 10.10
 */

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface AboutEditorProps {
  initialPersonalDescription: string;
  initialProfessionalPitch: string;
}

export function AboutEditor({
  initialPersonalDescription,
  initialProfessionalPitch,
}: AboutEditorProps) {
  const [personalDescription, setPersonalDescription] = useState(
    initialPersonalDescription,
  );
  const [professionalPitch, setProfessionalPitch] = useState(
    initialProfessionalPitch,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalDescription, professionalPitch }),
      });

      const data = await response.json();

      if (data.success) {
        setFeedback({ type: "success", message: "About content saved successfully." });
      } else {
        const errorMsg =
          data.error ?? Object.values(data.errors ?? {}).join(", ") ?? "Save failed.";
        setFeedback({ type: "error", message: errorMsg as string });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[48rem] space-y-6">
      <Input
        label="Personal Description"
        multiline
        rows={6}
        value={personalDescription}
        onChange={(e) => setPersonalDescription(e.target.value)}
        placeholder="Write a personal description about yourself..."
      />

      <Input
        label="Professional Pitch"
        multiline
        rows={6}
        value={professionalPitch}
        onChange={(e) => setProfessionalPitch(e.target.value)}
        placeholder="Write your professional pitch or elevator summary..."
      />

      {feedback && (
        <div
          role="alert"
          className={[
            "rounded-md px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm",
            feedback.type === "success"
              ? "bg-success/10 text-success"
              : "bg-error/10 text-error",
          ].join(" ")}
        >
          {feedback.message}
        </div>
      )}

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving…" : "Save Changes"}
      </Button>
    </div>
  );
}
