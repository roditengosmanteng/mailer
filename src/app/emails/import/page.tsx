"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      } else {
        setResult(data);
      }
    } catch {
      setError("Import failed. Please try again.");
    }

    setImporting(false);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Import Emails</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Upload a CSV file or paste email addresses to import
        </p>
      </div>

      {result ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Import Complete</h2>
          <div className="space-y-1 text-sm text-[var(--muted-foreground)] mb-6">
            <p>Total processed: {result.total}</p>
            <p className="text-green-600">Imported: {result.imported}</p>
            {result.skipped > 0 && (
              <p className="text-yellow-600">
                Skipped (duplicates): {result.skipped}
              </p>
            )}
            {result.invalid > 0 && (
              <p className="text-red-600">Invalid syntax: {result.invalid}</p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/emails")}
              className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium"
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
              className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium"
            >
              Import More
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <label className="block text-sm font-medium mb-2">
              Batch Name
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. Ministry of Health Contacts"
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
            />
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setMode("file")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === "file"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--secondary)] text-[var(--foreground)]"
                }`}
              >
                <Upload size={16} className="inline mr-2" />
                Upload CSV
              </button>
              <button
                onClick={() => setMode("paste")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === "paste"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--secondary)] text-[var(--foreground)]"
                }`}
              >
                <FileText size={16} className="inline mr-2" />
                Paste Emails
              </button>
            </div>

            {mode === "file" ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-12 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
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
                    <FileText
                      size={24}
                      className="text-[var(--primary)]"
                    />
                    <span className="text-sm font-medium">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload
                      size={32}
                      className="text-[var(--muted-foreground)] mx-auto mb-3"
                    />
                    <p className="text-sm font-medium">
                      Drop your CSV file here or click to browse
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
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
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)] font-mono"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-2">
                  Separate emails with newlines, commas, or semicolons
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={
              importing || (mode === "file" ? !file : !pastedEmails.trim())
            }
            className="w-full px-4 py-3 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            {importing ? "Importing..." : "Import Emails"}
          </button>
        </div>
      )}
    </div>
  );
}
