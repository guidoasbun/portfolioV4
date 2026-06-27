import { type ReactNode } from "react";

export interface PlaceholderProps {
  /** Message to display in the empty state */
  message: string;
  /** Optional icon element displayed above the message */
  icon?: ReactNode;
  className?: string;
}

function Placeholder({ message, icon, className = "" }: PlaceholderProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-[var(--spacing-md)] p-[var(--spacing-xl)]",
        "text-foreground-muted",
        className,
      ].join(" ")}
      role="status"
    >
      {icon && (
        <div className="text-foreground-subtle" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-center text-sm">{message}</p>
    </div>
  );
}

export { Placeholder };
