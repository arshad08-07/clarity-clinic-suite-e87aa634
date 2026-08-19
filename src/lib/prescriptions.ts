import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";

export const RX_SELECT =
  "id, created_at, patient_id, visit_id, doctor_id, notes, follow_up_date, " +
  "prescription_items(id, drug_name, strength, dosage, frequency, duration, route, instructions, eye, diagnosis_id, created_at)";

/** The single prescription belonging to this encounter, if the doctor started one. */
export function useVisitPrescription(visitId: string) {
  return useQuery({
    queryKey: ["visit-prescription", visitId],
    enabled: !!visitId,
    queryFn: async () => {
      const { data, error } = await db
        .from("prescriptions")
        .select(RX_SELECT)
        .eq("visit_id", visitId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as Row | null;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, visitId: string) {
  void qc.invalidateQueries({ queryKey: ["visit-prescription", visitId] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
  void qc.invalidateQueries({ queryKey: ["pharmacy-queue"] });
  void qc.invalidateQueries({ queryKey: ["list"] });
}

export interface NewRxItem {
  drug_name: string;
  strength?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  route?: string | null;
  instructions?: string | null;
  eye?: string | null;
  diagnosis_id?: string | null;
}

/** Adds a drug to this visit's prescription, creating the prescription on first use. */
export function useAddPrescriptionItem(visit: Row) {
  const qc = useQueryClient();
  const visitId = String(visit["id"]);
  return useMutation({
    mutationFn: async ({ item, doctorId }: { item: NewRxItem; doctorId: string | null }) => {
      const { data: existing, error: readErr } = await db
        .from("prescriptions")
        .select("id")
        .eq("visit_id", visitId)
        .limit(1);
      if (readErr) throw readErr;
      let rxId = (existing ?? [])[0]?.id as string | undefined;
      if (!rxId) {
        const { data: created, error: createErr } = await db
          .from("prescriptions")
          .insert({
            patient_id: visit["patient_id"],
            visit_id: visitId,
            doctor_id: (visit["doctor_id"] as string | null) ?? doctorId ?? null,
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        rxId = String(created.id);
      }
      const { error } = await db.from("prescription_items").insert({
        prescription_id: rxId,
        drug_name: item.drug_name.trim(),
        strength: item.strength?.trim() || null,
        dosage: item.dosage?.trim() || null,
        frequency: item.frequency?.trim() || null,
        duration: item.duration?.trim() || null,
        route: item.route?.trim() || null,
        instructions: item.instructions?.trim() || null,
        eye: item.eye && item.eye !== "NA" ? item.eye : null,
        diagnosis_id: item.diagnosis_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medicine added to this visit's prescription");
      invalidate(qc, visitId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdatePrescriptionItem(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Row }) => {
      const { error } = await db.from("prescription_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prescription updated");
      invalidate(qc, visitId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useSavePrescriptionNotes(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes, followUp }: { id: string; notes: string | null; followUp: string | null }) => {
      const { error } = await db
        .from("prescriptions")
        .update({ notes: notes || null, follow_up_date: followUp || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prescription saved");
      invalidate(qc, visitId);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
