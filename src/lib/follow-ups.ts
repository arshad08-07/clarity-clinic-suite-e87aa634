import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";

export const FOLLOW_UP_TYPES = ["post_op", "review", "recall", "reminder", "counselling"] as const;
export const FOLLOW_UP_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

/** Board states — "due" and "overdue" are derived from the due date. */
export type FollowUpState = "upcoming" | "due" | "overdue" | "completed" | "cancelled" | "no_show";

export const STATE_LABELS: Record<FollowUpState, string> = {
  upcoming: "Upcoming",
  due: "Due today",
  overdue: "Overdue",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const STATE_TONE: Record<FollowUpState, string> = {
  upcoming: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  due: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  overdue: "bg-destructive/10 text-destructive",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-muted text-muted-foreground",
  no_show: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Mirrors the database function public.follow_up_state. */
export function followUpState(row: Row): FollowUpState {
  const status = String(row["status"] ?? "upcoming");
  if (status !== "upcoming") return status as FollowUpState;
  const due = String(row["due_date"] ?? "");
  if (due < todayISO()) return "overdue";
  if (due === todayISO()) return "due";
  return "upcoming";
}

export const FOLLOW_UP_SELECT =
  "id, due_date, type, reason, notes, priority, status, completed_at, outcome_notes, " +
  "cancel_reason, reminder_offset_days, branch_id, visit_id, surgery_id, completed_visit_id, created_at, " +
  "patients(id, mrn, first_name, last_name, phone, email), " +
  "doctor:doctor_id(id, full_name), assignee:assigned_to(id, full_name), " +
  "branches(id, name), surgeries(id, procedure, scheduled_at)";

export function followUpPatientName(row: Row | null | undefined) {
  const p = row?.["patients"] as Row | null | undefined;
  if (!p) return "Patient";
  return [p["first_name"], p["last_name"]].filter(Boolean).join(" ");
}

export function useFollowUps() {
  return useQuery({
    queryKey: ["follow-up-board"],
    queryFn: async () => {
      const { data, error } = await db
        .from("follow_ups")
        .select(FOLLOW_UP_SELECT)
        .order("due_date", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function usePatientFollowUps(patientId: string | null | undefined) {
  return useQuery({
    queryKey: ["patient-follow-ups", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("follow_ups")
        .select(FOLLOW_UP_SELECT)
        .eq("patient_id", patientId!)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useFollowUpReminders(followUpId: string | null | undefined) {
  return useQuery({
    queryKey: ["follow-up-reminders", followUpId],
    enabled: !!followUpId,
    queryFn: async () => {
      const { data, error } = await db
        .from("communications")
        .select("id, channel, status, purpose, recipient, scheduled_at, sent_at, failure_reason, provider, message")
        .eq("follow_up_id", followUpId!)
        .order("channel");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["follow-up-board"] });
  void qc.invalidateQueries({ queryKey: ["patient-follow-ups"] });
  void qc.invalidateQueries({ queryKey: ["follow-up-reminders"] });
  void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
  void qc.invalidateQueries({ queryKey: ["surgery-follow-ups"] });
  void qc.invalidateQueries({ queryKey: ["visit-follow-ups"] });
}

export interface NewFollowUp {
  patient_id: string;
  due_date: string;
  type: string;
  reason?: string | null;
  notes?: string | null;
  priority?: string;
  doctor_id?: string | null;
  assigned_to?: string | null;
  visit_id?: string | null;
  surgery_id?: string | null;
  branch_id?: string | null;
  reminder_offset_days?: number;
  allow_duplicate?: boolean;
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: NewFollowUp) => {
      const { data, error } = await db
        .from("follow_ups")
        .insert({ ...values, status: "upcoming" })
        .select("id")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success("Follow-up scheduled — reminders queued");
      invalidate(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

export function useUpdateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await db.from("follow_ups").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Follow-up updated");
      invalidate(qc);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Runs the reminder dispatcher: internal notifications out, external held for a provider. */
export function useDispatchReminders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("dispatch_due_reminders");
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as { delivered?: number; held?: number } | null;
      return row ?? { delivered: 0, held: 0 };
    },
    onSuccess: (r) => {
      toast.success(`${r.delivered ?? 0} reminder(s) delivered, ${r.held ?? 0} awaiting a messaging provider`);
      invalidate(qc);
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
