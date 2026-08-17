import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { db, errorMessage, type Row } from "@/lib/api";

export const STAGES = [
  "waiting",
  "optometry",
  "with_doctor",
  "diagnostics",
  "billing",
  "completed",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<string, string> = {
  waiting: "Waiting",
  optometry: "Optometry",
  with_doctor: "Doctor",
  diagnostics: "Diagnostics",
  billing: "Billing",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Mirrors the database transition guard so the UI never offers an invalid move. */
export const ALLOWED: Record<string, string[]> = {
  waiting: ["optometry", "with_doctor", "cancelled"],
  optometry: ["with_doctor", "diagnostics", "billing", "waiting", "cancelled"],
  with_doctor: ["diagnostics", "billing", "completed", "optometry", "cancelled"],
  diagnostics: ["with_doctor", "billing", "completed", "cancelled"],
  billing: ["completed", "with_doctor", "cancelled"],
  completed: [],
  cancelled: [],
};

export const QUEUE_SELECT =
  "id, token_no, status, priority, on_hold, called_at, checked_in_at, stage_changed_at, completed_at, chief_complaint, department, appointment_id, patient_id, doctor_id, branch_id, patients(id, mrn, first_name, last_name, phone), profiles:doctor_id(id, full_name), appointments(id, scheduled_at, status, appointment_type), branches(name)";

export function patientName(row: Row | null | undefined): string {
  const p = (row?.["patients"] ?? row) as { first_name?: string; last_name?: string } | null;
  if (!p) return "—";
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "—";
}

export function waitingMinutes(row: Row): number {
  const from = String(row["stage_changed_at"] ?? row["checked_in_at"] ?? "");
  if (!from) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000));
}

/** Live queue for a day, kept fresh by realtime plus a slow polling fallback. */
export function useQueue(opts: { day?: string; includeDone?: boolean } = {}) {
  const qc = useQueryClient();
  const day = opts.day ?? new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const channel = supabase
      .channel("live-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "visits" }, () => {
        void qc.invalidateQueries({ queryKey: ["queue"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        void qc.invalidateQueries({ queryKey: ["queue"] });
        void qc.invalidateQueries({ queryKey: ["list", "appointments"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["queue", day, opts.includeDone ?? true],
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const start = `${day}T00:00:00.000Z`;
      const end = `${day}T23:59:59.999Z`;
      const { data, error } = await db
        .from("visits")
        .select(QUEUE_SELECT)
        .gte("checked_in_at", start)
        .lte("checked_in_at", end)
        .order("token_no", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useVisit(visitId: string) {
  return useQuery({
    queryKey: ["visit", visitId],
    queryFn: async () => {
      const { data, error } = await db.from("visits").select(QUEUE_SELECT).eq("id", visitId).maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });
}

function invalidateWorkflow(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["queue"] });
  void qc.invalidateQueries({ queryKey: ["visit"] });
  void qc.invalidateQueries({ queryKey: ["list"] });
  void qc.invalidateQueries({ queryKey: ["count"] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
}

/** Atomic check-in: appointment → arrived + visit + token, handled by the backend. */
export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const { data, error } = await db.rpc("checkin_appointment", { _appointment_id: appointmentId });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Row;
    },
    onSuccess: (visit) => {
      toast.success(`Checked in — token #${String(visit?.["token_no"] ?? "—")}`);
      invalidateWorkflow(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useWalkIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      patientId: string;
      doctorId?: string | null;
      branchId?: string | null;
      complaint?: string;
      priority?: string;
    }) => {
      const { data, error } = await db.rpc("create_walk_in_visit", {
        _patient_id: input.patientId,
        _doctor_id: input.doctorId ?? null,
        _branch_id: input.branchId ?? null,
        _chief_complaint: input.complaint ?? null,
        _priority: input.priority ?? "normal",
      });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Row;
    },
    onSuccess: (visit) => {
      toast.success(`Walk-in added — token #${String(visit?.["token_no"] ?? "—")}`);
      invalidateWorkflow(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Stage moves, hold/call/skip — all validated again by the database. */
export function useVisitUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Row }) => {
      const { data, error } = await db.from("visits").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (_d, vars) => {
      const next = vars.patch["status"];
      if (next) toast.success(`Moved to ${STAGE_LABEL[String(next)] ?? String(next)}`);
      invalidateWorkflow(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useAppointmentUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Row }) => {
      const { error } = await db.from("appointments").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment updated");
      invalidateWorkflow(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Visit already created for an appointment (drives the "Arrived • Token #n" chip). */
export function useVisitByAppointments(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["visits-by-appointment", key],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await db
        .from("visits")
        .select("id, token_no, status, appointment_id")
        .in("appointment_id", ids);
      if (error) throw error;
      const map: Record<string, Row> = {};
      for (const r of (data ?? []) as Row[]) map[String(r["appointment_id"])] = r;
      return map;
    },
  });
}
