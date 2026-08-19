import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLookup, type Row } from "@/lib/api";
import {
  balanceOf,
  invoicePatientName,
  PAYMENT_METHODS,
  printReceipt,
  SOURCE_TYPES,
  STATUS_LABEL,
  useAddInvoiceItem,
  useDeleteInvoiceItem,
  useDeletePayment,
  useInvoice,
  useInvoiceItems,
  useInvoicePayments,
  useRecordPayment,
  useUpdateInvoice,
} from "@/lib/billing";
import { fmtDateTime, fmtMoney, titleize } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/invoice/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Invoice — Vision Care HMS" },
      {
        name: "description",
        content: "Invoice line items, taxes, discounts, payments, refunds and receipt for a patient bill.",
      },
      { property: "og:title", content: "Invoice — Vision Care HMS" },
      { property: "og:description", content: "Line items, payments and receipt for a patient invoice." },
    ],
  }),
  component: InvoicePage,
  errorComponent: () => <EmptyState title="Could not load this invoice" description="Please refresh and try again." />,
  notFoundComponent: () => <EmptyState title="Invoice not found" description="This invoice no longer exists." />,
});

/** Catalog-driven charge picker: prices always come from the clinical catalog. */
function useCatalog(source: string) {
  const tests = useLookup("diagnostic_tests", "id, code, name, price", {
    filters: { is_active: true },
    orderBy: "name",
    enabled: source === "diagnostics",
  });
  const products = useLookup("products", "id, sku, name, selling_price, tax_percent, category", {
    filters: { is_active: true },
    orderBy: "name",
    enabled: source === "pharmacy" || source === "optical",
  });
  const iols = useLookup("iol_models", "id, name, model_code, price", {
    filters: { is_active: true },
    orderBy: "name",
    enabled: source === "surgery",
  });

  return useMemo(() => {
    if (source === "diagnostics")
      return (tests.data ?? []).map((r) => ({
        id: String(r["id"]),
        label: `${String(r["name"])} (${String(r["code"])})`,
        price: Number(r["price"] ?? 0),
        tax: 0,
        ref: String(r["code"] ?? ""),
        productId: null as string | null,
      }));
    if (source === "pharmacy" || source === "optical")
      return (products.data ?? [])
        .filter((r) =>
          source === "optical"
            ? ["frame", "lens", "contact_lens"].includes(String(r["category"]))
            : String(r["category"]) === "medicine" || String(r["category"]) === "consumable",
        )
        .map((r) => ({
          id: String(r["id"]),
          label: `${String(r["name"])} (${String(r["sku"])})`,
          price: Number(r["selling_price"] ?? 0),
          tax: Number(r["tax_percent"] ?? 0),
          ref: String(r["sku"] ?? ""),
          productId: String(r["id"]),
        }));
    if (source === "surgery")
      return (iols.data ?? []).map((r) => ({
        id: String(r["id"]),
        label: `${String(r["name"])}${r["model_code"] ? ` (${String(r["model_code"])})` : ""}`,
        price: Number(r["price"] ?? 0),
        tax: 0,
        ref: String(r["model_code"] ?? ""),
        productId: null as string | null,
      }));
    return [];
  }, [source, tests.data, products.data, iols.data]);
}

