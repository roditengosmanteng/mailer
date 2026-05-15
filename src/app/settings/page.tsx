"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Settings, Brain, Shield, Zap, X } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";

interface AIProvider {
  id: string;
  name: string;
  type: string;
  model: string;
  baseUrl: string | null;
  isActive: boolean;
}

const providerTypes = [
  { value: "openai", label: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { value: "google", label: "Google Gemini", models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"] },
  { value: "anthropic", label: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-3-5-haiku-20241022"] },
  { value: "custom", label: "Custom (OpenAI Compatible)", models: [] },
];

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "openai",
    apiKey: "",
    model: "gpt-4o-mini",
    baseUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();

  const { data, mutate } = useSWR<{ providers: AIProvider[] }>(
    "/api/ai-providers",
    fetcher
  );
  const providers = data?.providers ?? [];

  const handleAdd = async () => {
    if (!form.name || !form.apiKey || !form.model) {
      setError("Please fill in all required fields");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/ai-providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const result = await res.json();

    if (!res.ok) {
      setError(result.error);
      addToast("Failed to add provider", "error");
    } else {
      setShowForm(false);
      setForm({ name: "", type: "openai", apiKey: "", model: "gpt-4o-mini", baseUrl: "" });
      mutate();
      addToast(`Provider "${form.name}" added successfully`, "success");
    }

    setSaving(false);
  };

  const handleDelete = async (provider: AIProvider) => {
    const confirmed = await confirm({
      title: "Delete Provider",
      message: `Are you sure you want to delete "${provider.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    await fetch("/api/ai-providers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: provider.id }),
    });
    mutate();
    addToast(`Provider "${provider.name}" deleted`, "info");
  };

  const handleToggleActive = async (provider: AIProvider) => {
    await fetch("/api/ai-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: provider.id, isActive: !provider.isActive }),
    });
    mutate();
    addToast(
      `Provider "${provider.name}" ${!provider.isActive ? "activated" : "deactivated"}`,
      !provider.isActive ? "success" : "info"
    );
  };

  const selectedType = providerTypes.find((p) => p.value === form.type);

  const providerIcons: Record<string, string> = {
    openai: "🤖",
    google: "✨",
    anthropic: "🧠",
    custom: "⚡",
  };

  return (
    <div className="p-8 max-w-3xl mx-auto fade-in">
      <ConfirmDialog {...dialogProps} />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Settings size={24} className="text-[var(--primary-light)]" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <p className="text-[var(--muted-foreground)] ml-9">
          Configure AI providers for email verification and scraping
        </p>
      </div>

      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-[var(--primary-light)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              AI Providers
            </h2>
            {providers.length > 0 && (
              <span className="badge badge-info">{providers.length}</span>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
              showForm ? "btn-secondary" : "btn-primary"
            }`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Add Provider"}
          </button>
        </div>

        {showForm && (
          <div className="p-5 mb-5 rounded-xl bg-[var(--secondary)] border border-[var(--border)] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Provider Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. My OpenAI Key"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Provider Type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    const defaultModel =
                      providerTypes.find((p) => p.value === type)?.models[0] ||
                      "";
                    setForm({ ...form, type, model: defaultModel });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                >
                  {providerTypes.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                API Key *
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) =>
                  setForm({ ...form, apiKey: e.target.value })
                }
                placeholder="sk-..."
                className="w-full px-3.5 py-2.5 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Model *
                </label>
                {selectedType && selectedType.models.length > 0 ? (
                  <select
                    value={form.model}
                    onChange={(e) =>
                      setForm({ ...form, model: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  >
                    {selectedType.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) =>
                      setForm({ ...form, model: e.target.value })
                    }
                    placeholder="model-name"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  />
                )}
              </div>
              {form.type === "custom" && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                    Base URL *
                  </label>
                  <input
                    type="url"
                    value={form.baseUrl}
                    onChange={(e) =>
                      setForm({ ...form, baseUrl: e.target.value })
                    }
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleAdd}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-medium btn-primary disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Provider"}
            </button>
          </div>
        )}

        {providers.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
              <Zap size={24} className="text-[var(--muted-foreground)] opacity-50" />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">No AI providers configured yet</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Add an OpenAI, Google Gemini, or Anthropic provider to enable AI features
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 bg-[var(--secondary)] rounded-xl border border-[var(--border)] hover:border-[var(--border-bright)] transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{providerIcons[provider.type] || "⚡"}</span>
                  <div>
                    <p className="font-medium text-sm">{provider.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {provider.type} · {provider.model}
                      {provider.baseUrl && ` · ${provider.baseUrl}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(provider)}
                    className={`badge cursor-pointer transition-all ${
                      provider.isActive
                        ? "badge-success"
                        : "badge-neutral"
                    }`}
                  >
                    {provider.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => handleDelete(provider)}
                    className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-[var(--primary-light)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            About AI Validation
          </h2>
        </div>
        <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
          <p>
            The AI validation feature searches the internet to verify if an
            email address belongs to a real person at a given organization.
          </p>
          <p>
            <strong className="text-[var(--foreground)]">How it works:</strong> For an email like{" "}
            <code className="px-1.5 py-0.5 rounded bg-[var(--secondary)] text-[var(--primary-light)] text-xs font-mono">
              mistera@moh.gov.my
            </code>
            , the AI searches for &quot;mistera moh&quot; to find if this
            person exists at the Ministry of Health Malaysia.
          </p>
          <p>
            <strong className="text-[var(--foreground)]">Supported providers:</strong> OpenAI (GPT-4, GPT-3.5),
            Google Gemini, Anthropic Claude, or any OpenAI-compatible API.
          </p>
        </div>
      </div>
    </div>
  );
}
