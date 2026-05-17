import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Search,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function DonutChart({
  valid,
  catchAll,
  invalid,
  pending,
  total,
}: {
  valid: number;
  catchAll: number;
  invalid: number;
  pending: number;
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-40 h-40">
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--muted-foreground)]">0</p>
          <p className="text-xs text-[var(--muted-foreground)]">No data</p>
        </div>
      </div>
    );
  }

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const validPct = valid / total;
  const catchAllPct = catchAll / total;
  const invalidPct = invalid / total;
  const pendingPct = pending / total;

  const validDash = validPct * circumference;
  const catchAllDash = catchAllPct * circumference;
  const invalidDash = invalidPct * circumference;
  const pendingDash = pendingPct * circumference;

  const validOffset = 0;
  const catchAllOffset = -validDash;
  const invalidOffset = -(validDash + catchAllDash);
  const pendingOffset = -(validDash + catchAllDash + invalidDash);

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg className="donut-chart w-full h-full" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--muted)" strokeWidth="12" />
        {validPct > 0 && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeDasharray={`${validDash} ${circumference - validDash}`}
            strokeDashoffset={validOffset}
            className="donut-segment"
            strokeLinecap="round"
          />
        )}
        {catchAllPct > 0 && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="12"
            strokeDasharray={`${catchAllDash} ${circumference - catchAllDash}`}
            strokeDashoffset={catchAllOffset}
            className="donut-segment"
          />
        )}
        {invalidPct > 0 && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeDasharray={`${invalidDash} ${circumference - invalidDash}`}
            strokeDashoffset={invalidOffset}
            className="donut-segment"
          />
        )}
        {pendingPct > 0 && (
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#6366f1"
            strokeWidth="12"
            strokeDasharray={`${pendingDash} ${circumference - pendingDash}`}
            strokeDashoffset={pendingOffset}
            className="donut-segment"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold">{total}</p>
        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">Total</p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const userId = session?.userId;
  const userFilter = userId ? { userId } : {};

  const [totalEmails, validEmails, catchAllEmails, invalidEmails, pendingEmails, totalBatches, scrapeJobs] =
    await Promise.all([
      prisma.email.count({ where: { ...userFilter } }),
      prisma.email.count({ where: { status: "valid", ...userFilter } }),
      prisma.email.count({ where: { status: "catch_all", ...userFilter } }),
      prisma.email.count({ where: { status: "invalid", ...userFilter } }),
      prisma.email.count({ where: { status: "pending", ...userFilter } }),
      prisma.importBatch.count({ where: { ...userFilter } }),
      prisma.scrapeJob.count({ where: { ...userFilter } }),
    ]);

  const recentBatches = await prisma.importBatch.findMany({
    where: { ...userFilter },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = [
    {
      label: "Total Emails",
      value: totalEmails,
      icon: Mail,
      gradient: "from-indigo-500/20 to-purple-500/20",
      iconColor: "text-indigo-400",
      border: "border-indigo-500/20",
    },
    {
      label: "Valid",
      value: validEmails,
      icon: CheckCircle,
      gradient: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400",
      border: "border-green-500/20",
    },
    {
      label: "Catch-All",
      value: catchAllEmails,
      icon: Mail,
      gradient: "from-sky-500/20 to-cyan-500/20",
      iconColor: "text-sky-400",
      border: "border-sky-500/20",
    },
    {
      label: "Invalid",
      value: invalidEmails,
      icon: XCircle,
      gradient: "from-red-500/20 to-rose-500/20",
      iconColor: "text-red-400",
      border: "border-red-500/20",
    },
    {
      label: "Pending",
      value: pendingEmails,
      icon: Clock,
      gradient: "from-amber-500/20 to-yellow-500/20",
      iconColor: "text-amber-400",
      border: "border-amber-500/20",
    },
    {
      label: "Import Batches",
      value: totalBatches,
      icon: Upload,
      gradient: "from-cyan-500/20 to-blue-500/20",
      iconColor: "text-cyan-400",
      border: "border-cyan-500/20",
    },
    {
      label: "Scrape Jobs",
      value: scrapeJobs,
      icon: Search,
      gradient: "from-violet-500/20 to-fuchsia-500/20",
      iconColor: "text-violet-400",
      border: "border-violet-500/20",
    },
  ];

  return (
    <div className="p-8 fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp size={24} className="text-[var(--primary-light)]" />
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
        <p className="text-[var(--muted-foreground)] ml-9">
          Overview of your email marketing platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8 stagger-in">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`glass-card p-5 border ${stat.border}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-2 tracking-tight">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                  <Icon size={22} className={stat.iconColor} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Validation Overview */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
            Validation Overview
          </h2>
          <div className="flex items-center justify-center mb-4">
            <DonutChart
              valid={validEmails}
              catchAll={catchAllEmails}
              invalid={invalidEmails}
              pending={pendingEmails}
              total={totalEmails}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-[var(--muted-foreground)]">Valid</span>
              </div>
              <span className="font-medium">{validEmails}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span className="text-[var(--muted-foreground)]">Catch-All</span>
              </div>
              <span className="font-medium">{catchAllEmails}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-[var(--muted-foreground)]">Invalid</span>
              </div>
              <span className="font-medium">{invalidEmails}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span className="text-[var(--muted-foreground)]">Pending</span>
              </div>
              <span className="font-medium">{pendingEmails}</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/emails/import"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--secondary)] hover:bg-[var(--accent)] transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                <Upload size={18} className="text-indigo-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Import Emails</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Upload CSV or paste emails
                </p>
              </div>
              <ArrowRight size={16} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary-light)] transition-colors group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/scrape"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--secondary)] hover:bg-[var(--accent)] transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
                <Search size={18} className="text-violet-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">AI Email Scraper</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Discover emails from organizations
                </p>
              </div>
              <ArrowRight size={16} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary-light)] transition-colors group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/export"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--secondary)] hover:bg-[var(--accent)] transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                <Mail size={18} className="text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Export Verified</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Download CSV for campaigns
                </p>
              </div>
              <ArrowRight size={16} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary-light)] transition-colors group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Recent Imports */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
            Recent Imports
          </h2>
          {recentBatches.length === 0 ? (
            <div className="text-center py-8">
              <Upload size={28} className="mx-auto text-[var(--muted-foreground)] opacity-40 mb-2" />
              <p className="text-sm text-[var(--muted-foreground)]">
                No imports yet
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Start by importing emails
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--secondary)] transition-colors hover:bg-[var(--accent)]"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{batch.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {batch.totalCount} emails ·{" "}
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      batch.status === "completed"
                        ? "badge-success"
                        : batch.status === "processing"
                          ? "badge-warning"
                          : "badge-neutral"
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
