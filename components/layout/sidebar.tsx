"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Receipt, BookOpen, Landmark,
  Users, ScrollText, BarChart3, Settings, CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/accounts", label: "Chart of Accounts", icon: BookOpen },
  { href: "/journal", label: "Journal", icon: ScrollText },
  { href: "/partners", label: "Partners", icon: Users },
  { href: "/gst", label: "GST Returns", icon: Landmark },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/compliance", label: "Compliance Calendar", icon: CalendarClock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-rule bg-paper-raised md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-rule px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-ink-800">
          <span className="font-display text-sm font-semibold text-accent-gold-soft">L</span>
        </div>
        <span className="font-display text-lg font-medium text-ink-900">Ledgerly</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-ink-800 text-white font-medium"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-rule p-3">
        <div className="rounded-[var(--radius-md)] bg-ink-50 px-3 py-2.5">
          <p className="text-xs font-medium text-ink-700">Himkar International</p>
          <p className="text-[11px] text-ink-400">Partnership Firm</p>
        </div>
      </div>
    </aside>
  );
}
