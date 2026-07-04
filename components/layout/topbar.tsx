import { Bell } from "lucide-react";

export function Topbar({ title, actions }: { title: string; actions?: React.ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-rule bg-paper-raised px-6">
      <h1 className="font-display text-xl font-medium text-ink-900">{title}</h1>
      <div className="flex items-center gap-3">
        {actions}
        <button
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-ink-500 hover:bg-ink-50"
        >
          <Bell size={17} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-xs font-medium text-ink-700">
          HI
        </div>
      </div>
    </header>
  );
}
