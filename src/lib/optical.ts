import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";

/**
 * Optical workflow.
 *
 * Stock is reserved (deducted) by the database trigger on `optical_orders`
 * when the order is placed and restored on cancellation, so the optical
 * invoice lines are tagged `source_type = 'optical'` and deliberately do NOT
 * deduct stock a second time. Billing and payments reuse the verified billing
 * engine (next_invoice_no + invoices + invoice_items + payments).
 */

export const OPTICAL_STATUSES = ["ordered", "processing", "ready", "delivered", "cancelled"] as const;
export type OpticalStatus = (typeof OPTICAL_STATUSES)[number];

export const NEXT_STATUS: Record<string, OpticalStatus | null> = {
  ordered: "processing",
  processing: "ready",
  ready: "delivered",
  delivered: null,
  cancelled: null,
};

export const NEXT_LABEL: Record<string, string> = {
  ordered: "Start production",
  processing: "Mark ready",
  ready: "Mark delivered",
};

export const OPTICAL_ORDER_SELECT =
  "*, patients(id, mrn, first_name, last_name, phone), branches(id, name), " +
  "optical_prescriptions(id, type, created_at, sph_od, cyl_od, axis_od, add_od, sph_os, cyl_os, axis_os, add_os, pd, lens_type, coating), " +
  "frame:frame_product_id(id, name, sku, selling_price, tax_percent, stock_qty), " +
  "lens_od:lens_od_product_id(id, name, sku, selling_price, tax_percent, stock_qty), " +
  "lens_os:lens_os_product_id(id, name, sku, selling_price, tax_percent, stock_qty), " +
  "invoices(id, invoice_no, total, paid_amount, status), visits(id, token_no, status)";

export function opticalPatientName(o: Row | null | undefined) {
  const p = o?.["patients"] as Row | null | undefined;
  if (!p) return "Patient";
  return [p["first_name"], p["last_name"]].filter(Boolean).join(" ");
}

export function rxSummary(rx: Row | null | undefined) {
  if (!rx) return "—";
  const eye = (s: unknown, c: unknown, a: unknown, add: unknown) =>
    `${s ?? "—"} / ${c ?? "—"} × ${a ?? "—"}${add ? ` add ${String(add)}` : ""}`;
  return `OD ${eye(rx["sph_od"], rx["cyl_od"], rx["axis_od"], rx["add_od"])} · OS ${eye(
    rx["sph_os"],
    rx["cyl_os"],
    rx["axis_os"],
    rx["add_os"],
  )}${rx["pd"] ? ` · PD ${String(rx["pd"])}` : ""}`;
}

export function orderTotal(o: Row | null | undefined) {
  if (!o) return 0;
  const qty = Number(o["quantity"] ?? 1);
  const gross =
    (Number(o["frame_price"] ?? 0) + Number(o["lens_od_price"] ?? 0) + Number(o["lens_os_price"] ?? 0)) * qty;
  return Math.max(gross - Number(o["discount"] ?? 0), 0);
}

/* ------------------------------- queries -------------------------------- */

