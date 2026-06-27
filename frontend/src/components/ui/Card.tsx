import { type HTMLAttributes, forwardRef } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the card should have hover elevation effect */
  hoverable?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = true, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          "rounded-lg border border-border bg-surface p-[var(--spacing-lg)]",
          "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
          hoverable
            ? "transition-shadow duration-200 ease-in-out hover:shadow-lg"
            : "",
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
