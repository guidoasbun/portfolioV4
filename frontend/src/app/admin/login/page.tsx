/**
 * Admin login page.
 *
 * Displays an email/password form. On invalid credentials, shows a generic
 * error message without revealing which field is incorrect (req 9.3).
 *
 * This page is NOT wrapped by the admin layout auth guard — the proxy
 * (middleware) allows /admin/login through without authentication.
 *
 * Requirements: 9.1, 9.2, 9.3
 */

import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login — Admin Panel",
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-[24rem]">
        <div className="bg-surface rounded-lg border border-border p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-foreground text-center mb-6">
            Admin Login
          </h1>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
