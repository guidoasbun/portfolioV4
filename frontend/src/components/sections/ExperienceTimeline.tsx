"use client";

/**
 * ExperienceTimeline — client component for interactive filter tabs and
 * the timeline card layout matching the portfolio design.
 */

import { useState, useMemo } from "react";
import type { Experience, ExperienceType } from "@/types/entities";
import { ScrollAnimation } from "@/components/shared";
import { formatDateRange, calculateDuration } from "./experience-utils";

// ─── Filter config ──────────────────────────────────────────────────────────

interface FilterTab {
  key: "all" | ExperienceType;
  label: string;
  icon: React.ReactNode;
}

const FILTER_TABS: FilterTab[] = [
  {
    key: "all",
    label: "All",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
  },
  {
    key: "internship",
    label: "Internships",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    key: "full-time",
    label: "Full-time",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  {
    key: "education",
    label: "Education",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
      </svg>
    ),
  },
];

// ─── Color mapping by type ──────────────────────────────────────────────────

const TYPE_COLORS: Record<ExperienceType, { dot: string; icon: string; iconBg: string }> = {
  education: {
    dot: "bg-emerald-500",
    icon: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  internship: {
    dot: "bg-amber-500",
    icon: "text-amber-600",
    iconBg: "bg-amber-50",
  },
  "full-time": {
    dot: "bg-blue-500",
    icon: "text-blue-600",
    iconBg: "bg-blue-50",
  },
};

const TYPE_ICONS: Record<ExperienceType, React.ReactNode> = {
  education: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
    </svg>
  ),
  internship: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  ),
  "full-time": (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  ),
};

// ─── Component ──────────────────────────────────────────────────────────────

interface ExperienceTimelineProps {
  experiences: Experience[];
}

export function ExperienceTimeline({ experiences }: ExperienceTimelineProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | ExperienceType>("all");

  const filteredExperiences = useMemo(() => {
    if (activeFilter === "all") return experiences;
    return experiences.filter((e) => e.type === activeFilter);
  }, [experiences, activeFilter]);

  // Count per category for the badge
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: experiences.length };
    for (const exp of experiences) {
      map[exp.type] = (map[exp.type] ?? 0) + 1;
    }
    return map;
  }, [experiences]);

  // Only show filter tabs that have entries
  const visibleTabs = FILTER_TABS.filter(
    (tab) => tab.key === "all" || (counts[tab.key] ?? 0) > 0,
  );

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-sm mb-2xl" role="tablist" aria-label="Filter experience by type">
        {visibleTabs.map((tab) => {
          const isActive = activeFilter === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveFilter(tab.key)}
              className={[
                "inline-flex items-center gap-xs px-md py-sm rounded-full text-sm font-medium transition-all duration-200 min-h-[44px]",
                isActive
                  ? "bg-foreground text-background shadow-md"
                  : "bg-surface border border-border text-foreground-muted hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              <span aria-hidden="true">{tab.icon}</span>
              {tab.label}
              <span
                className={[
                  "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold",
                  isActive
                    ? "bg-primary text-foreground-inverse"
                    : "bg-surface-elevated text-foreground-muted",
                ].join(" ")}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border"
          aria-hidden="true"
        />

        <div className="flex flex-col gap-xl">
          {filteredExperiences.map((entry) => {
            const colors = TYPE_COLORS[entry.type];
            return (
              <ScrollAnimation key={entry.id} animation="slide-up" duration={400}>
                <div className="relative pl-12">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-[12px] top-6 h-3.5 w-3.5 rounded-full ${colors.dot} ring-4 ring-background`}
                    aria-hidden="true"
                  />

                  {/* Card */}
                  <div className="rounded-xl border border-border bg-surface p-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    {/* Header row: icon + title + company */}
                    <div className="flex items-start gap-md">
                      {/* Type icon */}
                      <div
                        className={`shrink-0 flex items-center justify-center w-10 h-10 rounded-lg ${colors.iconBg} ${colors.icon}`}
                        aria-hidden="true"
                      >
                        {TYPE_ICONS[entry.type]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[length:var(--font-size-h5)] font-bold text-foreground leading-tight">
                          {entry.jobTitle}
                        </h3>
                        <p className="text-base text-foreground-muted font-medium">
                          {entry.company}
                        </p>

                        {/* Metadata row: location, date range, duration */}
                        <div className="flex flex-wrap items-center gap-md mt-xs text-sm text-foreground-muted">
                          {entry.location && (
                            <span className="inline-flex items-center gap-xs">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                              </svg>
                              {entry.location}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                            </svg>
                            {formatDateRange(entry.startDate, entry.endDate)}
                          </span>
                          <span className="inline-flex items-center gap-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            {calculateDuration(entry.startDate, entry.endDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-md text-sm leading-relaxed text-foreground-muted pl-[calc(2.5rem+var(--spacing-md))]">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors.dot} mr-sm align-middle`} aria-hidden="true" />
                      {entry.description}
                    </p>

                    {/* Tags */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="mt-md pl-[calc(2.5rem+var(--spacing-md))] flex flex-wrap gap-sm">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs font-medium text-foreground-muted bg-surface-elevated px-sm py-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollAnimation>
            );
          })}
        </div>
      </div>
    </div>
  );
}
