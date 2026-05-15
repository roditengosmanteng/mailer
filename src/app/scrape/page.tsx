"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, Loader2, Mail, ExternalLink, Radar, Clock } from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface ScrapeJob {
  id: string;
  targetOrg: string;
  targetUrl: string | null;
  status: string;
  emailsFound: number;
  createdAt: string;
}

interface AIProvider {
  id: string;
  name: string;
  type: string;
  model: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ScrapePage() {
  const [targetOrg, setTargetOrg] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<{
    emailsFound: number;
    emails: string[];
    details: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState("");
  const { addToast } = useToast();

  const { data: providerData } = useSWR<{ providers: AIProvider[] }>(
    "/api/ai-providers",
    fetcher
  );
  const { data: jobData, mutate: mutateJobs } = useSWR<{ jobs: ScrapeJob[] }>(
    "/api/scrape",
    fetcher
  );

  const providers = providerData?.providers ?? [];
  const jobs = jobData?.jobs ?? [];

  const handleScrape = async () => {
    if (!targetOrg.trim()) {
      setError("Please enter a target organization");
      return;
    }

    setScraping(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetOrg: targetOrg.trim(),
          targetUrl: targetUrl.trim() || undefined,
          providerId: selectedProvider || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Scraping failed");
        addToast(data.error || "Scraping failed", "error");
      } else {
        setResult(data);
        addToast(`Found ${data.emailsFound || 0} emails`, "success");
        mutateJobs();
      }
    } catch {
      setError("Scraping failed. Please try again.");
      addToast("Scraping failed", "error");
    }

    setScraping(false);
  };

  return (
    <div className="p-8 fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Radar size={24} className="text-[var(--primary-light)]" />
          <h1 className="text-2xl font-bold">AI Email Scraper</h1>
        </div>
        <p className="text-[var(--muted-foreground)] ml-9">
          Use AI to discover email addresses from organizations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-5">
              New Scrape Job
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Target Organization *
                </label>
                <input
                  type="text"
                  value={targetOrg}
                  onChange={(e) => setTargetOrg(e.target.value)}
                  placeholder="e.g. Ministry of Tourism Malaysia, Universiti Malaya"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                />
                <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">
                  Enter the full name of the government ministry, GLC,
                  university, or company
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Website URL (Optional)
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="e.g. https://www.motac.gov.my"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  AI Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                >
                  <option value="">Default (first active)</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type} - {p.model})
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleScrape}
                disabled={scraping || !targetOrg.trim()}
                className="w-full px-4 py-3.5 rounded-xl text-sm font-medium btn-primary flex items-center justify-center gap-2"
              >
                {scraping ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Scraping... This may take a moment
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Start Scraping
                  </>
                )}
              </button>
            </div>
          </div>

          {result && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Results
                </h2>
                <span className="badge badge-success">
                  {result.emailsFound} found
                </span>
              </div>
              {result.emails.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {result.emails.map((email, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg hover:bg-[var(--accent)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Mail size={14} className="text-[var(--primary-light)] shrink-0" />
                        <span className="text-sm font-mono text-[var(--primary-light)] truncate">{email}</span>
                      </div>
                      {result.details[email] && (
                        <span className="text-xs text-[var(--muted-foreground)] ml-3 shrink-0">
                          {result.details[email]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                  No emails found. Try a different organization or provide a
                  website URL.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="glass-card p-6 h-fit">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={16} className="text-[var(--muted-foreground)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Recent Scrape Jobs
            </h2>
          </div>
          {jobs.length === 0 ? (
            <div className="text-center py-10">
              <Radar size={28} className="mx-auto text-[var(--muted-foreground)] opacity-30 mb-3" />
              <p className="text-sm text-[var(--muted-foreground)]">
                No scrape jobs yet
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Start your first scrape job to discover emails
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3.5 bg-[var(--secondary)] rounded-lg hover:bg-[var(--accent)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-medium text-sm truncate">{job.targetOrg}</p>
                    <span
                      className={`badge ${
                        job.status === "completed"
                          ? "badge-success"
                          : job.status === "running"
                            ? "badge-warning"
                            : job.status === "failed"
                              ? "badge-error"
                              : "badge-neutral"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      <span className="font-medium text-[var(--foreground)]">{job.emailsFound}</span> emails found
                    </span>
                    {job.targetUrl && (
                      <a
                        href={job.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--primary-light)] flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink size={11} />
                        Website
                      </a>
                    )}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
