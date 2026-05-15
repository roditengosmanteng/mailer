"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  Upload,
  Search,
  Download,
  Settings,
  LayoutDashboard,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/emails", label: "Emails", icon: Mail, exact: true },
  { href: "/emails/import", label: "Import", icon: Upload },
  { href: "/scrape", label: "AI Scraper", icon: Search },
  { href: "/export", label: "Export", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex flex-col border-r border-[var(--border)]" style={{ background: "var(--gradient-sidebar)" }}>
      <div className="p-6 border-b border-[var(--border)]">
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
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[var(--accent)] text-[var(--primary-light)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              }`}
              style={isActive ? { borderLeft: "2px solid var(--primary)" } : { borderLeft: "2px solid transparent" }}
            >
              <Icon size={18} className={isActive ? "text-[var(--primary-light)]" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-[var(--border)] mx-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-[11px] text-[var(--muted-foreground)]">
            System Online · v1.0
          </p>
        </div>
      </div>
    </aside>
  );
}
