"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast-provider";
import { Menu } from "lucide-react";

export function AppShell({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    // Login page — no sidebar, no toast provider
    return <>{children}</>;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-mesh overflow-hidden">
        {/* Sidebar container with mobile transition overlay */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex h-full`}
        >
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>

        {/* Mobile Sidebar Backdrop Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header Bar */}
          <header className="flex items-center justify-between px-5 py-3.5 bg-[var(--secondary)] border-b border-[var(--border)] md:hidden shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <span className="font-bold text-sm text-[var(--foreground)] tracking-tight">MailVerify Pro</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">Online</span>
            </div>
          </header>

          {/* Actual Page Content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
