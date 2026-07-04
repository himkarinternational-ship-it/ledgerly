import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/accounting/money";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

export function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "neutral" | "positive" | "negative" | "warn";
  hint?: string;
}) {
  const toneStyles = {
    neutral: "text-ink-900",
    positive: "text-positive-700",
    negative: "text-negative-700",
    warn: "text-warn-700",
  };

  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          <p className={cn("mt-2 font-mono text-2xl font-semibold tabular", toneStyles[tone])}>
            {formatINR(value)}
          </p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-ink-50">
          <Icon size={17} className="text-ink-500" strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
}
