"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  X,
  AlertCircle,
  Mail,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import { ConfirmDialog, useConfirmDialog } from "@/components/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: { emails: number; batches: number };
}

export default function AdminUsersPage() {
  const { data, mutate } = useSWR<{ users: User[] }>("/api/users", fetcher);
  const { data: authData } = useSWR<{ user: { id: string } }>("/api/auth/me", fetcher);
  const { addToast } = useToast();
  const { confirm, dialogProps } = useConfirmDialog();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);

  const users = data?.users ?? [];
  const currentUserId = authData?.user?.id;

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
    };

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`User "${body.name}" created successfully`, "success");
        setShowCreateModal(false);
        mutate();
      } else {
        addToast(data.error || "Failed to create user", "error");
      }
    } catch {
      addToast("Failed to create user", "error");
    }
    setCreating(false);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetting(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetPasswordUserId, password }),
      });
      if (res.ok) {
        addToast("Password reset successfully", "success");
        setResetPasswordUserId(null);
      } else {
        const data = await res.json();
        addToast(data.error || "Failed to reset password", "error");
      }
    } catch {
      addToast("Failed to reset password", "error");
    }
    setResetting(false);
  };

  const handleToggleActive = async (user: User) => {
    const action = user.isActive ? "deactivate" : "activate";
    const confirmed = await confirm({
      title: `${user.isActive ? "Deactivate" : "Activate"} User`,
      message: `Are you sure you want to ${action} "${user.name}"? ${
        user.isActive
          ? "They will no longer be able to log in."
          : "They will be able to log in again."
      }`,
      confirmLabel: user.isActive ? "Deactivate" : "Activate",
      variant: user.isActive ? "danger" : "default",
    });

    if (!confirmed) return;

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });
      if (res.ok) {
        addToast(`User ${action}d successfully`, "success");
        mutate();
      }
    } catch {
      addToast(`Failed to ${action} user`, "error");
    }
  };

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      title: "Delete User",
      message: `Are you sure you want to permanently delete "${user.name}"? This will also delete all their associated data (${user._count.emails} emails, ${user._count.batches} batches). This cannot be undone.`,
      confirmLabel: "Delete Permanently",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      if (res.ok) {
        addToast(`User "${user.name}" deleted`, "info");
        mutate();
      }
    } catch {
      addToast("Failed to delete user", "error");
    }
  };

  return (
    <>
      <div className="p-5 md:p-8 fade-in">
        <ConfirmDialog {...dialogProps} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users size={24} className="text-[var(--primary-light)]" />
              <h1 className="text-2xl font-bold w-full md:w-auto">Manage Users</h1>
              <span className="badge badge-info whitespace-nowrap">{users.length} users</span>
            </div>
            <p className="text-[var(--muted-foreground)] ml-9">
              Create and manage user accounts for your team
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto px-4 py-2 rounded-lg text-sm font-medium btn-primary flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Add New User
          </button>
        </div>

        {/* Users Table */}
        <div className="glass-card overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  User
                </th>
                <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Role
                </th>
                <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Status
                </th>
                <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Data
                </th>
                <th className="p-3.5 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Created
                </th>
                <th className="p-3.5 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Users size={32} className="mx-auto text-[var(--muted-foreground)] opacity-30 mb-3" />
                    <p className="text-sm text-[var(--muted-foreground)]">No users found. Create the first admin account.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--border)] table-row-hover">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{
                            background: user.role === "admin"
                              ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                              : "var(--gradient-primary)",
                            opacity: user.isActive ? 1 : 0.4,
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${!user.isActive ? "opacity-50" : ""}`}>
                            {user.name}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`badge ${
                          user.role === "admin"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "badge-info"
                        }`}
                      >
                        {user.role === "admin" ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <Shield size={12} />
                        )}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`badge ${user.isActive ? "badge-success" : "badge-error"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3.5 text-sm">
                      <div className="flex items-center gap-3 text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {user._count.emails}
                        </span>
                        <span className="text-xs">|</span>
                        <span>{user._count.batches} batches</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-sm text-[var(--muted-foreground)]">
                      {new Date(user.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setResetPasswordUserId(user.id)}
                          className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-all"
                          title="Reset password"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={user.id === currentUserId}
                          className={`p-2 rounded-lg transition-all ${
                            user.id === currentUserId 
                              ? "opacity-30 cursor-not-allowed" 
                              : user.isActive
                                ? "text-green-400 hover:text-amber-400 hover:bg-amber-500/10"
                                : "text-[var(--muted-foreground)] hover:text-green-400 hover:bg-green-500/10"
                          }`}
                          title={user.id === currentUserId ? "Cannot deactivate yourself" : (user.isActive ? "Deactivate user" : "Activate user")}
                        >
                          {user.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={user.id === currentUserId}
                          className={`p-2 rounded-lg transition-all ${
                            user.id === currentUserId
                              ? "opacity-30 cursor-not-allowed text-[var(--muted-foreground)]"
                              : "text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10"
                          }`}
                          title={user.id === currentUserId ? "Cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 size={14} />
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

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 fade-in overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:p-8 sm:pt-24">
            <div className="glass-card w-full max-w-md p-6 relative">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <UserPlus size={20} className="text-[var(--primary-light)]" />
                  <h2 className="text-lg font-bold">Add New User</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    autoFocus
                    placeholder="Ahmad Hafiz"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="ahmad@company.com"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Role
                  </label>
                  <select name="role" className="w-full px-3.5 py-2.5 rounded-lg text-sm">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="p-3 rounded-lg text-xs text-[var(--muted-foreground)]"
                  style={{ background: "rgba(99, 102, 241, 0.06)", border: "1px solid var(--border)" }}>
                  <AlertCircle size={12} className="inline mr-1.5 text-[var(--primary-light)]" />
                  Users will only see their own data (emails, batches, scrape jobs). Admin users can manage all accounts.
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium btn-primary flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 fade-in overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:p-8 sm:pt-24">
            <div className="glass-card w-full max-w-sm p-6 relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-amber-400" />
                <h2 className="text-lg font-bold">Reset Password</h2>
              </div>
              <button
                onClick={() => setResetPasswordUserId(null)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  autoFocus
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetPasswordUserId(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium btn-primary flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}
    </>
  );
}
