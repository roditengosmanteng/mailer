"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast-provider";

export default function ImportPage() {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedEmails, setPastedEmails] = useState("");
  const [batchName, setBatchName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    invalid: number;
    total: number;
    batchId: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { addToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!batchName) {
        setBatchName(selected.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!batchName) {
        setBatchName(dropped.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("batchName", batchName || "Untitled Import");

      if (mode === "file" && file) {
        formData.append("file", file);
      } else if (mode === "paste" && pastedEmails) {
        formData.append("emails", pastedEmails);
      } else {
        setError("Please provide a file or paste emails");
        setImporting(false);
        return;
      }

      const res = await fetch("/api/emails/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Import failed");
        addToast(data.error || "Import failed", "error");
      } else {
        setResult(data);
        addToast(`Successfully imported ${data.imported} emails`, "success");
      }
    } catch {
      setError("Import failed. Please try again.");
      addToast("Import failed. Please try again.", "error");
    }

    setImporting(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Upload size={24} className="text-[var(--primary-light)]" />
          <h1 className="text-2xl font-bold">Import Emails</h1>
        </div>
        <p className="text-[var(--muted-foreground)] ml-9">
          Upload a CSV file or paste email addresses to import
        </p>
      </div>

      {result ? (
        <div className="glass-card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-green-500/20 to-emerald-500/20">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-semibold mb-3">Import Complete</h2>
          <div className="space-y-2 text-sm mb-8">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Processed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{result.imported}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Imported</p>
              </div>
              {result.skipped > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Skipped</p>
                </div>
              )}
              {result.invalid > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{result.invalid}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Invalid</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/emails")}
              className="px-5 py-2.5 rounded-lg text-sm font-medium btn-primary"
            >
              View Emails
            </button>
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
                setPastedEmails("");
                setBatchName("");
              }}
              className="px-5 py-2.5 rounded-lg text-sm font-medium btn-secondary"
            >
              Import More
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="glass-card p-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Batch Name
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. Ministry of Health Contacts"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm"
            />
          </div>

          <div className="glass-card p-5">
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => setMode("file")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "file"
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                <Upload size={16} />
                Upload CSV
              </button>
              <button
                onClick={() => setMode("paste")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "paste"
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                <FileText size={16} />
                Paste Emails
              </button>
            </div>

            {mode === "file" ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-[var(--primary)] bg-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--border-bright)]"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
                      <FileText size={20} className="text-indigo-400" />
                    </div>
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="p-1 text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                      <Upload size={24} className="text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-sm font-medium mb-1">
                      Drop your CSV file here or click to browse
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Supports .csv and .txt files with email addresses
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  value={pastedEmails}
                  onChange={(e) => setPastedEmails(e.target.value)}
                  placeholder={`Paste email addresses here, one per line or comma-separated:\n\nmistera@moh.gov.my\nab.rahim@mof.gov.my\ncontact@utm.edu.my`}
                  rows={10}
                  className="w-full px-3.5 py-3 rounded-lg text-sm font-mono"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Separate emails with newlines, commas, or semicolons
                  </p>
                  {pastedEmails && (
                    <p className="text-xs text-[var(--primary-light)]">
                      ~{pastedEmails.split(/[\r\n,;]+/).filter((e) => e.trim().includes("@")).length} emails detected
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <Sparkles size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={
              importing || (mode === "file" ? !file : !pastedEmails.trim())
            }
            className="w-full px-4 py-3.5 rounded-xl text-sm font-medium btn-primary flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            {importing ? "Importing..." : "Import Emails"}
          </button>
        </div>
      )}
    </div>
  );
}
