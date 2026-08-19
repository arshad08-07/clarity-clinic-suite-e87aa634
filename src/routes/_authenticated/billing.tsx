import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { NewInvoiceDialog } from "@/components/new-invoice-dialog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useList, type Row } from "@/lib/api";
import { balanceOf, invoicePatientName, STATUS_LABEL } from "@/lib/billing";
import { downloadCsv, fmtDateTime, fmtMoney, titleize, toCsv } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — Vision Care HMS" },
      {
        name: "description",
        content: "Raise invoices, add catalog-priced line items, collect payments and track outstanding balances.",
      },
      { property: "og:title", content: "Billing — Vision Care HMS" },
      { property: "og:description", content: "Invoices, payments, refunds and outstanding balances in one place." },
    ],
  }),
  component: BillingPage,
  errorComponent: () => <EmptyState title="Could not load billing" description="Please refresh and try again." />,
});

function BillingPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const list = useList({
    table: "invoices",
    select: "id, invoice_no, invoice_type, status, is_legacy, subtotal, tax, discount, total, paid_amount, created_at, visit_id, patient_id, patients(id, mrn, first_name, last_name)",
    search,
    searchFields: ["invoice_no", "notes"],
    filters: { status },
    orderBy: "created_at",
    page,
    pageSize: 20,
  });

  const rows = list.data?.rows ?? [];
  const outstanding = rows.reduce((s, r) => s + balanceOf(r), 0);
  const billed = rows.reduce((s, r) => s + Number(r["total"] ?? 0), 0);
  const collected = rows.reduce((s, r) => s + Number(r["paid_amount"] ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Consultation, diagnostics, surgery, optical and pharmacy invoices with payments and refunds."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadCsv(
                  "invoices.csv",
                  toCsv(
                    rows.map((r) => ({
                      invoice_no: r["invoice_no"],
                      patient: invoicePatientName(r),
                      type: r["invoice_type"],
                      total: r["total"],
                      paid: r["paid_amount"],
                      balance: balanceOf(r),
                      status: r["status"],
                      raised: r["created_at"],
                    })),
                    [
                      { key: "invoice_no", label: "Invoice" },
                      { key: "patient", label: "Patient" },
                      { key: "type", label: "Type" },
                      { key: "total", label: "Total" },
                      { key: "paid", label: "Paid" },
                      { key: "balance", label: "Balance" },
                      { key: "status", label: "Status" },
                      { key: "raised", label: "Raised" },
                    ],
                  ),
                )
              }
            >
              Export CSV
            </Button>
            <NewInvoiceDialog trigger={<Button size="sm">New invoice</Button>} />
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Billed (page)" value={fmtMoney(billed)} />
        <StatCard label="Collected (page)" value={fmtMoney(collected)} />
        <StatCard label="Outstanding (page)" value={fmtMoney(outstanding)} />
      </div>

      <div className="surface-card mb-4 flex flex-wrap gap-2 p-4">
        <Input
          className="max-w-xs"
          placeholder="Search invoice no. or notes"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="No invoices" description="Raise the first invoice with “New invoice”." />
      ) : (
        <div className="surface-card overflow-x-auto p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Raised</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: Row) => {
                const st = String(r["status"]);
                return (
                  <TableRow key={String(r["id"])}>
                    <TableCell className="font-medium">
                      {String(r["invoice_no"])}
                      {r["is_legacy"] ? (
                        <span className="ml-2 text-xs text-muted-foreground">legacy</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{invoicePatientName(r)}</TableCell>
                    <TableCell>{titleize(String(r["invoice_type"]))}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDateTime(String(r["created_at"]))}
                    </TableCell>
                    <TableCell className="text-right">{fmtMoney(r["total"])}</TableCell>
                    <TableCell className="text-right">{fmtMoney(r["paid_amount"])}</TableCell>
                    <TableCell className="text-right">{fmtMoney(balanceOf(r))}</TableCell>
                    <TableCell>
                      <Badge variant={st === "paid" ? "secondary" : st === "unpaid" ? "destructive" : "default"}>
                        {STATUS_LABEL[st] ?? st}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/invoice/$invoiceId" params={{ invoiceId: String(r["id"]) }}>
                          Open
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {Math.max(1, Math.ceil((list.data?.count ?? 0) / 20))}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= Math.ceil((list.data?.count ?? 0) / 20)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
