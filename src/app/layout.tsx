import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/session";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "MailVerify Pro - Email Marketing Platform",
  description:
    "Bulk email import, validation, AI verification, and scraping platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const isAuthenticated = !!session?.userId;

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <AppShell isAuthenticated={isAuthenticated}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
