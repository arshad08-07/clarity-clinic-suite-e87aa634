import { Link } from "@tanstack/react-router";
import { BellRing, CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLookup, type Row } from "@/lib/api";
import { fmtDate, titleize } from "@/lib/format";
import {
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_TYPES,
  STATE_LABELS,
  STATE_TONE,
  followUpState,
  usePatientFollowUps,
  useCreateFollowUp,
  useFollowUpReminders,
} from "@/lib/follow-ups";
import { cn } from "@/lib/utils";

function isoInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  patientId: string;
  visitId?: string | null;
  surgeryId?: string | null;
  doctorId?: string | null;
  branchId?: string | null;
  defaultType?: string;
  title?: string;
  description?: string;
}

/**
 * Books a recall from wherever the clinical decision is taken (consultation or
 * discharge) and shows the recall history for that patient inline.
 */
export function FollowUpSection({
  patientId,
  visitId = null,
  surgeryId = null,
  doctorId = null,
  branchId = null,
  defaultType = "review",
  title = "Follow-up",
  description = "Schedule the next review. Reminders are queued automatically for the patient.",
}: Props) {
  const list = usePatientFollowUps(patientId);
  const create = useCreateFollowUp();
  const doctors = useLookup("profiles", "id, full_name", { filters: { is_active: true }, orderBy: "full_name" });

  const [dueDate, setDueDate] = useState(isoInDays(surgeryId ? 1 : 14));
  const [type, setType] = useState(defaultType);
  const [priority, setPriority] = useState("normal");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [doctor, setDoctor] = useState(doctorId ? String(doctorId) : "");
  const [offset, setOffset] = useState("1");
  const [force, setForce] = useState(false);

  const rows = (list.data ?? []).filter(
    (r) => !surgeryId || String(r["surgery_id"] ?? "") === String(surgeryId),
  );

  function submit() {
    create.mutate(
      {
        patient_id: patientId,
        visit_id: visitId,
        surgery_id: surgeryId,
        branch_id: branchId,
        doctor_id: doctor || doctorId || null,
        assigned_to: doctor || doctorId || null,
        due_date: dueDate,
        type,
        priority,
        reason: reason || null,
        notes: notes || null,
        reminder_offset_days: Number(offset) || 0,
        allow_duplicate: force,
      },
      {
        onSuccess: () => {
          setReason("");
          setNotes("");
          setForce(false);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <section className="surface-card p-5">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="mb-3 text-sm text-muted-foreground">{description}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Follow-up date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {titleize(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {titleize(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Doctor</Label>
            <Select value={doctor} onValueChange={setDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Select doctor" />
              </SelectTrigger>
              <SelectContent>
                {(doctors.data ?? []).map((d) => (
                  <SelectItem key={String(d["id"])} value={String(d["id"])}>
                    {String(d["full_name"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Remind (days before)</Label>
            <Input type="number" min={0} value={offset} onChange={(e) => setOffset(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. IOP recheck" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2 lg:col-span-3">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={create.isPending || !dueDate}>
            <CalendarPlus className="size-4" /> Schedule follow-up
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Allow a duplicate for the same date
          </label>
        </div>
      </section>

      <section className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Recall history</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-ups recorded for this patient yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <FollowUpRow key={String(r["id"])} row={r} />
            ))}
          </ul>
        )}
        <Link to="/follow-ups" className="mt-3 inline-block text-sm text-primary hover:underline">
          Open follow-up board →
        </Link>
      </section>
    </div>
  );
}

function FollowUpRow({ row }: { row: Row }) {
  const state = followUpState(row);
  const reminders = useFollowUpReminders(String(row["id"]));
  const sent = (reminders.data ?? []).filter((r) => r["status"] === "sent").length;
  const queued = (reminders.data ?? []).filter((r) => r["status"] === "queued").length;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
      <span className="flex flex-wrap items-center gap-2">
        <Badge className={cn("border-0", STATE_TONE[state])}>{STATE_LABELS[state]}</Badge>
        <span className="font-medium">{fmtDate(row["due_date"])}</span>
        <span className="text-muted-foreground">
          {titleize(String(row["type"] ?? "review"))}
          {row["reason"] ? ` · ${String(row["reason"])}` : ""}
        </span>
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <BellRing className="size-3.5" /> {sent} sent · {queued} queued
      </span>
    </li>
  );
}
