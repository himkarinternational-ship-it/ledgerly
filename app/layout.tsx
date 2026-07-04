import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ledgerly — Accounting for Himkar International",
  description: "Cloud accounting, invoicing, GST and partnership compliance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-paper text-ink-900">{children}</body>
    </html>
  );
}