/** Optical prescriptions for a patient (optionally only for one visit). */
export function useOpticalPrescriptions(opts: { patientId?: string; visitId?: string } = {}) {
  return useQuery({
    queryKey: ["optical-rx", opts.patientId ?? "", opts.visitId ?? ""],
    enabled: !!(opts.patientId || opts.visitId),
    queryFn: async () => {
      let q = db
        .from("optical_prescriptions")
        .select(
          "id, created_at, type, sph_od, cyl_od, axis_od, add_od, sph_os, cyl_os, axis_os, add_os, pd, lens_type, coating, remarks, patient_id, visit_id, " +
            "patients(id, mrn, first_name, last_name, phone)",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (opts.patientId) q = q.eq("patient_id", opts.patientId);
      if (opts.visitId) q = q.eq("visit_id", opts.visitId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Frames / lenses / contact lenses that can still be sold. */
export function useOpticalProducts(category: "frame" | "lens" | "contact_lens" | "all" = "all") {
  return useQuery({
    queryKey: ["optical-products", category],
    queryFn: async () => {
      let q = db
        .from("products")
        .select("id, sku, name, brand, category, selling_price, tax_percent, stock_qty")
        .eq("is_active", true)
        .order("name");
      q = category === "all" ? q.in("category", ["frame", "lens", "contact_lens"]) : q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useOpticalOrder(orderId: string) {
  return useQuery({
    queryKey: ["optical-order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await db
        .from("optical_orders")
        .select(OPTICAL_ORDER_SELECT)
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as Row | null;
    },
  });
}

export function useOpticalOrders(opts: { patientId?: string; visitId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["optical-orders", opts.patientId ?? "", opts.visitId ?? "", opts.status ?? ""],
    queryFn: async () => {
      let q = db
        .from("optical_orders")
        .select(OPTICAL_ORDER_SELECT)
        .order("created_at", { ascending: false })
        .limit(200);
      if (opts.patientId) q = q.eq("patient_id", opts.patientId);
      if (opts.visitId) q = q.eq("visit_id", opts.visitId);
      if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, orderId?: string) {
  if (orderId) void qc.invalidateQueries({ queryKey: ["optical-order", orderId] });
  void qc.invalidateQueries({ queryKey: ["optical-orders"] });
  void qc.invalidateQueries({ queryKey: ["optical-products"] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
  void qc.invalidateQueries({ queryKey: ["invoice"] });
  void qc.invalidateQueries({ queryKey: ["invoice-items"] });
  void qc.invalidateQueries({ queryKey: ["invoices-for-visit"] });
  void qc.invalidateQueries({ queryKey: ["list"] });
  void qc.invalidateQueries({ queryKey: ["lookup"] });
}

/* ------------------------------ mutations ------------------------------- */

export interface NewOpticalOrder {
  patient_id: string;
  optical_prescription_id?: string | null;
  visit_id?: string | null;
  branch_id?: string | null;
  frame?: Row | null;
  lens_od?: Row | null;
  lens_os?: Row | null;
  quantity: number;
  brand?: string | null;
  lens_index?: string | null;
  coating?: string | null;
  discount?: number;
  delivery_date?: string | null;
  notes?: string | null;
  created_by?: string | null;
}

/** Places an optical order; the database reserves stock for every selected product. */
export function useCreateOpticalOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewOpticalOrder) => {
      const qty = Number(input.quantity || 0);
      if (qty < 1) throw new Error("Quantity must be at least 1");
      const picked = [input.frame, input.lens_od, input.lens_os].filter(Boolean) as Row[];
      if (!picked.length) throw new Error("Select a frame or at least one lens");
      for (const p of picked) {
        if (Number(p["stock_qty"] ?? 0) < qty) throw new Error(`${String(p["name"])} does not have enough stock`);
      }

      const framePrice = Number(input.frame?.["selling_price"] ?? 0);
      const odPrice = Number(input.lens_od?.["selling_price"] ?? 0);
      const osPrice = Number(input.lens_os?.["selling_price"] ?? 0);
      const taxPercent = Number(picked[0]?.["tax_percent"] ?? 0);
      const gross = (framePrice + odPrice + osPrice) * qty;

      const { data, error } = await db
        .from("optical_orders")
        .insert({
          patient_id: input.patient_id,
          optical_prescription_id: input.optical_prescription_id ?? null,
          visit_id: input.visit_id ?? null,
          branch_id: input.branch_id ?? null,
          frame_product_id: input.frame?.["id"] ?? null,
          lens_od_product_id: input.lens_od?.["id"] ?? null,
          lens_os_product_id: input.lens_os?.["id"] ?? null,
          frame_price: framePrice,
          lens_od_price: odPrice,
          lens_os_price: osPrice,
          tax_percent: taxPercent,
          quantity: qty,
          brand: input.brand || null,
          lens_index: input.lens_index || null,
          coating: input.coating || null,
          discount: Number(input.discount ?? 0),
          selling_price: Math.max(gross - Number(input.discount ?? 0), 0),
          delivery_date: input.delivery_date || null,
          notes: input.notes || null,
          created_by: input.created_by ?? null,
          status: "ordered",
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (row) => {
      toast.success("Optical order placed and stock reserved");
      invalidateAll(qc, String(row["id"]));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Raises the optical invoice through the existing billing engine. */
export function useRaiseOpticalInvoice(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: Row) => {
      if (order["invoice_id"]) throw new Error("This order already has an invoice");
      if (String(order["status"]) === "cancelled") throw new Error("Cancelled orders cannot be billed");

      const { data: no, error: noErr } = await db.rpc("next_invoice_no", {
        _branch: (order["branch_id"] as string | null) ?? undefined,
      });
      if (noErr) throw noErr;
      const { data: inv, error: invErr } = await db
        .from("invoices")
        .insert({
          invoice_no: no,
          patient_id: order["patient_id"],
          visit_id: order["visit_id"] ?? null,
          branch_id: order["branch_id"] ?? null,
          invoice_type: "optical",
          discount: Number(order["discount"] ?? 0),
          notes: "Optical order",
        })
        .select("id, invoice_no")
        .single();
      if (invErr) throw invErr;

      const qty = Number(order["quantity"] ?? 1);
      const tax = Number(order["tax_percent"] ?? 0);
      const lines: Row[] = [];
      const push = (product: Row | null, price: number, label: string) => {
        if (!product || price <= 0) return;
        lines.push({
          invoice_id: inv["id"],
          description: `${label} · ${String(product["name"])} (${String(product["sku"])})`,
          item_type: "product",
          product_id: product["id"],
          quantity: qty,
          unit_price: price,
          tax_percent: tax,
          amount: qty * price * (1 + tax / 100),
          source_type: "optical",
          source_id: order["id"],
          source_ref: `Optical order · ${label}`,
        });
      };
      push(order["frame"] as Row | null, Number(order["frame_price"] ?? 0), "Frame");
      push(order["lens_od"] as Row | null, Number(order["lens_od_price"] ?? 0), "Right lens (OD)");
      push(order["lens_os"] as Row | null, Number(order["lens_os_price"] ?? 0), "Left lens (OS)");
      if (!lines.length) throw new Error("Nothing to bill on this order");

      const { error: itemErr } = await db.from("invoice_items").insert(lines);
      if (itemErr) throw itemErr;

      const { error: linkErr } = await db.from("optical_orders").update({ invoice_id: inv["id"] }).eq("id", order["id"]);
      if (linkErr) throw linkErr;
      return inv as Row;
    },
    onSuccess: (inv) => {
      toast.success(`Invoice ${String(inv["invoice_no"])} raised`);
      invalidateAll(qc, orderId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Moves the order along its lifecycle; the database enforces legal transitions. */
export function useAdvanceOpticalOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (status: OpticalStatus) => {
      const { error } = await db.from("optical_orders").update({ status }).eq("id", orderId);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      toast.success(`Order marked ${status}`);
      invalidateAll(qc, orderId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/**
 * Cancels/returns an order: stock goes back through the database trigger and
 * any unpaid invoice line is reversed with a negative billing line.
 */
export function useCancelOpticalOrder(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, reason }: { order: Row; reason?: string }) => {
      const { error } = await db
        .from("optical_orders")
        .update({ status: "cancelled", cancel_reason: reason || null })
        .eq("id", orderId);
      if (error) throw error;

      const invoiceId = order["invoice_id"] as string | null;
      if (invoiceId) {
        const { data: items } = await db
          .from("invoice_items")
          .select("id, description, item_type, product_id, quantity, unit_price, tax_percent, source_type, source_id")
          .eq("invoice_id", invoiceId)
          .eq("source_id", orderId);
        const positive = ((items ?? []) as Row[]).filter((i) => Number(i["quantity"]) > 0);
        if (positive.length) {
          const reversals = positive.map((i) => ({
            invoice_id: invoiceId,
            description: `Cancellation · ${String(i["description"])}`,
            item_type: i["item_type"],
            product_id: i["product_id"],
            quantity: -Number(i["quantity"]),
            unit_price: Number(i["unit_price"]),
            tax_percent: Number(i["tax_percent"] ?? 0),
            amount: -Number(i["quantity"]) * Number(i["unit_price"]) * (1 + Number(i["tax_percent"] ?? 0) / 100),
            source_type: "optical",
            source_id: orderId,
            source_ref: "Optical order cancellation",
          }));
          const { error: revErr } = await db.from("invoice_items").insert(reversals);
          if (revErr) throw revErr;
        }
      }
      return true;
    },
    onSuccess: () => {
      toast.success("Order cancelled — stock restored and billing reversed");
      invalidateAll(qc, orderId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
