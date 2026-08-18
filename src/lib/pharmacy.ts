import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";

/**
 * Pharmacy dispensing.
 *
 * Stock movement and batch depletion are handled by the existing database
 * triggers on `invoice_items` (invoice_item_stock / stock_movement_apply), so a
 * dispense creates exactly ONE invoice line item and stock drops exactly once.
 * Billing totals and payments continue to use the verified billing engine.
 */

export const PHARMACY_SALE_SELECT =
  "id, created_at, quantity, unit_price, tax_percent, amount, status, returned_qty, notes, patient_id, visit_id, prescription_id, prescription_item_id, invoice_id, invoice_item_id, " +
  "products(id, name, sku, selling_price, tax_percent), product_batches(id, batch_no, expiry_date, quantity), " +
  "patients(id, mrn, first_name, last_name, phone), profiles:dispensed_by(id, full_name), invoices(id, invoice_no, status, total, paid_amount)";

export function isExpired(batch: Row | null | undefined) {
  const d = batch?.["expiry_date"];
  if (!d) return false;
  return String(d) < new Date().toISOString().slice(0, 10);
}

/** Prescriptions (with their drugs) waiting to be dispensed. */
export function usePrescriptions(opts: { patientId?: string; visitId?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["rx-for-pharmacy", opts.patientId ?? "", opts.visitId ?? "", opts.search ?? ""],
    queryFn: async () => {
      let q = db
        .from("prescriptions")
        .select(
          "id, created_at, notes, follow_up_date, patient_id, visit_id, doctor_id, " +
            "patients(id, mrn, first_name, last_name, phone), profiles:doctor_id(id, full_name), " +
            "prescription_items(id, drug_name, strength, dosage, frequency, duration, route, instructions, eye)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (opts.patientId) q = q.eq("patient_id", opts.patientId);
      if (opts.visitId) q = q.eq("visit_id", opts.visitId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const term = (opts.search ?? "").trim().toLowerCase();
      if (!term) return rows;
      return rows.filter((r) => {
        const p = r["patients"] as Row | null;
        const items = (r["prescription_items"] ?? []) as Row[];
        return [p?.["mrn"], p?.["first_name"], p?.["last_name"], p?.["phone"], ...items.map((i) => i["drug_name"])]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      });
    },
  });
}

/** Medicines/consumables the pharmacy can sell. */
export function useMedicines(enabled = true) {
  return useQuery({
    queryKey: ["pharmacy-medicines"],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("products")
        .select("id, sku, name, brand, unit, selling_price, tax_percent, stock_qty, category")
        .in("category", ["medicine", "consumable"])
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useProductBatches(productId: string) {
  return useQuery({
    queryKey: ["pharmacy-batches", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await db
        .from("product_batches")
        .select("id, batch_no, expiry_date, quantity, selling_price, cost_price")
        .eq("product_id", productId)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Dispensing history — used by the pharmacy board, the visit screen and the patient record. */
export function usePharmacySales(opts: { patientId?: string; visitId?: string; search?: string } = {}) {
  return useQuery({
    queryKey: ["pharmacy-sales", opts.patientId ?? "", opts.visitId ?? "", opts.search ?? ""],
    queryFn: async () => {
      let q = db.from("pharmacy_sales").select(PHARMACY_SALE_SELECT).order("created_at", { ascending: false }).limit(200);
      if (opts.patientId) q = q.eq("patient_id", opts.patientId);
      if (opts.visitId) q = q.eq("visit_id", opts.visitId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const term = (opts.search ?? "").trim().toLowerCase();
      if (!term) return rows;
      return rows.filter((r) => {
        const p = r["patients"] as Row | null;
        const prod = r["products"] as Row | null;
        return [p?.["mrn"], p?.["first_name"], p?.["last_name"], prod?.["name"], prod?.["sku"]]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      });
    },
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["pharmacy-sales"] });
  void qc.invalidateQueries({ queryKey: ["pharmacy-batches"] });
  void qc.invalidateQueries({ queryKey: ["pharmacy-medicines"] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
  void qc.invalidateQueries({ queryKey: ["invoice"] });
  void qc.invalidateQueries({ queryKey: ["invoice-items"] });
  void qc.invalidateQueries({ queryKey: ["invoices-for-visit"] });
  void qc.invalidateQueries({ queryKey: ["list"] });
  void qc.invalidateQueries({ queryKey: ["lookup"] });
}

export interface DispenseInput {
  patient_id: string;
  visit_id?: string | null;
  branch_id?: string | null;
  prescription_id?: string | null;
  prescription_item_id?: string | null;
  product: Row;
  batch: Row;
  quantity: number;
  unit_price: number;
  tax_percent: number;
  dispensed_by?: string | null;
  notes?: string | null;
}

/** Re-uses an open pharmacy invoice for the encounter, otherwise raises a new one. */
async function ensurePharmacyInvoice(input: DispenseInput): Promise<Row> {
  let q = db
    .from("invoices")
    .select("id, invoice_no, status")
    .eq("invoice_type", "pharmacy")
    .neq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1);
  q = input.visit_id ? q.eq("visit_id", input.visit_id) : q.eq("patient_id", input.patient_id).is("visit_id", null);
  const { data: existing, error: findErr } = await q;
  if (findErr) throw findErr;
  const found = ((existing ?? []) as Row[])[0];
  if (found) return found;

  const { data: no, error: noErr } = await db.rpc("next_invoice_no");
  if (noErr) throw noErr;
  const { data, error } = await db
    .from("invoices")
    .insert({
      invoice_no: no,
      patient_id: input.patient_id,
      visit_id: input.visit_id ?? null,
      branch_id: input.branch_id ?? null,
      invoice_type: "pharmacy",
      notes: "Pharmacy dispensing",
    })
    .select("id, invoice_no, status")
    .single();
  if (error) throw error;
  return data as Row;
}

/**
 * One dispense = one invoice line item (stock + stock movement handled by DB
 * triggers) + one pharmacy_sales record for the medication history.
 */
export function useDispenseMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DispenseInput) => {
      if (!input.quantity || input.quantity <= 0) throw new Error("Enter a quantity greater than zero");
      if (isExpired(input.batch)) throw new Error("That batch is expired and cannot be dispensed");
      if (Number(input.batch["quantity"] ?? 0) < input.quantity)
        throw new Error("Not enough quantity in the selected batch");
      if (Number(input.product["stock_qty"] ?? 0) < input.quantity) throw new Error("Not enough stock for this item");

      if (input.prescription_item_id) {
        const { data: dup } = await db
          .from("pharmacy_sales")
          .select("id")
          .eq("prescription_item_id", input.prescription_item_id)
          .eq("status", "dispensed")
          .limit(1);
        if (((dup ?? []) as Row[]).length) throw new Error("This prescribed medicine has already been dispensed");
      }

      const invoice = await ensurePharmacyInvoice(input);

      const { data: item, error: itemErr } = await db
        .from("invoice_items")
        .insert({
          invoice_id: invoice["id"],
          description: `${String(input.product["name"])} × ${input.quantity} (batch ${String(input.batch["batch_no"])})`,
          item_type: "medicine",
          product_id: input.product["id"],
          batch_id: input.batch["id"],
          quantity: input.quantity,
          unit_price: input.unit_price,
          tax_percent: input.tax_percent,
          source_type: "pharmacy",
          source_id: input.prescription_item_id ?? null,
          source_ref: String(input.product["sku"] ?? ""),
        })
        .select("id, amount")
        .single();
      if (itemErr) throw itemErr;

      const { data: sale, error: saleErr } = await db
        .from("pharmacy_sales")
        .insert({
          branch_id: input.branch_id ?? null,
          patient_id: input.patient_id,
          visit_id: input.visit_id ?? null,
          prescription_id: input.prescription_id ?? null,
          prescription_item_id: input.prescription_item_id ?? null,
          product_id: input.product["id"],
          batch_id: input.batch["id"],
          quantity: input.quantity,
          unit_price: input.unit_price,
          tax_percent: input.tax_percent,
          amount: Number((item as Row)["amount"] ?? 0),
          invoice_id: invoice["id"],
          invoice_item_id: (item as Row)["id"],
          dispensed_by: input.dispensed_by ?? null,
          notes: input.notes ?? null,
        })
        .select("id, invoice_id")
        .single();
      if (saleErr) {
        // keep the ledger clean if the history row could not be written
        await db.from("invoice_items").delete().eq("id", (item as Row)["id"]);
        throw saleErr;
      }
      return { sale: sale as Row, invoice };
    },
    onSuccess: ({ invoice }) => {
      toast.success(`Dispensed · billed on ${String(invoice["invoice_no"])}`);
      invalidateAll(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/**
 * Return: a reversing (negative) line item restores batch quantity and product
 * stock through the same triggers and reduces the invoice total, so the billing
 * engine recalculates paid/balance and can refund through its own screen.
 */
export function useReturnDispense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sale, quantity }: { sale: Row; quantity: number }) => {
      const already = Number(sale["returned_qty"] ?? 0);
      const max = Number(sale["quantity"] ?? 0) - already;
      if (quantity <= 0 || quantity > max) throw new Error(`Return quantity must be between 1 and ${max}`);
      const product = sale["products"] as Row | null;
      const batch = sale["product_batches"] as Row | null;

      const { error: itemErr } = await db.from("invoice_items").insert({
        invoice_id: sale["invoice_id"],
        description: `Return · ${String(product?.["name"] ?? "Medicine")} × ${quantity}`,
        item_type: "medicine",
        product_id: sale["product_id"],
        batch_id: sale["batch_id"],
        quantity: -quantity,
        unit_price: Number(sale["unit_price"] ?? 0),
        tax_percent: Number(sale["tax_percent"] ?? 0),
        source_type: "pharmacy",
        source_id: sale["id"],
        source_ref: `RETURN ${String(batch?.["batch_no"] ?? "")}`.trim(),
      });
      if (itemErr) throw itemErr;

      const returned = already + quantity;
      const { error } = await db
        .from("pharmacy_sales")
        .update({
          returned_qty: returned,
          status: returned >= Number(sale["quantity"] ?? 0) ? "returned" : "dispensed",
        })
        .eq("id", sale["id"]);
      if (error) throw error;
      return sale;
    },
    onSuccess: () => {
      toast.success("Return recorded · stock restored and invoice updated");
      invalidateAll(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
