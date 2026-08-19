import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, CalendarDays, ReceiptText, Undo2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLookup, useRpc } from "@/lib/api";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Vision Care HMS" },
      { name: "description", content: "Clinic performance: collections, revenue streams, refunds and expenses." },
      { property: "og:title", content: "Reports — Vision Care HMS" },
      {
        property: "og:description",
        content: "Clinic performance: collections, revenue streams, refunds and expenses.",
      },
    ],
  }),
  component: Reports,
});

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CollectionRow {
  collected: number;
  refunds: number;
  net: number;
  txns: number;
}

const PAYMENT_METHODS = ["cash", "card", "upi", "bank_transfer", "cheque", "insurance", "other"];

function Reports() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(isoDay(monthStart));
  const [to, setTo] = useState(isoDay(today));
  const [branch, setBranch] = useState("all");
  const [method, setMethod] = useState("all");

  const branches = useLookup("branches", "id, name", { orderBy: "name" });

  const branchArg = branch === "all" ? null : branch;
  const range = { _from: from, _to: to, _branch: branchArg };

  /* Every figure below is aggregated in the database over the full matching
     dataset — no client-side paging or row caps. */
  const collections = useRpc<CollectionRow[]>("collection_totals", { ...range, _method: method });
  const daily = useRpc<{ day: string; collected: number; refunds: number; net: number }[]>(
    "collection_by_day",
    { ...range, _method: method },
  );
  const byMethod = useRpc<{ method: string; collected: number; refunds: number; net: number }[]>(
    "collection_by_method",
    range,
  );
  const receivables = useRpc<{ billed: number; settled: number; outstanding: number; invoices: number }[]>(
    "receivables_summary",
    range,
  );
  const streams = useRpc<{ invoice_type: string; billed: number; collected: number; invoices: number }[]>(
    "revenue_by_stream",
    range,
  );
  const spend = useRpc<number>("expense_total", range);

  const totals = collections.data?.[0];
  const collected = Number(totals?.collected ?? 0);
  const refunds = Number(totals?.refunds ?? 0);
  const net = Number(totals?.net ?? 0);
  const receivable = receivables.data?.[0];
  const expenses = Number(spend.data ?? 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Collections are derived from actual payment transactions in the selected period."
      />

      <section className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Branch</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger>
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branches.data ?? []).map((b) => (
                <SelectItem key={String(b["id"])} value={String(b["id"])}>
                  {String(b["name"])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected" value={fmtMoney(collected)} icon={ReceiptText} tone="success" loading={collections.isLoading} />
        <StatCard label="Refunds" value={fmtMoney(refunds)} icon={Undo2} tone="warning" loading={collections.isLoading} />
        <StatCard label="Net received" value={fmtMoney(net)} icon={Banknote} tone="info" loading={collections.isLoading} />
        <StatCard
          label="Outstanding"
          value={fmtMoney(Number(receivable?.outstanding ?? 0))}
          icon={CalendarDays}
          tone="destructive"
          loading={receivables.isLoading}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Daily collections</h2>
          <ul className="mt-3 divide-y">
            {daily.data?.length ? (
              daily.data.map((row) => (
                <li key={row.day} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="tabular-nums">{row.day}</span>
                  <span className="flex items-center gap-3">
                    {Number(row.refunds) > 0 && (
                      <span className="text-xs text-muted-foreground">−{fmtMoney(Number(row.refunds))}</span>
                    )}
                    <span className="tabular-nums">{fmtMoney(Number(row.collected))}</span>
                  </span>
                </li>
              ))
            ) : (
              <li className="py-4 text-sm text-muted-foreground">No payments in this period.</li>
            )}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Collections by method</h2>
          <ul className="mt-3 divide-y">
            {byMethod.data?.length ? (
              byMethod.data.map((row) => (
                <li key={row.method} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="capitalize">{String(row.method).replace(/_/g, " ")}</span>
                  <span className="tabular-nums">{fmtMoney(Number(row.net))}</span>
                </li>
              ))
            ) : (
              <li className="py-4 text-sm text-muted-foreground">No payments in this period.</li>
            )}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Revenue by stream</h2>
          <ul className="mt-3 divide-y">
            {streams.data?.length ? (
              streams.data.map((row) => (
                <li key={row.invoice_type} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="capitalize">{String(row.invoice_type).replace(/_/g, " ")}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      received {fmtMoney(Number(row.collected))}
                    </span>
                    <span className="tabular-nums">{fmtMoney(Number(row.billed))}</span>
                  </span>
                </li>
              ))
            ) : (
              <li className="py-4 text-sm text-muted-foreground">No invoices in this period.</li>
            )}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="font-display text-base font-semibold">Financial summary</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Billed</dt>
              <dd className="tabular-nums">{fmtMoney(Number(receivable?.billed ?? 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Collected (payments)</dt>
              <dd className="tabular-nums">{fmtMoney(collected)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Refunds</dt>
              <dd className="tabular-nums">{fmtMoney(refunds)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Outstanding</dt>
              <dd className="tabular-nums">{fmtMoney(Number(receivable?.outstanding ?? 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Expenses</dt>
              <dd className="tabular-nums">{fmtMoney(expenses)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2.5 font-medium">
              <dt>Net</dt>
              <dd className="tabular-nums">{fmtMoney(net - expenses)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
