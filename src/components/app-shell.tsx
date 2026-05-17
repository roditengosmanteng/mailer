"use client";

import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast-provider";

export function AppShell({
  children,
  isAuthenticated,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    // Login page — no sidebar, no toast provider
    return <>{children}</>;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-mesh">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
