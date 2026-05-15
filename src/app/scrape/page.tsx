"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, Loader2, Mail, ExternalLink } from "lucide-react";

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
      } else {
        setResult(data);
        mutateJobs();
      }
    } catch {
      setError("Scraping failed. Please try again.");
    }

    setScraping(false);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI Email Scraper</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Use AI to discover email addresses from organizations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">New Scrape Job</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Target Organization *
                </label>
                <input
                  type="text"
                  value={targetOrg}
                  onChange={(e) => setTargetOrg(e.target.value)}
                  placeholder="e.g. Ministry of Tourism Malaysia, Universiti Malaya"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Enter the full name of the government ministry, GLC,
                  university, or company
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Website URL (Optional)
                </label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="e.g. https://www.motac.gov.my"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  AI Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleScrape}
                disabled={scraping || !targetOrg.trim()}
                className="w-full px-4 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scraping ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Scraping...
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
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">
                Results: {result.emailsFound} emails found
              </h2>
              {result.emails.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {result.emails.map((email, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-[var(--primary)]" />
                        <span className="text-sm font-mono">{email}</span>
                      </div>
                      {result.details[email] && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {result.details[email]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  No emails found. Try a different organization or provide a
                  website URL.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Scrape Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No scrape jobs yet.
            </p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3 bg-[var(--secondary)] rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{job.targetOrg}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        job.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : job.status === "running"
                            ? "bg-yellow-100 text-yellow-700"
                            : job.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {job.emailsFound} emails found
                    </span>
                    {job.targetUrl && (
                      <a
                        href={job.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--primary)] flex items-center gap-1"
                      >
                        <ExternalLink size={12} />
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
