import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { type Row } from "@/lib/api";
import { fmtDate, fmtDateTime, fmtMoney, titleize } from "@/lib/format";
import {
  isBatchControlled,
  poItemPending,
  PO_STATUSES,
  supplierBalance,
  useDeletePoItem,
  useGoodsReceipts,
  usePoItems,
  usePurchasableProducts,
  usePurchaseOrder,
  useReceiveGoods,
  useRecordSupplierPayment,
  useSavePoItem,
  useSupplierTransactions,
  useUpdatePurchaseOrder,
  type ReceiveLine,
} from "@/lib/procurement";

export const Route = createFileRoute("/_authenticated/purchase-order/$poId")({
  head: () => ({
    meta: [
      { title: "Purchase Order — Vision Care HMS" },
      {
        name: "description",
        content: "Purchase order lines, goods receipt, batch and expiry capture, and supplier payable history.",
      },
      { property: "og:title", content: "Purchase Order — Vision Care HMS" },
      { property: "og:description", content: "Order lines, goods receipts and supplier payables for a purchase order." },
    ],
  }),
  component: PurchaseOrderPage,
  errorComponent: () => (
    <EmptyState title="Could not load this purchase order" description="Please refresh and try again." />
  ),
  notFoundComponent: () => (
    <EmptyState title="Purchase order not found" description="This purchase order no longer exists." />
  ),
});

function statusTone(status: string) {
  if (status === "received") return "default";
  if (status === "cancelled") return "destructive";
  return "secondary";
}

