import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  CalendarDays,
  CircleDot,
  ListOrdered,
  Package,
  ReceiptText,
  Scissors,
  Undo2,
  Users,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useCount, useList, useRpc } from "@/lib/api";
import { fmtMoney, fmtTime, titleize } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Clinic Dashboard — Vision Care HMS" },
      {
        name: "description",
        content:
          "Live clinic overview: today's appointments, waiting queue, surgeries, revenue and low stock.",
      },
      { property: "og:title", content: "Clinic Dashboard — Vision Care HMS" },
      {
        property: "og:description",
        content:
          "Live clinic overview: today's appointments, waiting queue, surgeries, revenue and low stock.",
      },
    ],
  }),
  component: Dashboard,
});

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    day: isoDay(start),
    weekFrom: isoDay(weekStart),
    monthFrom: isoDay(monthStart),
  };
}

interface CollectionRow {
  collected: number;
  refunds: number;
  net: number;
  txns: number;
}


function Dashboard() {
  const { profile } = useAuth();
  const { start, end, day, weekFrom, monthFrom } = dayBounds();

  const patients = useCount("patients", { filters: { is_active: true } });
  const todayAppointments = useCount("appointments", {
    gte: ["scheduled_at", start],
    lte: ["scheduled_at", end],
  });
  const waiting = useCount("visits", { filters: { status: "waiting" } });
  const plannedSurgeries = useCount("surgeries", { filters: { status: "scheduled" } });

  const appointments = useList({
    table: "appointments",
    select: "id, scheduled_at, status, reason, patients(first_name, last_name, mrn)",
    orderBy: "scheduled_at",
    ascending: true,
    dateField: "scheduled_at",
    dateFrom: start,
    dateTo: end,
    pageSize: 8,
  });

  const queue = useList({
    table: "visits",
    select: "id, token_no, status, chief_complaint, patients(first_name, last_name, mrn)",
    orderBy: "checked_in_at",
    ascending: true,
    pageSize: 8,
  });

  const surgeries = useList({
    table: "surgeries",
    select: "id, procedure, eye, status, scheduled_at, patients(first_name, last_name)",
    orderBy: "scheduled_at",
    ascending: true,
    pageSize: 6,
  });

  /* Money actually received: aggregated from payment transactions in the database. */
  const collectedToday = useRpc<CollectionRow[]>("collection_totals", { _from: day, _to: day });
  const collectedWeek = useRpc<CollectionRow[]>("collection_totals", { _from: weekFrom, _to: day });
  const collectedMonth = useRpc<CollectionRow[]>("collection_totals", { _from: monthFrom, _to: day });
  const receivables = useRpc<{ billed: number; settled: number; outstanding: number }[]>(
    "receivables_summary",
    {},
  );


  const followUps = useList({
    table: "follow_ups",
    select: "id, due_date, type, status, patients(first_name, last_name)",
    orderBy: "due_date",
    ascending: true,
    filters: { status: "upcoming" },
    dateField: "due_date",
    dateTo: day,
    pageSize: 6,
  });

  const lowStock = useList({
    table: "low_stock_products",
    select: "id, name, sku, available_quantity, reorder_level",
    orderBy: "available_quantity",
    ascending: true,
    pageSize: 6,
  });


  const today = collectedToday.data?.[0];
  const week = collectedWeek.data?.[0];
  const month = collectedMonth.data?.[0];
  const revenue = Number(today?.collected ?? 0);
  const refundsToday = Number(today?.refunds ?? 0);
  const outstanding = Number(receivables.data?.[0]?.outstanding ?? 0);


  const name = (row: Record<string, unknown>) => {
    const p = row["patients"] as { first_name?: string; last_name?: string; mrn?: string } | null;
    if (!p) return "—";
    return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—";
  };

  return (
    <div>
      <PageHeader
        title={`Good day${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description="Everything happening across the clinic today."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/queue">Open queue</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/appointments">New appointment</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active patients" value={patients.data ?? 0} icon={Users} loading={patients.isLoading} />
        <StatCard
          label="Appointments today"
          value={todayAppointments.data ?? 0}
          icon={CalendarDays}
          tone="info"
          loading={todayAppointments.isLoading}
        />
        <StatCard label="Waiting now" value={waiting.data ?? 0} icon={ListOrdered} tone="warning" loading={waiting.isLoading} />
        <StatCard
          label="Surgeries scheduled"
          value={plannedSurgeries.data ?? 0}
          icon={Scissors}
          tone="success"
          loading={plannedSurgeries.isLoading}
        />
        <StatCard label="Collected today" value={fmtMoney(revenue)} icon={ReceiptText} tone="success" loading={collectedToday.isLoading} />
        <StatCard label="Collected this week" value={fmtMoney(Number(week?.collected ?? 0))} icon={ReceiptText} tone="info" loading={collectedWeek.isLoading} />
        <StatCard label="Collected this month" value={fmtMoney(Number(month?.collected ?? 0))} icon={ReceiptText} tone="info" loading={collectedMonth.isLoading} />
        <StatCard label="Refunds today" value={fmtMoney(refundsToday)} icon={Undo2} tone="warning" loading={collectedToday.isLoading} />
        <StatCard label="Outstanding" value={fmtMoney(outstanding)} icon={Activity} tone="destructive" loading={receivables.isLoading} />
        <StatCard label="Follow-ups due" value={followUps.data?.count ?? 0} icon={CircleDot} tone="info" loading={followUps.isLoading} />

        <StatCard label="Low stock items" value={lowStock.data?.count ?? 0} icon={Package} tone="warning" loading={lowStock.isLoading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Today&apos;s schedule</h2>
            <Button asChild variant="link" size="sm">
              <Link to="/appointments">View all</Link>
            </Button>
          </div>
          {appointments.data?.rows.length ? (
            <ul className="divide-y">
              {appointments.data.rows.map((row) => (
                <li key={String(row["id"])} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name(row)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {String(row["reason"] ?? "Consultation")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums">{fmtTime(String(row["scheduled_at"]))}</span>
                    <Badge variant="secondary">{titleize(String(row["status"]))}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No appointments today" description="Bookings will appear here as they are made." />
          )}
        </section>

        <section className="surface-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Live queue</h2>
            <Button asChild variant="link" size="sm">
              <Link to="/queue">Manage</Link>
            </Button>
          </div>
          {queue.data?.rows.length ? (
            <ul className="divide-y">
              {queue.data.rows.map((row) => (
                <li key={String(row["id"])} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                      {String(row["token_no"] ?? "—")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{name(row)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {String(row["chief_complaint"] ?? "—")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{titleize(String(row["status"]))}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Queue is empty" description="Checked-in patients show up here." />
          )}
        </section>

        <section className="surface-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Upcoming surgeries</h2>
            <Button asChild variant="link" size="sm">
              <Link to="/surgeries">View all</Link>
            </Button>
          </div>
          {surgeries.data?.rows.length ? (
            <ul className="divide-y">
              {surgeries.data.rows.map((row) => (
                <li key={String(row["id"])} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name(row)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {String(row["procedure"])} · {String(row["eye"])}
                    </p>
                  </div>
                  <Badge variant="secondary">{titleize(String(row["status"]))}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No surgeries booked" description="Plan a procedure from the surgery module." />
          )}
        </section>

        <section className="surface-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Low stock</h2>
            <Button asChild variant="link" size="sm">
              <Link to="/inventory">Inventory</Link>
            </Button>
          </div>
          {lowStock.data?.rows.length ? (
            <ul className="divide-y">
              {lowStock.data.rows.map((row) => (
                <li key={String(row["id"])} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{String(row["name"])}</p>
                    <p className="truncate text-xs text-muted-foreground">{String(row["sku"])}</p>
                  </div>
                  <Badge variant="destructive">{String(row["available_quantity"])} left</Badge>

                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing stocked yet" description="Add products to start tracking stock." />
          )}
        </section>
      </div>
    </div>
  );
}
