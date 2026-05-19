"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trash2, RefreshCw, XCircle, FileType } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TrashPage() {
  const [activeTab, setActiveTab] = useState<"batches" | "emails">("batches");
  const { addToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  const { data, mutate, isLoading } = useSWR(
    `/api/trash?type=${activeTab}`,
    fetcher
  );

  const items = data?.[activeTab] || [];

  const handleRestore = async (id: string, type: "batch" | "email") => {
    try {
      const res = await fetch("/api/trash", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      if (res.ok) {
        addToast(`Restored successfully`, "success");
        mutate();
      } else {
        addToast("Failed to restore", "error");
      }
    } catch {
      addToast("Failed to restore", "error");
    }
  };

  const handlePermanentDelete = async (id: string, type: "batch" | "email") => {
    const isConfirmed = await confirm({
      title: "Permanent Delete",
      message: "Are you sure you want to permanently delete this item? This action CANNOT be undone.",
      confirmLabel: "Delete Permanently",
      variant: "danger",
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      if (res.ok) {
        addToast("Deleted permanently", "success");
        mutate();
      } else {
        addToast("Failed to delete", "error");
      }
    } catch {
      addToast("Failed to delete", "error");
    }
  };

  const handleEmptyTrash = async () => {
    const isConfirmed = await confirm({
      title: "Empty Trash",
      message: "Are you sure you want to permanently delete EVERYTHING in the trash? This action CANNOT be undone.",
      confirmLabel: "Empty Trash",
      variant: "danger",
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch("/api/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "all" }),
      });
      if (res.ok) {
        addToast("Trash emptied", "success");
        mutate();
      } else {
        addToast("Failed to empty trash", "error");
      }
    } catch {
      addToast("Failed to empty trash", "error");
    }
  };

  return (
    <div className="p-5 md:p-8 fade-in">
      <ConfirmDialog {...dialogProps} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Trash2 size={24} className="text-red-400" />
            <h1 className="text-2xl font-bold w-full md:w-auto">Trash</h1>
          </div>
          <p className="text-[var(--muted-foreground)] ml-9">
            Manage deleted batches and emails
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEmptyTrash}
            disabled={items.length === 0}
            className="px-4 py-2 rounded-lg text-sm font-medium btn-danger flex items-center gap-2 disabled:opacity-50"
          >
            <XCircle size={16} />
            Empty Trash
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab("batches")}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "batches"
              ? "border-[var(--primary-light)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Deleted Batches
        </button>
        <button
          onClick={() => setActiveTab("emails")}
          className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "emails"
              ? "border-[var(--primary-light)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Deleted Emails
        </button>
      </div>

      <div className="glass-card overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                {activeTab === "batches" ? "Batch Name" : "Email Address"}
              </th>
              <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Deleted At
              </th>
              {activeTab === "batches" && (
                <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Total Emails
                </th>
              )}
              {activeTab === "emails" && (
                <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Batch
                </th>
              )}
              <th className="p-3.5 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--muted-foreground)]">
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--muted-foreground)]">
                  <div className="flex flex-col items-center justify-center">
                    <Trash2 size={48} className="mb-4 opacity-20" />
                    <p>Trash is empty</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item: any) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors group"
                >
                  <td className="p-3.5">
                    <div className="flex items-center gap-2 font-medium">
                      {activeTab === "batches" ? <FileType size={16} /> : <Trash2 size={16} />}
                      {activeTab === "batches" ? item.name : item.address}
                    </div>
                  </td>
                  <td className="p-3.5 text-sm text-[var(--muted-foreground)]">
                    {new Date(item.deletedAt).toLocaleString()}
                  </td>
                  {activeTab === "batches" && (
                    <td className="p-3.5 text-sm">{item.totalCount || 0}</td>
                  )}
                  {activeTab === "emails" && (
                    <td className="p-3.5 text-sm">{item.batch?.name || "N/A"}</td>
                  )}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestore(item.id, activeTab === "batches" ? "batch" : "email")}
                        className="px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Restore"
                      >
                        <RefreshCw size={14} />
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id, activeTab === "batches" ? "batch" : "email")}
                        className="px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        title="Delete Permanently"
                      >
                        <XCircle size={14} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