function AddLineForm({ poId }: { poId: string }) {
  const products = usePurchasableProducts();
  const save = useSavePoItem(poId);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [tax, setTax] = useState("0");
  const [discount, setDiscount] = useState("0");

  const product = (products.data ?? []).find((p) => String(p["id"]) === productId);

  return (
    <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <Label>Product</Label>
        <Select
          value={productId}
          onValueChange={(v) => {
            setProductId(v);
            const p = (products.data ?? []).find((x) => String(x["id"]) === v);
            if (p) {
              setUnitCost(String(p["cost_price"] ?? 0));
              setTax(String(p["tax_percent"] ?? 0));
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {(products.data ?? []).map((p) => (
              <SelectItem key={String(p["id"])} value={String(p["id"])}>
                {String(p["name"])} ({String(p["sku"])})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Quantity</Label>
        <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </div>
      <div>
        <Label>Purchase rate</Label>
        <Input type="number" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
      </div>
      <div>
        <Label>Tax %</Label>
        <Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
      </div>
      <div>
        <Label>Discount</Label>
        <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
      </div>
      <div className="sm:col-span-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {product ? `Line total ${fmtMoney(
            Math.max(Number(quantity) * Number(unitCost) * (1 + Number(tax) / 100) - Number(discount), 0),
          )}` : "Pick a product to add it to this order."}
        </p>
        <Button
          disabled={!productId || save.isPending}
          onClick={() =>
            save.mutate(
              {
                product_id: productId,
                quantity: Number(quantity),
                unit_cost: Number(unitCost),
                tax_percent: Number(tax),
                discount: Number(discount),
              },
              {
                onSuccess: () => {
                  setProductId("");
                  setQuantity("1");
                  setUnitCost("0");
                  setTax("0");
                  setDiscount("0");
                },
              },
            )
          }
        >
          Add line
        </Button>
      </div>
    </div>
  );
}

interface DraftLine {
  received: string;
  rejected: string;
  cost: string;
  tax: string;
  batch: string;
  expiry: string;
}

function GoodsReceiptForm({ po, items }: { po: Row; items: Row[] }) {
  const { profile } = useAuth();
  const receive = useReceiveGoods(String(po["id"]));
  const [draft, setDraft] = useState<Record<string, DraftLine>>({});
  const [invoiceRef, setInvoiceRef] = useState("");
  const [notes, setNotes] = useState("");
  const [allowOver, setAllowOver] = useState(false);

  const open = items.filter((i) => poItemPending(i) > 0 || allowOver);
  const get = (item: Row): DraftLine =>
    draft[String(item["id"])] ?? {
      received: "",
      rejected: "0",
      cost: String(item["unit_cost"] ?? 0),
      tax: String(item["tax_percent"] ?? 0),
      batch: "",
      expiry: "",
    };
  const set = (item: Row, patch: Partial<DraftLine>) =>
    setDraft((prev) => ({ ...prev, [String(item["id"])]: { ...get(item), ...patch } }));

  if (!open.length) {
    return (
      <EmptyState
        title="Nothing left to receive"
        description="Every ordered line has been received in full. Tick 'authorise over-receipt' to record extra quantity."
      />
    );
  }

  const submit = () => {
    const lines: ReceiveLine[] = open
      .map((item) => {
        const d = get(item);
        const product = item["products"] as Row | null;
        return {
          purchase_order_item_id: String(item["id"]),
          product_id: String(item["product_id"] ?? product?.["id"] ?? ""),
          received_qty: Number(d.received || 0),
          rejected_qty: Number(d.rejected || 0),
          unit_cost: Number(d.cost || 0),
          tax_percent: Number(d.tax || 0),
          batch_no: d.batch || null,
          expiry_date: d.expiry || null,
        };
      })
      .filter((l) => l.received_qty > 0);
    receive.mutate(
      {
        po,
        lines,
        invoice_ref: invoiceRef || null,
        notes: notes || null,
        allow_over_receipt: allowOver,
        received_by: profile?.id ?? null,
      },
      { onSuccess: () => setDraft({}) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Ordered / received</TableHead>
              <TableHead>Receiving</TableHead>
              <TableHead>Rejected</TableHead>
              <TableHead>Actual rate</TableHead>
              <TableHead>Tax %</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {open.map((item) => {
              const d = get(item);
              const product = item["products"] as Row | null;
              const batched = isBatchControlled(product);
              return (
                <TableRow key={String(item["id"])}>
                  <TableCell>
                    <div className="font-medium">{String(product?.["name"] ?? "—")}</div>
                    <div className="text-xs text-muted-foreground">{String(product?.["sku"] ?? "")}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {String(item["quantity"])} / {String(item["received_qty"])}
                    <div className="text-xs text-muted-foreground">pending {poItemPending(item)}</div>
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-24"
                      type="number"
                      min="0"
                      value={d.received}
                      onChange={(e) => set(item, { received: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-20"
                      type="number"
                      min="0"
                      value={d.rejected}
                      onChange={(e) => set(item, { rejected: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      type="number"
                      step="0.01"
                      value={d.cost}
                      onChange={(e) => set(item, { cost: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-20"
                      type="number"
                      step="0.01"
                      value={d.tax}
                      onChange={(e) => set(item, { tax: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      placeholder={batched ? "Batch no." : "optional"}
                      value={d.batch}
                      onChange={(e) => set(item, { batch: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-36"
                      type="date"
                      value={d.expiry}
                      onChange={(e) => set(item, { expiry: e.target.value })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Supplier invoice ref.</Label>
          <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={allowOver} onCheckedChange={(v) => setAllowOver(v === true)} />
          Authorise receiving more than ordered
        </label>
        <Button onClick={submit} disabled={receive.isPending}>
          Complete goods receipt
        </Button>
      </div>
    </div>
  );
}

function SupplierLedger({ po }: { po: Row }) {
  const supplierId = po["supplier_id"] ? String(po["supplier_id"]) : null;
  const txns = useSupplierTransactions(supplierId);
  const pay = useRecordSupplierPayment(String(po["id"]));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [reference, setReference] = useState("");

  const rows = txns.data ?? [];
  const totals = useMemo(() => supplierBalance(rows), [rows]);

  if (!supplierId) return <EmptyState title="No supplier on this order" description="Add a supplier to track payables." />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Billed</p>
          <p className="text-xl font-semibold">{fmtMoney(totals.billed)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-xl font-semibold">{fmtMoney(totals.paid)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-xl font-semibold">{fmtMoney(totals.outstanding)}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4">
        <div>
          <Label>Payment amount</Label>
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label>Method</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["bank", "cash", "upi", "cheque", "card"].map((m) => (
                <SelectItem key={m} value={m}>
                  {titleize(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Reference</Label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={pay.isPending}
            onClick={() =>
              pay.mutate(
                {
                  supplier_id: supplierId,
                  purchase_order_id: String(po["id"]),
                  amount: Number(amount),
                  method,
                  reference: reference || null,
                },
                {
                  onSuccess: () => {
                    setAmount("");
                    setReference("");
                  },
                },
              )
            }
          >
            Record payment
          </Button>
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={String(t["id"])}>
                  <TableCell>{fmtDate(String(t["txn_date"]))}</TableCell>
                  <TableCell>{titleize(String(t["txn_type"]))}</TableCell>
                  <TableCell>{String(t["reference"] ?? "—")}</TableCell>
                  <TableCell>{t["method"] ? titleize(String(t["method"])) : "—"}</TableCell>
                  <TableCell className="text-right">{fmtMoney(Number(t["amount"] ?? 0))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState title="No supplier transactions yet" description="Bills appear here once goods are received." />
      )}
    </div>
  );
}

function PurchaseOrderPage() {
  const { poId } = useParams({ from: "/_authenticated/purchase-order/$poId" });
  const poQuery = usePurchaseOrder(poId);
  const itemsQuery = usePoItems(poId);
  const receipts = useGoodsReceipts(poId);
  const update = useUpdatePurchaseOrder(poId);
  const removeLine = useDeletePoItem(poId);

  if (poQuery.isLoading) return <Skeleton className="h-64 w-full" />;
  const po = poQuery.data;
  if (!po) return <EmptyState title="Purchase order not found" description="This purchase order no longer exists." />;

  const items = itemsQuery.data ?? [];
  const supplier = po["suppliers"] as Row | null;
  const status = String(po["status"]);
  const editable = status === "draft" || status === "sent";

  return (
    <div className="space-y-6">
      <PageHeader
        title={String(po["po_number"])}
        description={`${supplier?.["name"] ? String(supplier["name"]) : "No supplier"} · ordered ${fmtDate(
          String(po["order_date"]),
        )}${po["expected_date"] ? ` · expected ${fmtDate(String(po["expected_date"]))}` : ""}`}
        actions={
          <>
            <Badge variant={statusTone(status)}>{titleize(status.replace("_", " "))}</Badge>
            <Select value={status} onValueChange={(v) => update.mutate({ status: v })}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PO_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link to="/procurement">All orders</Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Order lines</TabsTrigger>
          <TabsTrigger value="receive">Goods receipt</TabsTrigger>
          <TabsTrigger value="history">Receipt history</TabsTrigger>
          <TabsTrigger value="payables">Supplier payables</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="mt-4 space-y-4">
          {editable ? <AddLineForm poId={poId} /> : null}
          {items.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Tax %</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const product = item["products"] as Row | null;
                    return (
                      <TableRow key={String(item["id"])}>
                        <TableCell>
                          <div className="font-medium">{String(product?.["name"] ?? "—")}</div>
                          <div className="text-xs text-muted-foreground">
                            {String(product?.["sku"] ?? "")} · in stock {String(product?.["stock_qty"] ?? 0)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{String(item["quantity"])}</TableCell>
                        <TableCell className="text-right">{String(item["received_qty"])}</TableCell>
                        <TableCell className="text-right">{fmtMoney(Number(item["unit_cost"] ?? 0))}</TableCell>
                        <TableCell className="text-right">{String(item["tax_percent"] ?? 0)}</TableCell>
                        <TableCell className="text-right">{fmtMoney(Number(item["discount"] ?? 0))}</TableCell>
                        <TableCell className="text-right">{fmtMoney(Number(item["amount"] ?? 0))}</TableCell>
                        <TableCell className="text-right">
                          {Number(item["received_qty"] ?? 0) === 0 ? (
                            <Button size="sm" variant="ghost" onClick={() => removeLine.mutate(item)}>
                              Remove
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={6} className="text-right font-medium">
                      Purchase order total
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtMoney(Number(po["total_amount"] ?? 0))}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState title="No lines yet" description="Add products, quantities and purchase rates to this order." />
          )}
        </TabsContent>

        <TabsContent value="receive" className="mt-4">
          <GoodsReceiptForm po={po} items={items} />
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          {(receipts.data ?? []).length ? (
            (receipts.data ?? []).map((grn) => (
              <div key={String(grn["id"])} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{String(grn["grn_no"])}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(String(grn["received_at"]))}
                      {grn["invoice_ref"] ? ` · supplier invoice ${String(grn["invoice_ref"])}` : ""}
                    </p>
                  </div>
                  {grn["allow_over_receipt"] ? <Badge variant="outline">Over-receipt authorised</Badge> : null}
                </div>
                <Table className="mt-3">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((grn["goods_receipt_items"] ?? []) as Row[]).map((line) => {
                      const product = line["products"] as Row | null;
                      return (
                        <TableRow key={String(line["id"])}>
                          <TableCell>{String(product?.["name"] ?? "—")}</TableCell>
                          <TableCell className="text-right">{String(line["received_qty"])}</TableCell>
                          <TableCell className="text-right">{String(line["rejected_qty"])}</TableCell>
                          <TableCell className="text-right">{String(line["accepted_qty"])}</TableCell>
                          <TableCell>{String(line["batch_no"] ?? "—")}</TableCell>
                          <TableCell>{line["expiry_date"] ? fmtDate(String(line["expiry_date"])) : "—"}</TableCell>
                          <TableCell className="text-right">{fmtMoney(Number(line["unit_cost"] ?? 0))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))
          ) : (
            <EmptyState title="No goods received yet" description="Completed receipts appear here with batch details." />
          )}
        </TabsContent>

        <TabsContent value="payables" className="mt-4">
          <SupplierLedger po={po} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
