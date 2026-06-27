"use client";

import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, useId } from "react";

interface BaseInputProps {
  /** Label text displayed above the input */
  label: string;
  /** Error message to display below the input */
  error?: string;
  /** Whether to render as a textarea */
  multiline?: boolean;
}

export type InputProps = BaseInputProps &
  (
    | ({ multiline?: false } & Omit<InputHTMLAttributes<HTMLInputElement>, "id">)
    | ({ multiline: true } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">)
  );

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ label, error, multiline = false, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = generatedId;
    const errorId = `${inputId}-error`;

    const sharedClasses = [
      "block w-full rounded-md border bg-background px-3 py-2",
      "text-foreground placeholder:text-foreground-subtle",
      "transition-all duration-200 ease-in-out",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      error
        ? "border-error focus:ring-error"
        : "border-border",
      className,
    ].join(" ");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>

        {multiline ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={sharedClasses}
            rows={4}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={sharedClasses}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {error && (
          <p id={errorId} className="text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
