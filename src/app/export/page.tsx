"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Download, Filter, FileDown, Database, Columns3 } from "lucide-react";
import { useToast } from "@/components/toast-provider";

interface Batch {
  id: string;
  name: string;
  totalCount: number;
  validCount: number;
}

const AVAILABLE_COLUMNS = [
  { key: "email", label: "Email Address" },
  { key: "name", label: "Name" },
  { key: "organization", label: "Organization" },
  { key: "domain", label: "Domain" },
  { key: "syntax_valid", label: "Syntax Valid" },
  { key: "mx_valid", label: "MX Valid" },
  { key: "smtp_valid", label: "SMTP Valid" },
  { key: "ai_verified", label: "AI Verified" },
  { key: "ai_score", label: "AI Score" },
  { key: "status", label: "Status" },
  { key: "source", label: "Source" },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ExportPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("valid");
  const [minScore, setMinScore] = useState<string>("0");
  const [delimiter, setDelimiter] = useState<"," | ";">(",");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(AVAILABLE_COLUMNS.map((c) => c.key))
  );
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { addToast } = useToast();

  const { data } = useSWR<{ batches: Batch[] }>("/api/batches", fetcher);
  const batches = data?.batches ?? [];

  // Fetch preview count whenever filters change
  useEffect(() => {
    const fetchPreview = async () => {
      setPreviewLoading(true);
      const params = new URLSearchParams();
      if (selectedBatch) params.set("batchId", selectedBatch);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/emails?${params}&limit=1&page=1`);
      const data = await res.json();
      setPreviewCount(data.pagination?.total ?? 0);
      setPreviewLoading(false);
    };
    fetchPreview();
  }, [selectedBatch, statusFilter]);

  const toggleColumn = (key: string) => {
    const next = new Set(selectedColumns);
    if (next.has(key)) {
      if (next.size === 1) return; // must have at least 1 column
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedColumns(next);
  };

  const selectAllColumns = () => {
    setSelectedColumns(new Set(AVAILABLE_COLUMNS.map((c) => c.key)));
  };

  const selectEmailOnly = () => {
    setSelectedColumns(new Set(["email"]));
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBatch) params.set("batchId", selectedBatch);
      if (statusFilter) params.set("status", statusFilter);
      if (minScore && parseFloat(minScore) > 0)
        params.set("minScore", minScore);
      params.set("delimiter", delimiter);
      params.set("columns", Array.from(selectedColumns).join(","));

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
      addToast("Export downloaded successfully", "success");
    } catch {
      addToast("Export failed", "error");
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Download size={24} className="text-[var(--primary-light)]" />
          <h1 className="text-2xl font-bold">Export Emails</h1>
        </div>
        <p className="text-[var(--muted-foreground)] ml-9">
          Export verified emails as CSV for your email campaigns
        </p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-2 text-[var(--primary-light)]">
          <Filter size={18} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Export Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Batch
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm"
            >
              <option value="valid">Valid Only</option>
              <option value="pending">Pending</option>
              <option value="all">All</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Minimum AI Score
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm"
            />
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">
              0 = no filter, 0.7 = high confidence only
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              CSV Delimiter
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDelimiter(",")}
                className={`flex-1 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  delimiter === ","
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                Comma ( , )
              </button>
              <button
                onClick={() => setDelimiter(";")}
                className={`flex-1 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  delimiter === ";"
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                Semicolon ( ; )
              </button>
            </div>
          </div>
        </div>

        {/* Column Picker */}
        <div className="p-4 rounded-xl bg-[var(--secondary)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Columns3 size={14} className="text-[var(--primary-light)]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                CSV Columns
              </h3>
              <span className="badge badge-info">
                {selectedColumns.size} / {AVAILABLE_COLUMNS.length}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectEmailOnly}
                className="text-[11px] font-medium text-[var(--primary-light)] hover:underline"
              >
                Email only
              </button>
              <span className="text-[var(--muted-foreground)]">·</span>
              <button
                onClick={selectAllColumns}
                className="text-[11px] font-medium text-[var(--primary-light)] hover:underline"
              >
                Select all
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AVAILABLE_COLUMNS.map((col) => (
              <label
                key={col.key}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${
                  selectedColumns.has(col.key)
                    ? "bg-[var(--accent)] border border-[var(--border-bright)]"
                    : "hover:bg-[var(--accent)] border border-transparent"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.has(col.key)}
                  onChange={() => toggleColumn(col.key)}
                />
                <span className="text-sm">{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--secondary)] border border-[var(--border)]">
          <Database size={18} className="text-[var(--primary-light)]" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {previewLoading ? (
                <span className="text-[var(--muted-foreground)]">Counting...</span>
              ) : (
                <>
                  <span className="text-[var(--primary-light)] font-bold">{previewCount ?? 0}</span>
                  <span className="text-[var(--muted-foreground)]"> emails × </span>
                  <span className="text-[var(--primary-light)] font-bold">{selectedColumns.size}</span>
                  <span className="text-[var(--muted-foreground)]"> columns</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Preview header row */}
        <div className="p-4 rounded-xl bg-[var(--secondary)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <FileDown size={14} className="text-[var(--muted-foreground)]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Header Preview
            </h3>
          </div>
          <p className="text-xs text-[var(--primary-light)] font-mono break-all">
            {Array.from(selectedColumns).join(delimiter === "," ? ", " : "; ")}
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={loading || previewCount === 0}
          className="w-full px-4 py-3.5 rounded-xl text-sm font-medium btn-primary flex items-center justify-center gap-2"
        >
          <Download size={18} />
          {loading ? "Exporting..." : `Export ${previewCount ?? 0} Emails to CSV`}
        </button>
      </div>
    </div>
  );
}
