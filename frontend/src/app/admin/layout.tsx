/**
 * Admin root layout.
 *
 * This is a pass-through layout for the /admin route segment.
 * Authentication and sidebar rendering are handled by the
 * (authenticated) route group layout to avoid wrapping the login page.
 *
 * Requirements: 9.1
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin Panel",
    template: "%s — Admin",
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
