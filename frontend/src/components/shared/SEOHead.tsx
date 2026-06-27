import type { Metadata } from "next";

const MAX_TITLE_LENGTH = 60;
const MAX_DESCRIPTION_LENGTH = 160;

const SITE_NAME = "Rodrigo's Portfolio";
const DEFAULT_DESCRIPTION =
  "Full-stack software engineer portfolio showcasing projects, experience, and technical skills.";

/**
 * Truncates a string to the specified maximum length.
 * If the string exceeds maxLength, it is cut and an ellipsis is appended.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 1).trimEnd() + "…";
}

/**
 * Generates a Next.js Metadata object for a page with SEO-safe title and description lengths.
 *
 * @param title - Page title (will be truncated to 60 chars max)
 * @param description - Page description (will be truncated to 160 chars max)
 * @returns A Metadata object compatible with Next.js App Router
 */
export function generatePageMetadata(
  title: string,
  description?: string,
): Metadata {
  const safeTitle = truncateText(title, MAX_TITLE_LENGTH);
  const safeDescription = truncateText(
    description || DEFAULT_DESCRIPTION,
    MAX_DESCRIPTION_LENGTH,
  );

  return {
    title: safeTitle,
    description: safeDescription,
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

/**
 * Pre-configured metadata for known pages.
 */
export const PAGE_METADATA = {
  home: generatePageMetadata(
    "Rodrigo — Full-Stack Software Engineer",
    "Full-stack software engineer portfolio showcasing projects, experience, and technical skills.",
  ),
  resume: generatePageMetadata(
    "Resume — Rodrigo",
    "View and download my professional resume with experience, education, and skills.",
  ),
  projects: generatePageMetadata(
    "Projects — Rodrigo",
    "Browse my portfolio of software engineering projects built with modern technologies.",
  ),
} as const;

export { MAX_TITLE_LENGTH, MAX_DESCRIPTION_LENGTH, SITE_NAME };
