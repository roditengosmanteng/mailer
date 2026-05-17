"use client";

import { useState, useCallback, Suspense, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  Mail,
  Upload,
  Search,
  Download,
  Settings,
  LayoutDashboard,
  Zap,
  Users,
  LogOut,
  Shield,
  X,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UserData {
  user: { id: string; name: string; email: string; role: string } | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/emails", label: "Emails", icon: Mail, exact: true },
  { href: "/emails/import", label: "Import", icon: Upload },
  { href: "/scrape", label: "AI Scraper", icon: Search },
  { href: "/export", label: "Export", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

const adminItems: NavItem[] = [
  { href: "/admin/users", label: "Manage Users", icon: Users },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data, error } = useSWR<any>("/api/auth/me", fetcher);
  
  // Auto-logout if session is invalid or user is deactivated
  useEffect(() => {
    if (error || (data && !data.user)) {
      logout();
    }
  }, [data, error]);

  const user = data?.user;
  const isAdmin = user?.role === "admin";

  const allItems = [...navItems, ...(isAdmin ? adminItems : [])];

  return (
    <aside className="w-64 h-full flex flex-col border-r border-[var(--border)]" style={{ background: "var(--gradient-sidebar)" }}>
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--foreground)]">
              MailVerify Pro
            </h1>
            <p className="text-[10px] text-[var(--muted-foreground)] tracking-wider uppercase">
              Email Platform
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {allItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const isAdminItem = adminItems.some((ai) => ai.href === item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[var(--accent)] text-[var(--primary-light)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              }`}
              style={isActive ? { borderLeft: "2px solid var(--primary)" } : { borderLeft: "2px solid transparent" }}
            >
              <Icon size={18} className={isActive ? "text-[var(--primary-light)]" : ""} />
              {item.label}
              {isAdminItem && (
                <Shield size={12} className="ml-auto text-amber-400 opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-[var(--border)] mx-3">
        {user && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: isAdmin ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "var(--gradient-primary)" }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.name}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge text-[10px] ${isAdmin ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "badge-info"}`}>
                {isAdmin ? "Admin" : "User"}
              </span>
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                  }}
                  className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[11px] text-[var(--muted-foreground)]">
              System Online · v2.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
