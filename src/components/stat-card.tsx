import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  loading,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string | undefined;
  loading?: boolean | undefined;
  tone?: "primary" | "success" | "warning" | "info" | "destructive";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    info: "bg-info/15 text-info",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];

  return (
    <div className="surface-card flex items-center gap-4 p-4">
      {Icon ? (
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg", toneClass)}>
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1 h-7 w-16" />
        ) : (
          <p className="font-display text-2xl font-semibold">{value}</p>
        )}
        {hint ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
