import { prisma } from "@/lib/prisma";
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Search,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [totalEmails, validEmails, invalidEmails, pendingEmails, totalBatches, scrapeJobs] =
    await Promise.all([
      prisma.email.count(),
      prisma.email.count({ where: { status: "valid" } }),
      prisma.email.count({ where: { status: "invalid" } }),
      prisma.email.count({ where: { status: "pending" } }),
      prisma.importBatch.count(),
      prisma.scrapeJob.count(),
    ]);

  const recentBatches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = [
    {
      label: "Total Emails",
      value: totalEmails,
      icon: Mail,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Valid",
      value: validEmails,
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      label: "Invalid",
      value: invalidEmails,
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      label: "Pending",
      value: pendingEmails,
      icon: Clock,
      color: "text-yellow-500",
      bg: "bg-yellow-50",
    },
    {
      label: "Import Batches",
      value: totalBatches,
      icon: Upload,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      label: "Scrape Jobs",
      value: scrapeJobs,
      icon: Search,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Overview of your email marketing platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/emails/import"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--secondary)] hover:bg-[var(--accent)] transition-colors"
            >
              <Upload size={20} className="text-[var(--primary)]" />
              <div>
                <p className="font-medium text-sm">Import Emails</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Upload CSV or paste emails
                </p>
              </div>
            </Link>
            <Link
              href="/scrape"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--secondary)] hover:bg-[var(--accent)] transition-colors"
            >
              <Search size={20} className="text-[var(--primary)]" />
              <div>
                <p className="font-medium text-sm">AI Email Scraper</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Discover emails from organizations
                </p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Imports</h2>
          {recentBatches.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No imports yet. Start by importing emails.
            </p>
          ) : (
            <div className="space-y-3">
              {recentBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--secondary)]"
                >
                  <div>
                    <p className="font-medium text-sm">{batch.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {batch.totalCount} emails &middot;{" "}
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      batch.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : batch.status === "processing"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {batch.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
