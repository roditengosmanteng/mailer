"use client";

import { useState, useCallback, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Trash2,
  RefreshCw,
  Mail,
  Filter,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500];

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

function EmailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read pagination state from URL params (persists on refresh)
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 50;
  const [pageInput, setPageInput] = useState(String(page));

  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [renamingBatch, setRenamingBatch] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [aiValidating, setAiValidating] = useState(false);
  const { addToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  // Helper to update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        params.set(key, String(val));
      }
      router.push(`/emails?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  const setPage = useCallback(
    (p: number) => {
      setPageInput(String(p));
      updateParams({ page: p });
    },
    [updateParams]
  );

  const setLimit = useCallback(
    (l: number) => {
      setPageInput("1");
      updateParams({ page: 1, limit: l });
    },
    [updateParams]
  );

  const emailParams = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (selectedBatch) emailParams.set("batchId", selectedBatch);
  if (statusFilter) emailParams.set("status", statusFilter);

  const { data: emailData, isLoading: loading, mutate: mutateEmails } = useSWR<{
    emails: Email[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/api/emails?${emailParams}`, fetcher);

  const { data: batchData, mutate: mutateBatches } = useSWR<{ batches: Batch[] }>("/api/batches", fetcher);

  const handleRenameBatch = async (batchId: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch("/api/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: batchId, name: renameValue.trim() }),
      });
      if (res.ok) {
        addToast(`Batch renamed to "${renameValue.trim()}"`, "success");
        mutateBatches();
      } else {
        addToast("Failed to rename batch", "error");
      }
    } catch {
      addToast("Failed to rename batch", "error");
    }
    setRenamingBatch(null);
    setRenameValue("");
  };

  const emails = emailData?.emails ?? [];

  // Reset shift-selection starting index when the email list changes
  useEffect(() => {
    setLastSelectedIndex(null);
  }, [emails]);

  const totalPages = emailData?.pagination?.totalPages ?? 1;
  const totalEmails = emailData?.pagination?.total ?? 0;
  const batches = batchData?.batches ?? [];

  const handleValidate = async () => {
    setValidating(true);
    const ids = selectedEmails.size > 0 ? Array.from(selectedEmails) : undefined;
    try {
      const res = await fetch("/api/emails/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          ids ? { emailIds: ids } : { batchId: selectedBatch || undefined }
        ),
      });
      const data = await res.json();
      addToast(`Validated ${data.validated || 0} emails`, "success");
    } catch {
      addToast("Validation failed", "error");
    }
    setValidating(false);
    setSelectedEmails(new Set());
    mutateEmails();
  };

  const handleAIValidate = async () => {
    setAiValidating(true);
    const ids = selectedEmails.size > 0 ? Array.from(selectedEmails) : undefined;
    try {
      const res = await fetch("/api/emails/ai-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          ids
            ? { emailIds: ids }
            : { batchId: selectedBatch || undefined }
        ),
      });
      const data = await res.json();
      addToast(`AI verified ${data.verified || 0} emails`, "success");
    } catch {
      addToast("AI validation failed", "error");
    }
    setAiValidating(false);
    setSelectedEmails(new Set());
    mutateEmails();
  };

  const handleDelete = async () => {
    if (selectedEmails.size === 0) return;

    const confirmed = await confirm({
      title: "Delete Emails",
      message: `Are you sure you want to delete ${selectedEmails.size} email(s)? This action cannot be undone.`,
      confirmLabel: `Delete ${selectedEmails.size}`,
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await fetch("/api/emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedEmails) }),
      });
      addToast(`Deleted ${selectedEmails.size} emails`, "info");
    } catch {
      addToast("Failed to delete emails", "error");
    }
    setSelectedEmails(new Set());
    mutateEmails();
  };

  const toggleSelect = (id: string, index: number, shiftKey: boolean) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      const isChecking = !prev.has(id);

      if (shiftKey && lastSelectedIndex !== null && lastSelectedIndex < emails.length && emails.length > 0) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        for (let i = start; i <= end; i++) {
          const targetId = emails[i].id;
          if (isChecking) {
            next.add(targetId);
          } else {
            next.delete(targetId);
          }
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      
      setLastSelectedIndex(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setLastSelectedIndex(null);
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e) => e.id)));
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle size={14} className="text-green-400" />;
      case "catch_all":
        return <Mail size={14} className="text-sky-400" />;
      case "invalid":
      case "bounced":
        return <XCircle size={14} className="text-red-400" />;
      case "validating":
        return <RefreshCw size={14} className="text-amber-400 animate-spin" />;
      default:
        return <Clock size={14} className="text-[var(--muted-foreground)]" />;
    }
  };

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "valid":
        return "badge-success";
      case "catch_all":
        return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      case "invalid":
      case "bounced":
        return "badge-error";
      case "validating":
        return "badge-warning";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="p-8 fade-in">
      <ConfirmDialog {...dialogProps} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Mail size={24} className="text-[var(--primary-light)]" />
            <h1 className="text-2xl font-bold">Emails</h1>
            {totalEmails > 0 && (
              <span className="badge badge-info">{totalEmails} total</span>
            )}
          </div>
          <p className="text-[var(--muted-foreground)] ml-9">
            Manage and validate your email list
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleValidate}
            disabled={validating}
            className="px-4 py-2 rounded-lg text-sm font-medium btn-primary flex items-center gap-2"
          >
            <CheckCircle size={16} />
            {validating ? "Validating..." : "Validate MX/SMTP"}
          </button>
          <button
            onClick={handleAIValidate}
            disabled={aiValidating}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 bg-gradient-to-r from-purple-600/80 to-violet-600/80 text-white border border-purple-500/20 hover:from-purple-600 hover:to-violet-600 transition-all shadow-lg shadow-purple-500/10 disabled:opacity-50"
          >
            <Brain size={16} />
            {aiValidating ? "AI Checking..." : "AI Verify"}
          </button>
          {selectedEmails.size > 0 && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium btn-danger flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete ({selectedEmails.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-4 items-center">
        <Filter size={16} className="text-[var(--muted-foreground)]" />
        <select
          value={selectedBatch}
          onChange={(e) => {
            setSelectedBatch(e.target.value);
            setPage(1);
            setRenamingBatch(null);
          }}
          className="px-3 py-2 rounded-lg text-sm"
        >
          <option value="">All Batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Rename batch inline */}
        {selectedBatch && renamingBatch !== selectedBatch && (
          <button
            onClick={() => {
              setRenamingBatch(selectedBatch);
              const batch = batches.find((b) => b.id === selectedBatch);
              setRenameValue(batch?.name || "");
            }}
            className="p-2 rounded-lg btn-secondary flex items-center gap-1.5 text-xs"
            title="Rename this batch"
          >
            <Pencil size={13} />
            Rename
          </button>
        )}
        {renamingBatch === selectedBatch && selectedBatch && (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameBatch(selectedBatch);
                if (e.key === "Escape") { setRenamingBatch(null); setRenameValue(""); }
              }}
              autoFocus
              className="px-2.5 py-1.5 rounded-lg text-sm w-52"
              placeholder="New batch name"
            />
            <button
              onClick={() => handleRenameBatch(selectedBatch)}
              disabled={!renameValue.trim()}
              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-all disabled:opacity-30"
              title="Save"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => { setRenamingBatch(null); setRenameValue(""); }}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-all"
              title="Cancel"
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="valid">Valid</option>
          <option value="catch_all">Catch-All</option>
          <option value="invalid">Invalid</option>
          <option value="bounced">Bounced</option>
          <option value="validating">Validating</option>
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="p-3.5 text-left w-10">
                <input
                  type="checkbox"
                  checked={
                    emails.length > 0 && selectedEmails.size === emails.length
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Email
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Name
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Organization
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Tiers (T1/T2/T3)
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                AI Score
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Status
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[var(--border)]">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="p-3.5">
                      <div className="skeleton h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <Mail size={32} className="mx-auto text-[var(--muted-foreground)] opacity-30 mb-3" />
                  <p className="text-sm text-[var(--muted-foreground)]">
                    No emails found. Import some emails to get started.
                  </p>
                </td>
              </tr>
            ) : (
              emails.map((email, index) => (
                <tr
                  key={email.id}
                  className="border-b border-[var(--border)] table-row-hover"
                >
                  <td className="p-3.5">
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(email.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleSelect(email.id, index, e.shiftKey)}
                    />
                  </td>
                  <td className="p-3.5 text-sm font-mono text-[var(--primary-light)]">{email.address}</td>
                  <td className="p-3.5 text-sm">{email.name || <span className="text-[var(--muted-foreground)] opacity-40">—</span>}</td>
                  <td className="p-3.5 text-sm">{email.organization || <span className="text-[var(--muted-foreground)] opacity-40">—</span>}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      {/* T1 Syntax */}
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold cursor-help transition-all ${
                          email.syntaxValid
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                        title={email.syntaxValid ? "Tier 1: Syntax Valid (Format correctly matches email pattern)" : "Tier 1: Syntax Invalid"}
                      >
                        T1
                      </span>

                      {/* T2 MX */}
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold cursor-help transition-all ${
                          email.mxValid === null
                            ? "bg-slate-500/10 text-slate-400 border border-slate-500/10 opacity-40"
                            : email.mxValid
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                        title={
                          email.mxValid === null
                            ? "Tier 2: MX Record Lookup Pending"
                            : email.mxValid
                              ? "Tier 2: MX Record Valid (Mail server is active)"
                              : "Tier 2: MX Record Invalid (No active mail server found)"
                        }
                      >
                        T2
                      </span>

                      {/* T3 SMTP */}
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold cursor-help transition-all ${
                          email.smtpValid === null
                            ? "bg-slate-500/10 text-slate-400 border border-slate-500/10 opacity-40"
                            : email.smtpValid
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : email.mxValid
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                        title={
                          email.smtpValid === null
                            ? "Tier 3: SMTP Ping Pending"
                            : email.smtpValid
                              ? "Tier 3: SMTP Handshake Valid (Mailbox is active & accepts mail)"
                              : email.mxValid
                                ? "Tier 3: SMTP Handshake Blocked or Unreliable (Possible Port 25 block by ISP/Server, or Catch-All protection)"
                                : "Tier 3: SMTP Handshake Failed (No mail server available)"
                        }
                      >
                        T3
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 text-sm">
                    {email.aiScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-12">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${Math.round(email.aiScore * 100)}%`,
                              background: email.aiScore >= 0.7
                                ? "#22c55e"
                                : email.aiScore >= 0.4
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            email.aiScore >= 0.7
                              ? "text-green-400"
                              : email.aiScore >= 0.4
                                ? "text-amber-400"
                                : "text-red-400"
                          }`}
                        >
                          {Math.round(email.aiScore * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-[var(--muted-foreground)] opacity-40">—</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className={`badge ${statusBadgeClass(email.status)}`}>
                      {statusIcon(email.status)}
                      {email.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-sm">
                    <span
                      className={`badge ${
                        email.source === "import"
                          ? "badge-info"
                          : "bg-purple-500/10 text-purple-300 border border-purple-500/20"
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

      {/* Pagination bar */}
      <div className="flex items-center justify-between mt-6 gap-4 flex-wrap">
        {/* Per-page selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted-foreground)]">Show</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg text-sm w-20"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-xs text-[var(--muted-foreground)]">per page</span>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 rounded-lg btn-secondary disabled:opacity-30"
            title="First page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg btn-secondary disabled:opacity-30"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1.5 mx-2">
            <span className="text-xs text-[var(--muted-foreground)]">Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => {
                const n = Math.max(1, Math.min(totalPages, Number(pageInput) || 1));
                setPage(n);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = Math.max(1, Math.min(totalPages, Number(pageInput) || 1));
                  setPage(n);
                }
              }}
              className="w-16 px-2 py-1.5 rounded-lg text-sm text-center"
            />
            <span className="text-xs text-[var(--muted-foreground)]">
              of {totalPages}
            </span>
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg btn-secondary disabled:opacity-30"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="p-2 rounded-lg btn-secondary disabled:opacity-30"
            title="Last page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Total count */}
        <span className="text-xs text-[var(--muted-foreground)]">
          {totalEmails} emails total
        </span>
      </div>
    </div>
  );
}

export default function EmailsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 text-center text-sm text-[var(--muted-foreground)] flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw size={24} className="text-[var(--primary-light)] animate-spin" />
          <p>Loading emails database...</p>
        </div>
      </div>
    }>
      <EmailsContent />
    </Suspense>
  );
}
