/**
 * Authenticated admin layout with sidebar navigation.
 *
 * Server component that verifies the session before rendering.
 * Redirects to /admin/login if no valid session is present.
 * Renders sidebar navigation for all authenticated admin pages.
 *
 * Requirements: 9.5
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminSidebar } from "../components/AdminSidebar";

export default async function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-spacing-lg md:p-spacing-xl overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
