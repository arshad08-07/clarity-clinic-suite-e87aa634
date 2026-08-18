import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Icons from "lucide-react";
import { Bell, LogOut, Menu, Eye } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RouteGuard } from "@/components/route-guard";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { ROLE_LABELS, useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useList } from "@/lib/api";
import { visibleNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function NavIcon({ name, className }: { name: string; className?: string }) {
  const Lucide = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <Lucide className={className} />;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const groups = visibleNav(roles);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Eye className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold">Vision Care</p>
          <p className="text-xs text-sidebar-foreground/60">Eye Hospital HMS</p>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3 pb-6">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/45">
              {group.label}
            </p>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <NavIcon name={item.icon} className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, roles, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const notifications = useList({
    table: "notifications",
    filters: { is_read: false },
    pageSize: 5,
    enabled: !!user,
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border lg:block no-print">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur no-print">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">
              {profile?.full_name || user?.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {roles.map((r) => ROLE_LABELS[r]).join(" · ") || "No role assigned"}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="size-5" />
                {notifications.data?.count ? (
                  <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.data?.rows.length ? (
                notifications.data.rows.map((n) => (
                  <DropdownMenuItem key={String(n["id"])} className="flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">{String(n["title"])}</span>
                    <span className="text-xs text-muted-foreground">{String(n["body"] ?? "")}</span>
                  </DropdownMenuItem>
                ))
              ) : (
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  You&apos;re all caught up
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span>{profile?.full_name || "Staff member"}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <span className="flex flex-wrap gap-1 pt-1">
                  {roles.map((r) => (
                    <Badge key={r} variant="secondary" className="text-[10px]">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void handleSignOut()}>
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6">
          <RouteGuard>{children}</RouteGuard>
        </main>

      </div>
    </div>
  );
}
