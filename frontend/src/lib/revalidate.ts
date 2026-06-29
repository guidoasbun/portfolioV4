/**
 * Revalidation utilities for on-demand cache invalidation.
 *
 * After admin mutations (create, update, delete) for public content,
 * we call revalidatePath to ensure the Next.js cache (Full Route Cache,
 * Data Cache) is invalidated so visitors see fresh content.
 *
 * Currently the public pages use `dynamic = "force-dynamic"` which skips
 * caching entirely. These revalidation calls serve as a safety net and
 * will become essential if the rendering strategy evolves to use ISR.
 *
 * Validates: Requirements 2.4, 6.3, 7.3
 */

import { revalidatePath } from "next/cache";

/**
 * Revalidates the home page where About, Projects, Experience, Skills,
 * and Contact sections are rendered.
 *
 * Wrapped in try-catch because revalidatePath requires the Next.js server
 * request context and will throw if called outside of it (e.g., in tests).
 * Revalidation is best-effort — it should never prevent a mutation response.
 */
export function revalidateHomePage(): void {
  try {
    revalidatePath("/");
  } catch {
    // Revalidation is best-effort; log and continue
  }
}

/**
 * Revalidates the /resume page.
 */
export function revalidateResumePage(): void {
  try {
    revalidatePath("/resume");
  } catch {
    // Revalidation is best-effort; log and continue
  }
}

/**
 * Revalidates all public content pages (home + resume).
 * Use after mutations that could affect content displayed on multiple pages.
 */
export function revalidatePublicPages(): void {
  revalidateHomePage();
  revalidateResumePage();
}
