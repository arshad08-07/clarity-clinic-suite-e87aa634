import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { db, errorMessage, type Row } from "@/lib/api";

/** Possible existing patients that share the lead's phone or email. */
export function useLeadMatches(leadId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["lead-matches", leadId],
    enabled: !!leadId && enabled,
    queryFn: async () => {
      const { data, error } = await db.rpc("lead_patient_matches", { _lead_id: leadId });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Appointments already booked against the enquiry (before or after conversion). */
export function useLeadAppointments(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ["lead-appointments", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await db
        .from("appointments")
        .select("id, scheduled_at, status, appointment_type, reason, patient_id, doctor_id")
        .eq("lead_id", leadId)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useLeadActivities(leadId: string | null | undefined) {
  return useQuery({
    queryKey: ["lead-activities", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await db
        .from("lead_activities")
        .select("id, activity, outcome, next_action_at, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useLogLeadActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("lead_activities")
        .insert({ created_by: auth.user?.id ?? null, ...values })
        .select()
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Activity logged");
      void qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
}

/** Books an enquiry appointment. Before conversion the appointment holds the lead. */
export function useBookLeadAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { data, error } = await db.from("appointments").insert(values).select().single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Appointment booked for this enquiry");
      void qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
}

export interface ConvertArgs {
  leadId: string;
  /** Link to this existing patient instead of creating a new record. */
  patientId?: string | null;
  /** Create a fresh record even though look-alike patients exist. */
  createNew?: boolean;
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, patientId, createNew }: ConvertArgs) => {
      const { data, error } = await db.rpc("convert_lead_to_patient", {
        _lead_id: leadId,
        _patient_id: patientId ?? null,
        _create_new: !!createNew,
      });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Row;
    },
    onSuccess: (p) => {
      toast.success(`Lead converted · ${String(p?.["mrn"] ?? "patient")}`);
      void qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
}

export interface FunnelRow extends Row {
  source: string;
  campaign: string;
  leads: number;
  contacted: number;
  appointments: number;
  patients: number;
  visits: number;
  surgeries: number;
  revenue: number;
}

export function useCrmFunnel(from: string, to: string) {
  return useQuery({
    queryKey: ["crm-funnel", from, to],
    queryFn: async () => {
      const { data, error } = await db.rpc("crm_funnel", { _from: from, _to: to });
      if (error) throw error;
      return (data ?? []) as FunnelRow[];
    },
  });
}
