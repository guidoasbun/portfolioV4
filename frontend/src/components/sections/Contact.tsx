"use client";

/**
 * Contact section — client component that renders a contact form with
 * client-side validation, server submission, and success/error feedback.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.5
 */

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { ScrollAnimation } from "@/components/shared";
import { validateContactForm } from "@/lib/validation";
import type { ApiResponse } from "@/types/api";

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear success timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const dismissSuccess = useCallback(() => {
    setSuccessMessage(null);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  }, []);

  const handleChange = useCallback(
    (field: keyof FormData) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [field]: e.target.value }));
        // Clear field error on change
        if (errors[field]) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
          });
        }
      },
    [errors]
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setGeneralError(null);
      setSuccessMessage(null);

      // Clear any existing auto-dismiss timeout from a previous submission
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }

      // Client-side validation
      const validation = validateContactForm(formData);
      if (!validation.success) {
        setErrors(validation.errors as FormErrors);
        return;
      }

      setErrors({});
      setIsSubmitting(true);

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data: ApiResponse = await response.json();

        if (data.success) {
          // Clear form on success
          setFormData({ name: "", email: "", message: "" });
          setSuccessMessage(data.message ?? "Message sent successfully!");

          // Auto-dismiss after 5 seconds
          successTimeoutRef.current = setTimeout(() => {
            setSuccessMessage(null);
            successTimeoutRef.current = null;
          }, 5000);
        } else {
          // Server returned validation errors
          if (data.errors) {
            setErrors(data.errors as FormErrors);
          } else {
            setGeneralError(data.error ?? "Something went wrong. Please try again.");
          }
          // Form data is preserved on failure
        }
      } catch {
        // Network error — preserve form data
        setGeneralError("Unable to send message. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData]
  );

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="px-md py-3xl"
    >
      <div className="mx-auto max-w-[42rem]">
        <ScrollAnimation animation="fade-in">
          <h2
            id="contact-heading"
            className="mb-xl text-center text-[length:var(--font-size-h2)] font-bold text-foreground"
          >
            Get In Touch
          </h2>
        </ScrollAnimation>

        <ScrollAnimation animation="slide-up">
          <div className="rounded-lg border border-border bg-surface p-lg">
            {/* Success message */}
            {successMessage && (
              <div
                role="status"
                aria-live="polite"
                className="mb-lg flex items-center justify-between rounded-md border border-success/30 bg-success/10 px-md py-sm text-success"
              >
                <span>{successMessage}</span>
                <button
                  type="button"
                  onClick={dismissSuccess}
                  aria-label="Dismiss success message"
                  className="ml-sm rounded p-1 text-success hover:bg-success/20 focus:outline-none focus:ring-2 focus:ring-success"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            )}

            {/* General error message */}
            {generalError && (
              <div
                role="alert"
                className="mb-lg rounded-md border border-error/30 bg-error/10 px-md py-sm text-error"
              >
                {generalError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-lg">
                <Input
                  label="Name"
                  name="name"
                  type="text"
                  maxLength={100}
                  required
                  value={formData.name}
                  onChange={handleChange("name")}
                  error={errors.name}
                  placeholder="Your name"
                  disabled={isSubmitting}
                />

                <Input
                  label="Email"
                  name="email"
                  type="email"
                  maxLength={254}
                  required
                  value={formData.email}
                  onChange={handleChange("email")}
                  error={errors.email}
                  placeholder="you@example.com"
                  disabled={isSubmitting}
                />

                <Input
                  label="Message"
                  name="message"
                  multiline
                  maxLength={2000}
                  required
                  value={formData.message}
                  onChange={handleChange("message")}
                  error={errors.message}
                  placeholder="Your message..."
                  disabled={isSubmitting}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={isSubmitting}
                  className="mt-sm w-full"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
