import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";

export const DIAGNOSIS_EYES = [
  { value: "OD", label: "OD · Right" },
  { value: "OS", label: "OS · Left" },
  { value: "OU", label: "OU · Both" },
  { value: "NA", label: "Not applicable" },
] as const;

export const DIAGNOSIS_SEVERITIES = ["mild", "moderate", "severe", "advanced"] as const;

export const DIAGNOSIS_SELECT =
  "id, created_at, patient_id, visit_id, branch_id, diagnosis_id, diagnosis_text, eye, severity, notes, is_primary, diagnosed_by, " +
  "diagnosis_catalog(id, code, name, category), profiles:diagnosed_by(id, full_name), visits(id, token_no, checked_in_at, status)";

export function diagnosisLabel(row: Row | null | undefined): string {
  if (!row) return "Diagnosis";
  const cat = row["diagnosis_catalog"] as Row | null;
  return String(cat?.["name"] ?? row["diagnosis_text"] ?? "Diagnosis");
}

export function diagnosisCode(row: Row | null | undefined): string | null {
  const cat = row?.["diagnosis_catalog"] as Row | null;
  return cat?.["code"] ? String(cat["code"]) : null;
}

/** Searchable catalog of coded diagnoses. */
export function useDiagnosisCatalog(enabled = true) {
  return useQuery({
    queryKey: ["diagnosis-catalog"],
    enabled,
    queryFn: async () => {
      const { data, error } = await db
        .from("diagnosis_catalog")
        .select("id, code, name, category")
        .order("name")
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Diagnoses recorded on THIS encounter. */
export function useVisitDiagnoses(visitId: string) {
  return useQuery({
    queryKey: ["visit-diagnoses", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await db
        .from("patient_diagnoses")
        .select(DIAGNOSIS_SELECT)
        .eq("visit_id", visitId)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Everything diagnosed for this patient on OTHER visits — read-only history. */
export function usePatientDiagnosisHistory(patientId: string, excludeVisitId?: string) {
  return useQuery({
    queryKey: ["patient-diagnosis-history", patientId, excludeVisitId ?? ""],
    enabled: !!patientId,
    queryFn: async () => {
      let q = db
        .from("patient_diagnoses")
        .select(DIAGNOSIS_SELECT)
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (excludeVisitId) q = q.neq("visit_id", excludeVisitId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["visit-diagnoses"] });
  void qc.invalidateQueries({ queryKey: ["patient-diagnosis-history"] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
  void qc.invalidateQueries({ queryKey: ["list"] });
}

export interface NewDiagnosis {
  patient_id: string;
  visit_id: string;
  diagnosis_id?: string | null;
  diagnosis_text?: string | null;
  eye?: string | null;
  severity?: string | null;
  notes?: string | null;
  is_primary: boolean;
  diagnosed_by?: string | null;
}

function friendly(e: unknown): string {
  const msg = errorMessage(e);
  if (msg.includes("patient_diagnoses_visit_") || msg.toLowerCase().includes("duplicate key"))
    return "This diagnosis is already recorded for this visit.";
  return msg;
}

/** Doctor records a diagnosis against the CURRENT visit only. */
export function useAddDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewDiagnosis) => {
      const payload: Row = {
        patient_id: input.patient_id,
        visit_id: input.visit_id,
        diagnosis_id: input.diagnosis_id || null,
        diagnosis_text: input.diagnosis_text?.trim() || null,
        eye: input.eye && input.eye !== "NA" ? input.eye : null,
        severity: input.severity || null,
        notes: input.notes?.trim() || null,
        is_primary: input.is_primary,
        diagnosed_by: input.diagnosed_by ?? null,
      };
      const { data, error } = await db.from("patient_diagnoses").insert(payload).select(DIAGNOSIS_SELECT).single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Diagnosis added to this visit");
      invalidate(qc);
    },
    onError: (e) => toast.error(friendly(e)),
  });
}

/** Edits stay within the same visit — patient/visit changes are blocked in the database. */
export function useUpdateDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Row }) => {
      const { data, error } = await db
        .from("patient_diagnoses")
        .update(patch)
        .eq("id", id)
        .select(DIAGNOSIS_SELECT)
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Diagnosis updated");
      invalidate(qc);
    },
    onError: (e) => toast.error(friendly(e)),
  });
}

export function useDeleteDiagnosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("patient_diagnoses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diagnosis removed");
      invalidate(qc);
    },
    onError: (e) => toast.error(friendly(e)),
  });
}
