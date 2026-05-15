"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Settings, Brain } from "lucide-react";

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
    } else {
      setShowForm(false);
      setForm({ name: "", type: "openai", apiKey: "", model: "gpt-4o-mini", baseUrl: "" });
      mutate();
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/ai-providers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    mutate();
  };

  const handleToggleActive = async (provider: AIProvider) => {
    await fetch("/api/ai-providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: provider.id, isActive: !provider.isActive }),
    });
    mutate();
  };

  const selectedType = providerTypes.find((p) => p.value === form.type);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Configure AI providers for email verification and scraping
        </p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-[var(--primary)]" />
            <h2 className="text-lg font-semibold">AI Providers</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Add Provider
          </button>
        </div>

        {showForm && (
          <div className="bg-[var(--secondary)] rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Provider Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="e.g. My OpenAI Key"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
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
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
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
              <label className="block text-xs font-medium mb-1">
                API Key *
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) =>
                  setForm({ ...form, apiKey: e.target.value })
                }
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Model *
                </label>
                {selectedType && selectedType.models.length > 0 ? (
                  <select
                    value={form.model}
                    onChange={(e) =>
                      setForm({ ...form, model: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
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
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
                  />
                )}
              </div>
              {form.type === "custom" && (
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Base URL *
                  </label>
                  <input
                    type="url"
                    value={form.baseUrl}
                    onChange={(e) =>
                      setForm({ ...form, baseUrl: e.target.value })
                    }
                    placeholder="https://api.example.com/v1"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--background)]"
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Provider"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {providers.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Settings size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No AI providers configured yet.</p>
            <p className="text-xs mt-1">
              Add an OpenAI, Google Gemini, or Anthropic provider to enable AI
              features.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-3 bg-[var(--secondary)] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      provider.isActive ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{provider.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {provider.type} &middot; {provider.model}
                      {provider.baseUrl && ` &middot; ${provider.baseUrl}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(provider)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      provider.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {provider.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="p-1 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">About AI Validation</h2>
        <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
          <p>
            The AI validation feature searches the internet to verify if an
            email address belongs to a real person at a given organization.
          </p>
          <p>
            <strong>How it works:</strong> For an email like{" "}
            <code className="bg-[var(--secondary)] px-1 rounded">
              mistera@moh.gov.my
            </code>
            , the AI searches for &quot;mistera moh&quot; to find if this
            person exists at the Ministry of Health Malaysia.
          </p>
          <p>
            <strong>Supported providers:</strong> OpenAI (GPT-4, GPT-3.5),
            Google Gemini, Anthropic Claude, or any OpenAI-compatible API.
          </p>
        </div>
      </div>
    </div>
  );
}
