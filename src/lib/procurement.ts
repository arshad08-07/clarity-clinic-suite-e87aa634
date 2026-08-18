import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";

/**
 * Procurement → Inventory.
 *
 * Stock increase, batch creation and stock movements are performed by the
 * database triggers on `goods_receipt_items` (grn_item_apply →
 * stock_movements → stock_movement_apply), so a goods receipt updates
 * inventory exactly once and always leaves an audit trail.
 */

export const PO_SELECT =
  "id, po_number, status, order_date, expected_date, total_amount, notes, supplier_id, branch_id, created_at, " +
  "suppliers(id, name, contact_person, phone, email, gst_no, address), branches(id, name)";

export const PO_ITEM_SELECT =
  "id, purchase_order_id, product_id, quantity, received_qty, unit_cost, tax_percent, discount, amount, " +
  "products(id, name, sku, category, unit, selling_price, stock_qty)";

export const PO_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent to supplier" },
  { value: "partially_received", label: "Partially received" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
] as const;

/** Categories where a batch number / expiry is expected. */
const BATCH_CATEGORIES = ["medicine", "consumable", "contact_lens", "iol"];

export function isBatchControlled(product: Row | null | undefined) {
  return BATCH_CATEGORIES.includes(String(product?.["category"] ?? ""));
}

export function poItemPending(item: Row) {
  return Math.max(Number(item["quantity"] ?? 0) - Number(item["received_qty"] ?? 0), 0);
}

