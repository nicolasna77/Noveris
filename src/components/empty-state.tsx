import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "invite",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "invite" | "neutral";
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-5">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          tone === "invite"
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-48 flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
