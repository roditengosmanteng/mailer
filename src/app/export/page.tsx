"use client";

import { useState } from "react";
import useSWR from "swr";
import { Download, Filter } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  totalCount: number;
  validCount: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ExportPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("valid");
  const [minScore, setMinScore] = useState<string>("0");
  const [loading, setLoading] = useState(false);

  const { data } = useSWR<{ batches: Batch[] }>("/api/batches", fetcher);
  const batches = data?.batches ?? [];

  const handleExport = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedBatch) params.set("batchId", selectedBatch);
    if (statusFilter) params.set("status", statusFilter);
    if (minScore && parseFloat(minScore) > 0)
      params.set("minScore", minScore);

    const res = await fetch(`/api/emails/export?${params}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verified-emails-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Export Emails</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Export verified emails as CSV for your email campaigns
        </p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 text-[var(--primary)]">
          <Filter size={20} />
          <h2 className="text-lg font-semibold">Export Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.totalCount} emails)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
            >
              <option value="valid">Valid Only</option>
              <option value="pending">Pending</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Minimum AI Score
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              0 = no filter, 0.7 = high confidence only
            </p>
          </div>
        </div>

        <div className="bg-[var(--secondary)] rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">CSV will include:</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            email, name, organization, domain, syntax_valid, mx_valid,
            smtp_valid, ai_verified, ai_score, status, source
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full px-4 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Download size={18} />
          {loading ? "Exporting..." : "Export to CSV"}
        </button>
      </div>
    </div>
  );
}
