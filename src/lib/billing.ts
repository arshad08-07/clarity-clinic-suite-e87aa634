import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const INVOICE_SELECT =
  "id, invoice_no, invoice_type, patient_id, visit_id, branch_id, subtotal, discount, tax, total, paid_amount, status, notes, created_at, patients(id, mrn, first_name, last_name, phone, address), branches(id, name, address, phone), visits(id, token_no, status, checked_in_at)";

export const INVOICE_TYPES = [
  "consultation",
  "diagnostic",
  "surgery",
  "optical",
  "pharmacy",
  "other",
] as const;

/** Business source a line item was raised from. */
export const SOURCE_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "diagnostics", label: "Diagnostics" },
  { value: "surgery", label: "Surgery" },
  { value: "optical", label: "Optical order" },
  { value: "pharmacy", label: "Pharmacy sale" },
  { value: "other", label: "Other / manual" },
] as const;

export const PAYMENT_METHODS = ["cash", "card", "upi", "netbanking", "insurance", "cheque"] as const;

export const STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partial: "Partially paid",
  paid: "Paid",
  refunded: "Refunded",
};

export function balanceOf(invoice: Row | null | undefined) {
  if (!invoice) return 0;
  return Math.max(Number(invoice["total"] ?? 0) - Number(invoice["paid_amount"] ?? 0), 0);
}

export function invoicePatientName(invoice: Row | null | undefined) {
  const p = invoice?.["patients"] as Row | null | undefined;
  if (!p) return "—";
  return [p["first_name"], p["last_name"]].filter(Boolean).join(" ");
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await db.from("invoices").select(INVOICE_SELECT).eq("id", invoiceId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Row | null;
    },
  });
}

