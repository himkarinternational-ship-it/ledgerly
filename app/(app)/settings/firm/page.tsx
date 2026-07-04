import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { FirmProfileForm } from "@/components/settings/firm-profile-form";
import { getCurrentTenant } from "@/lib/tenant";

export default async function FirmSettingsPage() {
  const tenant = await getCurrentTenant();

  return (
    <>
      <Topbar
        title="Firm Profile"
        actions={
          <Link href="/settings" className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
            <ArrowLeft size={15} /> Back to Settings
          </Link>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <FirmProfileForm tenant={tenant} />
      </main>
    </>
  );
}
