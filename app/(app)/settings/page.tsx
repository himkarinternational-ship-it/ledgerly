import Link from "next/link";
import { Building2, Users, ArrowRight } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

const settingsLinks = [
  { href: "/settings/firm", label: "Firm Profile", description: "GSTIN, PAN, TAN, address, financial year", icon: Building2 },
  { href: "/settings/clients", label: "Clients & Vendors", description: "Manage contacts used in invoices and expenses", icon: Users },
];

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {settingsLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-ink-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-ink-100">
                      <Icon size={18} className="text-ink-600" />
                    </div>
                    <div>
                      <p className="font-medium text-ink-800">{link.label}</p>
                      <p className="text-xs text-ink-400">{link.description}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-ink-300" />
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
