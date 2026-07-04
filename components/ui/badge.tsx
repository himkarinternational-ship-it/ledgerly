import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "positive" | "negative" | "warn" | "info";

const toneStyles: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-600",
  positive: "bg-positive-100 text-positive-700",
  negative: "bg-negative-100 text-negative-700",
  warn: "bg-warn-100 text-warn-700",
  info: "bg-info-100 text-info-600",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}

const statusTone: Record<string, Tone> = {
  draft: "neutral",
  sent: "info",
  viewed: "info",
  partially_paid: "warn",
  paid: "positive",
  overdue: "negative",
  cancelled: "neutral",
  recorded: "neutral",
  pending: "warn",
  completed: "positive",
  filed: "positive",
  ready: "info",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone[status] ?? "neutral";
  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}
