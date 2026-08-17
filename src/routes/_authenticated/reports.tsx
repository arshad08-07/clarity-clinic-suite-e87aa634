import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ReceiptText, Scissors, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useCount, useList } from "@/lib/api";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Vision Care HMS" },
      { name: "description", content: "Clinic performance: volumes, revenue, surgery mix and expenses." },
      { property: "og:title", content: "Reports — Vision Care HMS" },
      {
        property: "og:description",
        content: "Clinic performance: volumes, revenue, surgery mix and expenses.",
      },
    ],
  }),
  component: Reports,
});

function Reports() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const from = monthStart.toISOString();

  const patients = useCount("patients", { gte: ["created_at", from] });
  const appointments = useCount("appointments", { gte: ["scheduled_at", from] });
  const surgeries = useCount("surgeries", { gte: ["created_at", from] });

  const invoices = useList({
    table: "invoices",
    select: "id, total, paid_amount, invoice_type",
    dateField: "created_at",
    dateFrom: from,
    pageSize: 500,
  });
  const expenses = useList({
    table: "expenses",
    select: "id, amount, category",
    dateField: "expense_date",
    dateFrom: from.slice(0, 10),
    pageSize: 500,
  });

  const rows = invoices.data?.rows ?? [];
  const collected = rows.reduce((s, r) => s + Number(r["paid_amount"] ?? 0), 0);
  const billed = rows.reduce((s, r) => s + Number(r["total"] ?? 0), 0);
  const spend = (expenses.data?.rows ?? []).reduce((s, r) => s + Number(r["amount"] ?? 0), 0);

  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    const key = String(r["invoice_type"] ?? "other");
    acc[key] = (acc[key] ?? 0) + Number(r["total"] ?? 0);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Reports" description="Month-to-date performance across clinical and commercial activity." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New patients" value={patients.data ?? 0} icon={Users} loading={patients.isLoading} />
        <StatCard label="Appointments" value={appointments.data ?? 0} icon={CalendarDays} tone="info" loading={appointments.isLoading} />
        <StatCard label="Surgeries" value={surgeries.data ?? 0} icon={Scissors} tone="success" loading={surgeries.isLoading} />
        <StatCard label="Collected" value={fmtMoney(collected)} icon={ReceiptText} tone="success" loading={invoices.isLoading} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Revenue by stream</h2>
          <ul className="mt-3 divide-y">
            {Object.entries(byType).length ? (
              Object.entries(byType).map(([type, amount]) => (
                <li key={type} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="capitalize">{type.replace(/_/g, " ")}</span>
                  <span className="tabular-nums">{fmtMoney(amount)}</span>
                </li>
              ))
            ) : (
              <li className="py-4 text-sm text-muted-foreground">No invoices this month.</li>
            )}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Financial summary</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Billed</dt>
              <dd className="tabular-nums">{fmtMoney(billed)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Collected</dt>
              <dd className="tabular-nums">{fmtMoney(collected)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Outstanding</dt>
              <dd className="tabular-nums">{fmtMoney(billed - collected)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Expenses</dt>
              <dd className="tabular-nums">{fmtMoney(spend)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2.5 font-medium">
              <dt>Net</dt>
              <dd className="tabular-nums">{fmtMoney(collected - spend)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