export function useInvoiceItems(invoiceId: string) {
  return useQuery({
    queryKey: ["invoice-items", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await db
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useInvoicePayments(invoiceId: string) {
  return useQuery({
    queryKey: ["invoice-payments", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await db
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("paid_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function useInvalidateInvoice(invoiceId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    void qc.invalidateQueries({ queryKey: ["invoice-items", invoiceId] });
    void qc.invalidateQueries({ queryKey: ["invoice-payments", invoiceId] });
    void qc.invalidateQueries({ queryKey: ["list", "invoices"] });
    void qc.invalidateQueries({ queryKey: ["invoices-for-visit"] });
  };
}

/** Creates an invoice with a server-generated number from next_invoice_no(). */
export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      patient_id?: string | null;
      visit_id?: string | null;
      branch_id?: string | null;
      invoice_type?: string;
      notes?: string | null;
    }) => {
      const { data: no, error: noErr } = await db.rpc("next_invoice_no", {
        _branch: values.branch_id ?? undefined,
      });
      if (noErr) throw noErr;
      const { data, error } = await db
        .from("invoices")
        .insert({
          invoice_no: no,
          patient_id: values.patient_id ?? null,
          visit_id: values.visit_id ?? null,
          branch_id: values.branch_id ?? null,
          invoice_type: values.invoice_type ?? "consultation",
          notes: values.notes ?? null,
        })
        .select("id, invoice_no")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (row) => {
      toast.success(`Invoice ${String(row["invoice_no"])} created`);
      void qc.invalidateQueries({ queryKey: ["list", "invoices"] });
      void qc.invalidateQueries({ queryKey: ["invoices-for-visit"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateInvoice(invoiceId: string) {
  const invalidate = useInvalidateInvoice(invoiceId);
  return useMutation({
    mutationFn: async (patch: Row) => {
      const { data, error } = await db.from("invoices").update(patch).eq("id", invoiceId).select("id").single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Invoice updated");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useAddInvoiceItem(invoiceId: string) {
  const invalidate = useInvalidateInvoice(invoiceId);
  return useMutation({
    mutationFn: async (item: Row) => {
      const { data, error } = await db
        .from("invoice_items")
        .insert({ ...item, invoice_id: invoiceId })
        .select("id")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Line item added");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeleteInvoiceItem(invoiceId: string) {
  const invalidate = useInvalidateInvoice(invoiceId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("invoice_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Line item removed");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Payments and refunds share one table: refunds are stored as negative amounts. */
export function useRecordPayment(invoiceId: string) {
  const invalidate = useInvalidateInvoice(invoiceId);
  return useMutation({
    mutationFn: async (values: { amount: number; method: string; reference?: string | null; refund?: boolean }) => {
      const signed = values.refund ? -Math.abs(values.amount) : Math.abs(values.amount);
      const { data, error } = await db
        .from("payments")
        .insert({
          invoice_id: invoiceId,
          amount: signed,
          method: values.method,
          reference: values.reference || null,
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.refund ? "Refund recorded" : "Payment recorded");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useDeletePayment(invoiceId: string) {
  const invalidate = useInvalidateInvoice(invoiceId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entry removed");
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Invoices already raised for a visit — used to avoid duplicate billing. */
export function useVisitInvoices(visitId: string) {
  return useQuery({
    queryKey: ["invoices-for-visit", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await db
        .from("invoices")
        .select("id, invoice_no, total, paid_amount, status, created_at")
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Opens a printable receipt window for the invoice and its payment history. */
export function printReceipt(invoice: Row, items: Row[], payments: Row[]) {
  const { clinic_identity: id, branding, billing } = getSettings();
  const branch = invoice["branches"] as Row | null;
  const clinic = id.name || branch?.["name"] || "Vision Care";
  const patient = invoicePatientName(invoice);
  const mrn = (invoice["patients"] as Row | null)?.["mrn"] ?? "—";
  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
  const rows = items
    .map(
      (i) => `<tr><td>${esc(i["description"])}<div class="muted">${esc(i["source_type"] ?? i["item_type"])}${
        i["source_ref"] ? ` · ${esc(i["source_ref"])}` : ""
      }</div></td><td class="r">${esc(i["quantity"])}</td><td class="r">${fmtMoney(i["unit_price"])}</td><td class="r">${esc(
        i["tax_percent"],
      )}%</td><td class="r">${fmtMoney(i["amount"])}</td></tr>`,
    )
    .join("");
  const pays = payments
    .map(
      (p) =>
        `<tr><td>${fmtDateTime(String(p["paid_at"]))}</td><td>${esc(p["method"])}</td><td>${esc(
          p["reference"] ?? "",
        )}</td><td class="r">${Number(p["amount"]) < 0 ? "Refund " : ""}${fmtMoney(p["amount"])}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoice["invoice_no"])}</title>
<style>
body{font-family:ui-sans-serif,system-ui,sans-serif;color:#0f172a;padding:24px;max-width:760px;margin:auto}
h1{font-size:20px;margin:0} .muted{color:#64748b;font-size:11px}
table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
th,td{border-bottom:1px solid #e2e8f0;padding:6px 4px;text-align:left} .r{text-align:right}
.tot{margin-top:12px;width:280px;margin-left:auto;font-size:13px}
.tot div{display:flex;justify-content:space-between;padding:3px 0}
.big{font-weight:700;border-top:1px solid #94a3b8;margin-top:4px;padding-top:6px}
</style></head><body>
<div style="display:flex;gap:12px;align-items:center;border-bottom:2px solid ${esc(branding.accent)};padding-bottom:10px">
${branding.show_logo && id.logo_url ? `<img src="${esc(id.logo_url)}" alt="" style="height:46px">` : ""}
<div><h1>${esc(clinic)}</h1>
<div class="muted">${esc(
    [branch?.["name"], id.address || branch?.["address"], id.city, id.state, id.pincode]
      .filter(Boolean)
      .join(", "),
  )}</div>
<div class="muted">${esc(
    [id.phone || branch?.["phone"], id.email, id.website].filter(Boolean).join(" · "),
  )}</div>
${branding.show_gst && id.gst_no ? `<div class="muted">${esc(billing.tax_label)} No: ${esc(id.gst_no)}</div>` : ""}
</div></div>
${branding.document_header ? `<p class="muted">${esc(branding.document_header)}</p>` : ""}
<h2 style="font-size:15px">Receipt · ${esc(billing.receipt_prefix)}${esc(
    String(invoice["invoice_no"]).replace(billing.invoice_prefix, ""),
  )} · Invoice ${esc(invoice["invoice_no"])}</h2>
<div class="muted">Raised ${fmtDateTime(String(invoice["created_at"]))} · Type ${esc(invoice["invoice_type"])} · Status ${esc(
    STATUS_LABEL[String(invoice["status"])] ?? invoice["status"],
  )}</div>
<p style="font-size:13px">Patient: <strong>${esc(patient)}</strong> · MRN ${esc(mrn)}</p>
<table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Tax</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot">
<div><span>Subtotal</span><span>${fmtMoney(invoice["subtotal"])}</span></div>
<div><span>${esc(billing.tax_label)}</span><span>${fmtMoney(invoice["tax"])}</span></div>
<div><span>Discount</span><span>-${fmtMoney(invoice["discount"])}</span></div>
<div class="big"><span>Total</span><span>${fmtMoney(invoice["total"])}</span></div>
<div><span>Paid</span><span>${fmtMoney(invoice["paid_amount"])}</span></div>
<div class="big"><span>Balance</span><span>${fmtMoney(balanceOf(invoice))}</span></div>
</div>
<h3 style="font-size:14px;margin-top:20px">Payment history</h3>
<table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${
    pays || '<tr><td colspan="4">No payments recorded</td></tr>'
  }</tbody></table>
<p class="muted" style="margin-top:24px">${esc(branding.document_footer)}</p>
<script>window.onload=()=>window.print()</script>
</body></html>`;
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) {
    toast.error("Allow pop-ups to print the receipt");
    return;
  }
  w.document.write(html);
  w.document.close();
}