export function usePurchaseOrder(poId: string) {
  return useQuery({
    queryKey: ["purchase-order", poId],
    enabled: !!poId,
    queryFn: async () => {
      const { data, error } = await db.from("purchase_orders").select(PO_SELECT).eq("id", poId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Row | null;
    },
  });
}

export function usePoItems(poId: string) {
  return useQuery({
    queryKey: ["po-items", poId],
    enabled: !!poId,
    queryFn: async () => {
      const { data, error } = await db
        .from("purchase_order_items")
        .select(PO_ITEM_SELECT)
        .eq("purchase_order_id", poId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useGoodsReceipts(poId: string) {
  return useQuery({
    queryKey: ["goods-receipts", poId],
    enabled: !!poId,
    queryFn: async () => {
      const { data, error } = await db
        .from("goods_receipts")
        .select(
          "id, grn_no, received_at, invoice_ref, notes, allow_over_receipt, purchase_order_id, " +
            "goods_receipt_items(id, received_qty, rejected_qty, accepted_qty, unit_cost, tax_percent, batch_no, expiry_date, product_id, products(id, name, sku))",
        )
        .eq("purchase_order_id", poId)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useSupplierTransactions(supplierId: string | null | undefined) {
  return useQuery({
    queryKey: ["supplier-transactions", supplierId ?? ""],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await db
        .from("supplier_transactions")
        .select("id, txn_type, amount, method, reference, txn_date, notes, purchase_order_id, goods_receipt_id, created_at")
        .eq("supplier_id", supplierId)
        .order("txn_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function supplierBalance(rows: Row[]) {
  let billed = 0;
  let paid = 0;
  for (const r of rows) {
    if (String(r["txn_type"]) === "payment") paid += Number(r["amount"] ?? 0);
    else billed += Number(r["amount"] ?? 0);
  }
  return { billed, paid, outstanding: Math.max(billed - paid, 0) };
}

export function usePurchasableProducts() {
  return useQuery({
    queryKey: ["purchasable-products"],
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select("id, sku, name, brand, unit, category, cost_price, selling_price, tax_percent, stock_qty")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, poId?: string) {
  void qc.invalidateQueries({ queryKey: ["purchase-order", poId ?? ""] });
  void qc.invalidateQueries({ queryKey: ["po-items", poId ?? ""] });
  void qc.invalidateQueries({ queryKey: ["goods-receipts", poId ?? ""] });
  void qc.invalidateQueries({ queryKey: ["supplier-transactions"] });
  void qc.invalidateQueries({ queryKey: ["purchasable-products"] });
  void qc.invalidateQueries({ queryKey: ["list"] });
  void qc.invalidateQueries({ queryKey: ["lookup"] });
  void qc.invalidateQueries({ queryKey: ["count"] });
}

/** Creates a purchase order with a server-generated number from next_po_no(). */
export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      supplier_id: string;
      branch_id?: string | null;
      order_date?: string;
      expected_date?: string | null;
      notes?: string | null;
    }) => {
      const { data: no, error: noErr } = await db.rpc("next_po_no");
      if (noErr) throw noErr;
      const { data, error } = await db
        .from("purchase_orders")
        .insert({
          po_number: no,
          supplier_id: values.supplier_id,
          branch_id: values.branch_id ?? null,
          order_date: values.order_date ?? new Date().toISOString().slice(0, 10),
          expected_date: values.expected_date || null,
          notes: values.notes ?? null,
          status: "draft",
        })
        .select("id, po_number")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (po) => {
      toast.success(`Purchase order ${String(po["po_number"])} created`);
      invalidate(qc, String(po["id"]));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useSavePoItem(poId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { id, ...rest } = values;
      const payload = { ...rest, purchase_order_id: poId };
      if (id) {
        const { error } = await db.from("purchase_order_items").update(payload).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await db.from("purchase_order_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Line saved");
      invalidate(qc, poId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeletePoItem(poId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Row) => {
      if (Number(item["received_qty"] ?? 0) > 0) throw new Error("This line has already been received");
      const { error } = await db.from("purchase_order_items").delete().eq("id", item["id"]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Line removed");
      invalidate(qc, poId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdatePurchaseOrder(poId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { error } = await db.from("purchase_orders").update(values).eq("id", poId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Purchase order updated");
      invalidate(qc, poId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export interface ReceiveLine {
  purchase_order_item_id: string;
  product_id: string;
  received_qty: number;
  rejected_qty: number;
  unit_cost: number;
  tax_percent: number;
  batch_no?: string | null;
  expiry_date?: string | null;
  selling_price?: number | null;
}

export interface ReceiveInput {
  po: Row;
  lines: ReceiveLine[];
  invoice_ref?: string | null;
  notes?: string | null;
  allow_over_receipt?: boolean;
  received_by?: string | null;
}

/** One goods receipt = one GRN + its accepted lines (stock handled by triggers). */
export function useReceiveGoods(poId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReceiveInput) => {
      const lines = input.lines.filter((l) => Number(l.received_qty) > 0);
      if (!lines.length) throw new Error("Enter a received quantity for at least one line");

      const { data: grn, error: grnErr } = await db
        .from("goods_receipts")
        .insert({
          purchase_order_id: poId,
          supplier_id: input.po["supplier_id"] ?? null,
          branch_id: input.po["branch_id"] ?? null,
          invoice_ref: input.invoice_ref ?? null,
          notes: input.notes ?? null,
          allow_over_receipt: input.allow_over_receipt ?? false,
          received_by: input.received_by ?? null,
        })
        .select("id, grn_no")
        .single();
      if (grnErr) throw grnErr;

      const { error: itemsErr } = await db.from("goods_receipt_items").insert(
        lines.map((l) => ({
          goods_receipt_id: (grn as Row)["id"],
          purchase_order_item_id: l.purchase_order_item_id,
          product_id: l.product_id,
          received_qty: l.received_qty,
          rejected_qty: l.rejected_qty ?? 0,
          unit_cost: l.unit_cost,
          tax_percent: l.tax_percent ?? 0,
          batch_no: l.batch_no?.trim() ? l.batch_no.trim() : null,
          expiry_date: l.expiry_date || null,
          selling_price: l.selling_price ?? null,
        })),
      );
      if (itemsErr) {
        // no stock was applied for the failed batch: drop the empty receipt
        await db.from("goods_receipts").delete().eq("id", (grn as Row)["id"]);
        throw itemsErr;
      }
      return grn as Row;
    },
    onSuccess: (grn) => {
      toast.success(`Goods received · ${String(grn["grn_no"])} — inventory updated`);
      invalidate(qc, poId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useRecordSupplierPayment(poId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      supplier_id: string;
      purchase_order_id?: string | null;
      amount: number;
      method?: string;
      reference?: string | null;
      txn_date?: string;
      notes?: string | null;
    }) => {
      if (!values.amount || values.amount <= 0) throw new Error("Enter a payment amount greater than zero");
      const { error } = await db.from("supplier_transactions").insert({
        supplier_id: values.supplier_id,
        purchase_order_id: values.purchase_order_id ?? null,
        txn_type: "payment",
        amount: values.amount,
        method: values.method ?? "bank",
        reference: values.reference ?? null,
        txn_date: values.txn_date ?? new Date().toISOString().slice(0, 10),
        notes: values.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supplier payment recorded");
      invalidate(qc, poId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
