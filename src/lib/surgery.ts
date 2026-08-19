import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";

export const SURGERY_STATUSES = [
  "planned",
  "scheduled",
  "in_progress",
  "completed",
  "postponed",
  "cancelled",
] as const;

export const CONSENT_STATUSES = ["pending", "signed", "declined"] as const;

/** Pre-op items the completion guard enforces in the database. */
export const PREOP_ITEMS: { key: string; label: string }[] = [
  { key: "consent", label: "Consent form collected" },
  { key: "fitness", label: "Anaesthesia / systemic fitness" },
  { key: "fasting", label: "Fasting instructions confirmed" },
  { key: "site_marked", label: "Operative eye marked" },
  { key: "biometry", label: "Biometry / required diagnostics done" },
];

export const SURGERY_SELECT =
  "*, patients(id, mrn, first_name, last_name, phone, date_of_birth, gender, allergies), " +
  "ot_rooms(id, name), surgeon:surgeon_id(id, full_name), assistant:assistant_id(id, full_name), " +
  "nurse:nurse_id(id, full_name), visits(id, token_no, status, checked_in_at), " +
  "iol_inventory(id, serial_no, power, expiry_date, iol_models(id, name, manufacturer, price)), " +
  "invoices(id, invoice_no, total, paid_amount, status)";

export function surgeryPatientName(s: Row | null | undefined) {
  const p = s?.["patients"] as Row | null | undefined;
  if (!p) return "Patient";
  return [p["first_name"], p["last_name"]].filter(Boolean).join(" ");
}

export function preopMissing(s: Row | null | undefined): string[] {
  if (!s) return [];
  const list: string[] = [];
  if (s["consent_status"] !== "signed") list.push("Signed consent");
  const checklist = (s["preop_checklist"] ?? {}) as Record<string, unknown>;
  for (const item of PREOP_ITEMS) if (checklist[item.key] !== true) list.push(item.label);
  if (String(s["procedure"] ?? "").toLowerCase().includes("cataract")) {
    if (s["biometry_axial_length"] === null || s["biometry_axial_length"] === undefined)
      list.push("Biometry axial length");
    if (!s["iol_inventory_id"]) list.push("IOL selection");
  }
  return list;
}

export function useSurgery(surgeryId: string) {
  return useQuery({
    queryKey: ["surgery", surgeryId],
    enabled: !!surgeryId,
    queryFn: async () => {
      const { data, error } = await db.from("surgeries").select(SURGERY_SELECT).eq("id", surgeryId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Row | null;
    },
  });
}

/** Surgeries raised from one encounter. */
export function useVisitSurgeries(visitId: string) {
  return useQuery({
    queryKey: ["visit-surgeries", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await db
        .from("surgeries")
        .select("id, procedure, eye, status, scheduled_at, estimate_amount, consent_status, invoice_id")
        .eq("visit_id", visitId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, surgeryId?: string) {
  if (surgeryId) void qc.invalidateQueries({ queryKey: ["surgery", surgeryId] });
  void qc.invalidateQueries({ queryKey: ["visit-surgeries"] });
  void qc.invalidateQueries({ queryKey: ["surgery-follow-ups"] });
  void qc.invalidateQueries({ queryKey: ["available-iols"] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
  void qc.invalidateQueries({ queryKey: ["list", "surgeries"] });
}

export interface NewSurgery {
  patient_id: string;
  visit_id?: string | null;
  branch_id?: string | null;
  procedure: string;
  eye: string;
  surgeon_id?: string | null;
  recommended_by?: string | null;
  recommendation_notes?: string | null;
  estimate_amount?: number | null;
}

/** Doctor raises a surgery recommendation from the current visit. */
export function useRecommendSurgery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: NewSurgery) => {
      const { data, error } = await db
        .from("surgeries")
        .insert({
          ...values,
          status: "planned",
          recommended_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Surgery recommended");
      invalidate(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateSurgery(surgeryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Row) => {
      const { data, error } = await db.from("surgeries").update(patch).eq("id", surgeryId).select("id").single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => invalidate(qc, surgeryId),
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Only implants that are in stock, unused and unexpired. */
export function useAvailableIols(branchId?: string | null, includeId?: string | null) {
  return useQuery({
    queryKey: ["available-iols", branchId ?? "all", includeId ?? ""],
    queryFn: async () => {
      const { data, error } = await db.rpc("available_iol_inventory", { _branch: branchId ?? null });
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      if (includeId && !rows.some((r) => String(r["id"]) === includeId)) {
        const { data: one } = await db
          .from("iol_inventory")
          .select("id, serial_no, power, expiry_date, branch_id, iol_models(name, manufacturer, price)")
          .eq("id", includeId)
          .maybeSingle();
        if (one) {
          const m = (one as Row)["iol_models"] as Row | null;
          rows.unshift({
            ...(one as Row),
            model_name: m?.["name"],
            manufacturer: m?.["manufacturer"],
            price: m?.["price"],
          });
        }
      }
      return rows;
    },
  });
}

/** Diagnostics ordered for this patient — biometry links to a real order. */
export function usePatientDiagnostics(patientId: string) {
  return useQuery({
    queryKey: ["patient-diagnostics", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("diagnostic_orders")
        .select("id, status, eye, created_at, findings, impression, diagnostic_tests(name, code)")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useSurgeryStockMovements(surgeryId: string) {
  return useQuery({
    queryKey: ["surgery-stock", surgeryId],
    enabled: !!surgeryId,
    queryFn: async () => {
      const { data, error } = await db
        .from("stock_movements")
        .select("id, change_qty, reason, batch_no, created_at, products(name, sku)")
        .eq("reference_id", surgeryId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useSurgeryFollowUps(surgeryId: string) {
  return useQuery({
    queryKey: ["surgery-follow-ups", surgeryId],
    enabled: !!surgeryId,
    queryFn: async () => {
      const { data, error } = await db
        .from("follow_ups")
        .select("id, due_date, type, notes, status")
        .eq("surgery_id", surgeryId)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useCreateSurgeryFollowUp(surgeryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { patient_id: string; due_date: string; type: string; notes?: string | null; visit_id?: string | null }) => {
      const { data, error } = await db
        .from("follow_ups")
        .insert({ ...values, surgery_id: surgeryId, status: "upcoming" })
        .select("id")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Post-op follow-up scheduled");
      invalidate(qc, surgeryId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
