"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Trash2,
  RefreshCw,
} from "lucide-react";

interface Email {
  id: string;
  address: string;
  name: string | null;
  organization: string | null;
  domain: string | null;
  syntaxValid: boolean;
  mxValid: boolean | null;
  smtpValid: boolean | null;
  aiVerified: boolean | null;
  aiScore: number | null;
  status: string;
  source: string;
  batchId: string | null;
  batch?: { name: string } | null;
}

interface Batch {
  id: string;
  name: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EmailsPage() {
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [validating, setValidating] = useState(false);
  const [aiValidating, setAiValidating] = useState(false);
  const [page, setPage] = useState(1);

  const emailParams = new URLSearchParams({ page: String(page), limit: "50" });
  if (selectedBatch) emailParams.set("batchId", selectedBatch);
  if (statusFilter) emailParams.set("status", statusFilter);

  const { data: emailData, isLoading: loading, mutate: mutateEmails } = useSWR<{
    emails: Email[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/emails?${emailParams}`, fetcher);

  const { data: batchData } = useSWR<{ batches: Batch[] }>("/api/batches", fetcher);

  const emails = emailData?.emails ?? [];
  const totalPages = emailData?.pagination?.totalPages ?? 1;
  const batches = batchData?.batches ?? [];

  const handleValidate = async () => {
    setValidating(true);
    const ids = selectedEmails.size > 0 ? Array.from(selectedEmails) : undefined;
    await fetch("/api/emails/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        ids ? { emailIds: ids } : { batchId: selectedBatch || undefined }
      ),
    });
    setValidating(false);
    setSelectedEmails(new Set());
    mutateEmails();
  };

  const handleAIValidate = async () => {
    setAiValidating(true);
    const ids = selectedEmails.size > 0 ? Array.from(selectedEmails) : undefined;
    await fetch("/api/emails/ai-validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        ids
          ? { emailIds: ids }
          : { batchId: selectedBatch || undefined }
      ),
    });
    setAiValidating(false);
    setSelectedEmails(new Set());
    mutateEmails();
  };

  const handleDelete = async () => {
    if (selectedEmails.size === 0) return;
    await fetch("/api/emails", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedEmails) }),
    });
    setSelectedEmails(new Set());
    mutateEmails();
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedEmails);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedEmails(next);
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e) => e.id)));
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle size={16} className="text-green-500" />;
      case "invalid":
        return <XCircle size={16} className="text-red-500" />;
      case "validating":
        return <RefreshCw size={16} className="text-yellow-500 animate-spin" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Emails</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Manage and validate your email list
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle size={16} />
            {validating ? "Validating..." : "Validate MX/SMTP"}
          </button>
          <button
            onClick={handleAIValidate}
            disabled={aiValidating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <Brain size={16} />
            {aiValidating ? "AI Checking..." : "AI Verify"}
          </button>
          {selectedEmails.size > 0 && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-[var(--destructive)] text-[var(--destructive-foreground)] rounded-lg text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete ({selectedEmails.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={selectedBatch}
          onChange={(e) => {
            setSelectedBatch(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--card)]"
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--card)]"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="valid">Valid</option>
          <option value="invalid">Invalid</option>
          <option value="validating">Validating</option>
        </select>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    emails.length > 0 && selectedEmails.size === emails.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Email
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Name
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Organization
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                MX
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                AI Score
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Status
              </th>
              <th className="p-3 text-left text-sm font-medium text-[var(--muted-foreground)]">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[var(--muted-foreground)]">
                  Loading...
                </td>
              </tr>
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[var(--muted-foreground)]">
                  No emails found. Import some emails to get started.
                </td>
              </tr>
            ) : (
              emails.map((email) => (
                <tr
                  key={email.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--secondary)] transition-colors"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(email.id)}
                      onChange={() => toggleSelect(email.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="p-3 text-sm font-mono">{email.address}</td>
                  <td className="p-3 text-sm">{email.name || "-"}</td>
                  <td className="p-3 text-sm">{email.organization || "-"}</td>
                  <td className="p-3 text-sm">
                    {email.mxValid === null ? (
                      <span className="text-gray-400">-</span>
                    ) : email.mxValid ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {email.aiScore !== null ? (
                      <span
                        className={`font-medium ${
                          email.aiScore >= 0.7
                            ? "text-green-600"
                            : email.aiScore >= 0.4
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {Math.round(email.aiScore * 100)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1.5 text-sm">
                      {statusIcon(email.status)}
                      {email.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        email.source === "import"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {email.source}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--muted-foreground)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
