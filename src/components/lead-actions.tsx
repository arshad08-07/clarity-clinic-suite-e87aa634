import { Link } from "@tanstack/react-router";
import { CalendarPlus, MessageSquarePlus, Stethoscope, UserPlus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useLookup, type Row } from "@/lib/api";
import {
  useBookLeadAppointment,
  useConvertLead,
  useLeadActivities,
  useLeadAppointments,
  useLeadMatches,
  useLogLeadActivity,
} from "@/lib/crm";
import { fmtDateTime, titleize } from "@/lib/format";

const APPOINTMENT_TYPES = ["new_patient", "consultation", "surgery_counselling", "diagnostic", "review"];

function localDateTime(daysAhead = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

/** Row actions on the leads pipeline: log contact, book, convert, open patient. */
export function LeadActions({ row }: { row: Row }) {
  const leadId = String(row["id"]);
  const convertedTo = row["converted_patient_id"] ? String(row["converted_patient_id"]) : null;

  return (
    <div className="flex items-center justify-end gap-1">
      <ActivityDialog row={row} />
      <AppointmentDialog row={row} />
      {convertedTo ? (
        <>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            Converted
          </Badge>
          <Button asChild size="sm" variant="outline" title="Open patient record">
            <Link to="/patient/$patientId" params={{ patientId: convertedTo }}>
              <Stethoscope className="size-4" /> Patient
            </Link>
          </Button>
        </>
      ) : (
        <ConvertDialog leadId={leadId} name={String(row["name"] ?? "")} phone={String(row["phone"] ?? "")} />
      )}
    </div>
  );
}

function ActivityDialog({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState("Called");
  const [outcome, setOutcome] = useState("");
  const [next, setNext] = useState("");
  const log = useLogLeadActivity();
  const history = useLeadActivities(open ? String(row["id"]) : null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Log contact activity">
          <MessageSquarePlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contact activity</DialogTitle>
          <DialogDescription>Log the call, message or visit against this enquiry.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Activity</Label>
            <Input value={activity} onChange={(e) => setActivity(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Outcome</Label>
            <Textarea rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Next action</Label>
            <Input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          {history.data?.length ? (
            <ul className="max-h-40 space-y-1 overflow-auto border-t pt-2 text-xs text-muted-foreground">
              {history.data.map((a) => (
                <li key={String(a["id"])}>
                  {fmtDateTime(String(a["created_at"]))} · {String(a["activity"])}
                  {a["outcome"] ? ` — ${String(a["outcome"])}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            disabled={!activity.trim() || log.isPending}
            onClick={() =>
              log.mutate(
                {
                  lead_id: String(row["id"]),
                  activity: activity.trim(),
                  outcome: outcome || null,
                  next_action_at: next ? new Date(next).toISOString() : null,
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Log activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentDialog({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(localDateTime());
  const [doctor, setDoctor] = useState("");
  const [type, setType] = useState("new_patient");
  const [reason, setReason] = useState(String(row["interest"] ?? ""));
  const book = useBookLeadAppointment();
  const doctors = useLookup("profiles", "id, full_name", { filters: { is_active: true }, orderBy: "full_name" });
  const existing = useLeadAppointments(open ? String(row["id"]) : null);
  const patientId = row["converted_patient_id"] ? String(row["converted_patient_id"]) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Book appointment for this enquiry">
          <CalendarPlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book appointment</DialogTitle>
          <DialogDescription>
            The appointment stays attached to this enquiry and moves onto the patient record at conversion.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Date &amp; time</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Doctor</Label>
            <Select value={doctor} onValueChange={setDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Any available" />
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
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {titleize(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        {existing.data?.length ? (
          <ul className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
            {existing.data.map((a) => (
              <li key={String(a["id"])}>
                {fmtDateTime(String(a["scheduled_at"]))} · {titleize(String(a["status"]))}
                {a["patient_id"] ? " · linked to patient" : " · enquiry only"}
              </li>
            ))}
          </ul>
        ) : null}
        <DialogFooter>
          <Button
            disabled={book.isPending}
            onClick={() =>
              book.mutate(
                {
                  lead_id: String(row["id"]),
                  patient_id: patientId,
                  branch_id: row["branch_id"] ?? null,
                  doctor_id: doctor || null,
                  scheduled_at: new Date(when).toISOString(),
                  appointment_type: type,
                  reason: reason || null,
                  status: "scheduled",
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Book
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Conversion gate. Look-alike patients (same phone or email) are surfaced first
 * so the same person is never registered twice.
 */
function ConvertDialog({ leadId, name, phone }: { leadId: string; name: string; phone: string }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>("");
  const matches = useLeadMatches(leadId, open);
  const convert = useConvertLead();
  const rows = matches.data ?? [];
  const forceNew = choice === "__new__";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setChoice("");
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" /> Convert to patient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to patient</DialogTitle>
          <DialogDescription>
            {name} · {phone}. Existing records with the same phone or email are shown below — link to one instead of
            creating a duplicate.
          </DialogDescription>
        </DialogHeader>

        {matches.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {rows.length ? (
              rows.map((m) => {
                const id = String(m["patient_id"]);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setChoice(id)}
                    className={`w-full rounded-md border p-3 text-left text-sm ${
                      choice === id ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <span className="font-medium">{String(m["full_name"])}</span>{" "}
                    <span className="text-muted-foreground">
                      · {String(m["mrn"])} · {String(m["phone"] ?? "")} · matched on {String(m["match_on"])}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No existing patient matches this phone or email.</p>
            )}
            {rows.length ? (
              <button
                type="button"
                onClick={() => setChoice("__new__")}
                className={`w-full rounded-md border border-dashed p-3 text-left text-sm ${
                  forceNew ? "border-primary bg-primary/5" : ""
                }`}
              >
                This is a different person — create a new patient record
              </button>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={convert.isPending || (rows.length > 0 && !choice)}
            onClick={() =>
              convert.mutate(
                {
                  leadId,
                  patientId: choice && choice !== "__new__" ? choice : null,
                  createNew: forceNew || rows.length === 0,
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            {choice && choice !== "__new__" ? "Link to selected patient" : "Create patient"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
