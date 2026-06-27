"use client";

import { type HTMLAttributes, useEffect, useRef, useState } from "react";

type AnimationType = "fade-in" | "slide-up" | "slide-left" | "slide-right";

export interface ScrollAnimationProps extends HTMLAttributes<HTMLDivElement> {
  /** Animation type to apply when element enters viewport */
  animation?: AnimationType;
  /** Duration in ms (200-500). Defaults to 400ms */
  duration?: number;
  /** IntersectionObserver threshold (0-1). Defaults to 0.1 */
  threshold?: number;
  /** Whether animation should only run once */
  once?: boolean;
}

const animationStyles: Record<AnimationType, { initial: React.CSSProperties; visible: React.CSSProperties }> = {
  "fade-in": {
    initial: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "slide-up": {
    initial: { opacity: 0, transform: "translateY(20px)" },
    visible: { opacity: 1, transform: "translateY(0)" },
  },
  "slide-left": {
    initial: { opacity: 0, transform: "translateX(20px)" },
    visible: { opacity: 1, transform: "translateX(0)" },
  },
  "slide-right": {
    initial: { opacity: 0, transform: "translateX(-20px)" },
    visible: { opacity: 1, transform: "translateX(0)" },
  },
};

function ScrollAnimation({
  animation = "fade-in",
  duration = 400,
  threshold = 0.1,
  once = true,
  children,
  className = "",
  style,
  ...props
}: ScrollAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    let mql: MediaQueryList;
    try {
      mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return;
    }

    setPrefersReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);

    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    // Fallback for older Safari / embedded WebViews
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  // Set up IntersectionObserver
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion) {
      // If reduced motion preferred, just show immediately
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, prefersReducedMotion]);

  // Clamp duration to 200-500ms
  const clampedDuration = Math.min(500, Math.max(200, duration));

  const animStyle = animationStyles[animation];
  const computedStyle: React.CSSProperties = prefersReducedMotion
    ? { ...style }
    : {
        ...animStyle.initial,
        ...(isVisible ? animStyle.visible : {}),
        transition: `opacity ${clampedDuration}ms ease-out, transform ${clampedDuration}ms ease-out`,
        ...style,
      };

  return (
    <div ref={ref} className={className} style={computedStyle} {...props}>
      {children}
    </div>
  );
}

export { ScrollAnimation };
