import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { db, errorMessage, type Row } from "@/lib/api";

export const DIAG_STATUSES = ["ordered", "in_progress", "completed", "reviewed", "cancelled"] as const;

export const DIAG_STATUS_LABEL: Record<string, string> = {
  ordered: "Ordered",
  sample_collected: "Ordered",
  in_progress: "In progress",
  completed: "Completed",
  reviewed: "Reviewed",
  cancelled: "Cancelled",
};

export const DIAG_PRIORITIES = ["routine", "normal", "urgent", "stat"] as const;

export const DIAG_ORDER_SELECT =
  "id, created_at, started_at, performed_at, reviewed_at, status, eye, priority, findings, impression, report_url, doctor_notes, visit_id, patient_id, test_id, ordered_by, performed_by, " +
  "diagnostic_tests(id, code, name, price), patients(id, mrn, first_name, last_name, phone), " +
  "visits(id, token_no, status, checked_in_at), profiles:ordered_by(id, full_name)";

/** Catalog of tests the clinic performs. */
export function useDiagnosticTests(enabled = true) {
  return useQuery({
    queryKey: ["diagnostic-tests"],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("diagnostic_tests")
        .select("id, code, name, price, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function useDiagnosticsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("diagnostic-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "diagnostic_orders" }, () => {
        void qc.invalidateQueries({ queryKey: ["diagnostic-orders"] });
        void qc.invalidateQueries({ queryKey: ["visit-diagnostics"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}

/** Diagnostics worklist, live. */
export function useDiagnosticOrders(opts: { statuses: string[]; search?: string }) {
  useDiagnosticsRealtime();
  return useQuery({
    queryKey: ["diagnostic-orders", opts.statuses.join(","), opts.search ?? ""],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await db
        .from("diagnostic_orders")
        .select(DIAG_ORDER_SELECT)
        .in("status", opts.statuses)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const term = (opts.search ?? "").trim().toLowerCase();
      if (!term) return rows;
      return rows.filter((r) => {
        const p = r["patients"] as Row | null;
        const t = r["diagnostic_tests"] as Row | null;
        return [p?.["mrn"], p?.["first_name"], p?.["last_name"], p?.["phone"], t?.["name"], t?.["code"]]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      });
    },
  });
}

/** Orders belonging to one encounter — used by both clinical workspaces. */
export function useVisitDiagnostics(visitId: string) {
  useDiagnosticsRealtime();
  return useQuery({
    queryKey: ["visit-diagnostics", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await db
        .from("diagnostic_orders")
        .select(DIAG_ORDER_SELECT)
        .eq("visit_id", visitId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["diagnostic-orders"] });
  void qc.invalidateQueries({ queryKey: ["visit-diagnostics"] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
  void qc.invalidateQueries({ queryKey: ["list"] });
}

export interface NewDiagnosticOrder {
  patient_id: string;
  visit_id: string;
  test_id: string;
  eye: string;
  priority: string;
  ordered_by?: string | null;
  doctor_notes?: string | null;
}

/** Doctor orders one or more tests against the CURRENT visit. */
export function useCreateDiagnosticOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orders: NewDiagnosticOrder[]) => {
      const { data, error } = await db
        .from("diagnostic_orders")
        .insert(orders.map((o) => ({ ...o, status: "ordered" })))
        .select("id");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    onSuccess: (rows) => {
      toast.success(`${rows.length} diagnostic order${rows.length === 1 ? "" : "s"} created`);
      invalidate(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateDiagnosticOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Row }) => {
      const { data, error } = await db.from("diagnostic_orders").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (_d, vars) => {
      const s = vars.patch["status"];
      toast.success(s ? `Marked ${DIAG_STATUS_LABEL[String(s)] ?? String(s)}` : "Diagnostic order saved");
      invalidate(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Uploads a report file to private storage and returns a long-lived signed URL. */
export async function uploadDiagnosticReport(orderId: string, file: File): Promise<string> {
  const path = `${orderId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
  const { error } = await supabase.storage.from("diagnostic-reports").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("diagnostic-reports")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signErr) throw signErr;
  return data?.signedUrl ?? path;
}
