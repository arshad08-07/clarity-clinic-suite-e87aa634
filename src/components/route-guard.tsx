import { Link, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { canVisit } from "@/lib/navigation";

/**
 * Page-level permission gate. This mirrors the database rules so unauthorised
 * users get a clear message instead of a screen full of failed queries — the
 * real enforcement stays in RLS.
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const { roles, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (loading) return null;

  if (!canVisit(pathname, roles)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </span>
        <h1 className="font-display text-xl font-semibold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          Your current role does not have permission to open this section. Ask an administrator if
          you need access.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
