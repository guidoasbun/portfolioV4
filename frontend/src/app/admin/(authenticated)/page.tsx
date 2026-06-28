/**
 * Admin dashboard page — server component that displays an overview
 * of portfolio content counts and provides quick links to management sections.
 *
 * Validates: Requirements 9.6
 */

import Link from "next/link";
import { queryAllItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { Card } from "@/components/ui/Card";
import { LogoutButton } from "./LogoutButton";

interface StatCard {
  label: string;
  value: number;
  href: string;
  icon: string;
}

async function getCount(gsi1pk: string): Promise<number> {
  try {
    const items = await queryAllItems<DynamoDBItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: { ":pk": gsi1pk },
    });
    return items.length;
  } catch {
    return 0;
  }
}

async function getUnreadMessageCount(): Promise<number> {
  try {
    const items = await queryAllItems<DynamoDBItem>({
      indexName: "GSI1",
      keyConditionExpression: "GSI1PK = :pk",
      expressionAttributeValues: {
        ":pk": Keys.message.gsi1pk(),
        ":unread": false,
      },
      filterExpression: "isRead = :unread",
    });
    return items.length;
  } catch {
    return 0;
  }
}

export default async function AdminDashboardPage() {
  const [projectCount, experienceCount, messageCount, skillCategoryCount, unreadCount] =
    await Promise.all([
      getCount(Keys.project.gsi1pk()),
      getCount(Keys.experience.gsi1pk()),
      getCount(Keys.message.gsi1pk()),
      getCount(Keys.skillCategory.gsi1pk()),
      getUnreadMessageCount(),
    ]);

  const stats: StatCard[] = [
    {
      label: "Projects",
      value: projectCount,
      href: "/admin/projects",
      icon: "💼",
    },
    {
      label: "Experience",
      value: experienceCount,
      href: "/admin/experience",
      icon: "🏢",
    },
    {
      label: "Skill Categories",
      value: skillCategoryCount,
      href: "/admin/skills",
      icon: "⚡",
    },
    {
      label: "Messages",
      value: messageCount,
      href: "/admin/messages",
      icon: "✉️",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-[var(--spacing-xl)]">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground-muted mt-[var(--spacing-xs)]">
            Welcome to the admin panel. Here&apos;s an overview of your portfolio content.
          </p>
        </div>
        <LogoutButton />
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-md)]">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <Card className="h-full">
              <div className="flex items-center gap-[var(--spacing-sm)]">
                <span className="text-2xl" aria-hidden="true">
                  {stat.icon}
                </span>
                <div>
                  <p className="text-sm text-foreground-muted">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Unread messages indicator */}
      {unreadCount > 0 && (
        <div className="mt-[var(--spacing-lg)]">
          <Link
            href="/admin/messages"
            className="inline-flex items-center gap-[var(--spacing-sm)] rounded-md bg-primary px-[var(--spacing-md)] py-[var(--spacing-sm)] text-sm font-medium text-foreground-inverse transition-colors hover:opacity-90"
          >
            <span aria-hidden="true">📬</span>
            You have {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-[var(--spacing-xl)]">
        <h2 className="text-lg font-semibold text-foreground mb-[var(--spacing-md)]">
          Quick Links
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-md)]">
          <QuickLink
            href="/admin/projects"
            icon="💼"
            title="Projects"
            description="Manage portfolio projects and images"
          />
          <QuickLink
            href="/admin/experience"
            icon="🏢"
            title="Experience"
            description="Edit work experience entries"
          />
          <QuickLink
            href="/admin/skills"
            icon="⚡"
            title="Skills"
            description="Organize skills and categories"
          />
          <QuickLink
            href="/admin/about"
            icon="👤"
            title="About"
            description="Update about section content"
          />
          <QuickLink
            href="/admin/resumes"
            icon="📄"
            title="Resumes"
            description="Upload and manage resume PDFs"
          />
          <QuickLink
            href="/admin/messages"
            icon="✉️"
            title="Messages"
            description="View contact form submissions"
          />
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full">
        <div className="flex items-start gap-[var(--spacing-sm)]">
          <span className="text-xl" aria-hidden="true">
            {icon}
          </span>
          <div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-foreground-muted">{description}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