function InvoicePage() {
  const { invoiceId } = useParams({ from: "/_authenticated/invoice/$invoiceId" });
  const invoice = useInvoice(invoiceId);
  const items = useInvoiceItems(invoiceId);
  const payments = useInvoicePayments(invoiceId);
  const addItem = useAddInvoiceItem(invoiceId);
  const delItem = useDeleteInvoiceItem(invoiceId);
  const pay = useRecordPayment(invoiceId);
  const delPay = useDeletePayment(invoiceId);
  const updateInvoice = useUpdateInvoice(invoiceId);

  const [source, setSource] = useState("consultation");
  const [catalogId, setCatalogId] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [tax, setTax] = useState("0");
  const [ref, setRef] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [payRef, setPayRef] = useState("");
  const [discount, setDiscount] = useState<string | null>(null);

  const catalog = useCatalog(source);
  const inv = invoice.data;

  if (invoice.isLoading) return <Skeleton className="h-96 w-full" />;
  if (!inv) return <EmptyState title="Invoice not found" description="This invoice no longer exists." />;

  const balance = balanceOf(inv);
  const status = String(inv["status"]);

  const pickCatalog = (id: string) => {
    setCatalogId(id);
    const c = catalog.find((x) => x.id === id);
    if (!c) return;
    setDescription(c.label);
    setPrice(String(c.price));
    setTax(String(c.tax));
    setRef(c.ref);
  };

  const submitItem = () => {
    const c = catalog.find((x) => x.id === catalogId);
    addItem.mutate(
      {
        description: description || c?.label || titleize(source),
        item_type: source,
        source_type: source,
        source_id: inv["visit_id"] && source === "consultation" ? inv["visit_id"] : catalogId || null,
        source_ref: ref || null,
        product_id: c?.productId ?? null,
        quantity: Number(qty || 1),
        unit_price: Number(price || 0),
        tax_percent: Number(tax || 0),
        amount: Number(qty || 1) * Number(price || 0) * (1 + Number(tax || 0) / 100),
      },
      {
        onSuccess: () => {
          setCatalogId("");
          setDescription("");
          setQty("1");
          setPrice("");
          setTax("0");
          setRef("");
        },
      },
    );
  };

  const submitPayment = (refund: boolean) => {
    const amount = Number(payAmount || 0);
    if (!amount) return;
    pay.mutate(
      { amount, method: payMethod, reference: payRef, refund },
      {
        onSuccess: () => {
          setPayAmount("");
          setPayRef("");
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={`Invoice ${String(inv["invoice_no"])}`}
        description={`${invoicePatientName(inv)} · ${titleize(String(inv["invoice_type"]))} · raised ${fmtDateTime(String(inv["created_at"]))}`}
        actions={
          <>
            {inv["is_legacy"] ? <Badge variant="outline">Legacy · read only</Badge> : null}
            <Badge variant={status === "paid" ? "secondary" : status === "unpaid" ? "destructive" : "default"}>
              {STATUS_LABEL[status] ?? status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => printReceipt(inv, items.data ?? [], payments.data ?? [])}
            >
              Print receipt
            </Button>
            {inv["visit_id"] ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/visit/$visitId" params={{ visitId: String(inv["visit_id"]) }}>
                  Visit
                </Link>
              </Button>
            ) : null}
            {inv["patient_id"] ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/patient/$patientId" params={{ patientId: String(inv["patient_id"]) }}>
                  Patient record
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <Link to="/billing">All invoices</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="surface-card p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Line items</h2>
            {items.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (items.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No charges yet — add the first line item below.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items.data ?? []).map((it: Row) => (
                    <TableRow key={String(it["id"])}>
                      <TableCell className="font-medium">{String(it["description"])}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {titleize(String(it["source_type"] ?? it["item_type"]))}
                        {it["source_ref"] ? ` · ${String(it["source_ref"])}` : ""}
                      </TableCell>
                      <TableCell className="text-right">{String(it["quantity"])}</TableCell>
                      <TableCell className="text-right">{fmtMoney(it["unit_price"])}</TableCell>
                      <TableCell className="text-right">{String(it["tax_percent"])}%</TableCell>
                      <TableCell className="text-right">{fmtMoney(it["amount"])}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={delItem.isPending}
                          onClick={() => delItem.mutate(String(it["id"]))}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="mb-1 font-display text-base font-semibold">Add charge</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Prices are pulled from the clinical catalog; adjust only where the clinic allows.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Source</Label>
                <Select
                  value={source}
                  onValueChange={(v) => {
                    setSource(v);
                    setCatalogId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {catalog.length > 0 && (
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label>Catalog item</Label>
                  <Select value={catalogId} onValueChange={pickCatalog}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select from catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} · {fmtMoney(c.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Reference</Label>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Order / SKU / code" />
              </div>
              <div className="grid gap-1.5">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Unit price</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Tax %</Label>
                <Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
            </div>
            <Button className="mt-4" onClick={submitItem} disabled={addItem.isPending || !price}>
              Add line item
            </Button>
          </section>

          <section className="surface-card p-5">
            <h2 className="mb-3 font-display text-base font-semibold">Payment history</h2>
            {(payments.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing collected yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(payments.data ?? []).map((p: Row) => {
                    const amt = Number(p["amount"]);
                    return (
                      <TableRow key={String(p["id"])}>
                        <TableCell>{fmtDateTime(String(p["paid_at"]))}</TableCell>
                        <TableCell>{titleize(String(p["method"]))}</TableCell>
                        <TableCell>{p["reference"] ? String(p["reference"]) : "—"}</TableCell>
                        <TableCell className="text-right">
                          {amt < 0 ? <Badge variant="outline">Refund</Badge> : null} {fmtMoney(amt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={delPay.isPending}
                            onClick={() => delPay.mutate(String(p["id"]))}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="surface-card space-y-2 p-5 text-sm">
            <h2 className="font-display text-base font-semibold">Summary</h2>
            <SummaryLine label="Subtotal" value={fmtMoney(inv["subtotal"])} />
            <SummaryLine label="Tax" value={fmtMoney(inv["tax"])} />
            <SummaryLine label="Discount" value={`-${fmtMoney(inv["discount"])}`} />
            <SummaryLine label="Total" value={fmtMoney(inv["total"])} strong />
            <SummaryLine label="Paid" value={fmtMoney(inv["paid_amount"])} />
            <SummaryLine label="Balance" value={fmtMoney(balance)} strong />
            <div className="grid gap-1.5 pt-2">
              <Label>Discount</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={discount ?? String(inv["discount"] ?? 0)}
                  onChange={(e) => setDiscount(e.target.value)}
                />
                <Button
                  variant="outline"
                  disabled={updateInvoice.isPending}
                  onClick={() => updateInvoice.mutate({ discount: Number(discount ?? inv["discount"] ?? 0) })}
                >
                  Apply
                </Button>
              </div>
            </div>
          </section>

          <section className="surface-card space-y-3 p-5">
            <h2 className="font-display text-base font-semibold">Collect payment</h2>
            <div className="grid gap-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={String(balance)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {titleize(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Reference</Label>
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Txn / receipt no." />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => submitPayment(false)} disabled={pay.isPending || !payAmount}>
                Record payment
              </Button>
              <Button variant="outline" onClick={() => setPayAmount(String(balance))} disabled={balance <= 0}>
                Pay full balance
              </Button>
              <Button variant="ghost" onClick={() => submitPayment(true)} disabled={pay.isPending || !payAmount}>
                Record refund
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Payments cannot exceed the invoice total, and refunds cannot exceed what was collected.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "border-t pt-2 font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
