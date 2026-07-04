"use client";

import { useTransition } from "react";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedComplianceCalendar } from "@/app/(app)/compliance/actions";

export function SeedComplianceButton({ tenantId }: { tenantId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(() => {
          void seedComplianceCalendar(tenantId);
        })
      }
    >
      <CalendarPlus size={15} /> {isPending ? "Adding…" : "Add Standard GST/TDS Calendar"}
    </Button>
  );
}
