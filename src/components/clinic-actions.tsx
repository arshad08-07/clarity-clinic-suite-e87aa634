import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock, LogIn, Stethoscope, UserX, XCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Row } from "@/lib/api";
import { useAppointmentUpdate, useCheckIn, useVisitByAppointments } from "@/lib/queue";

/** Opens the full chronological patient record. */
export function PatientRecordLink({ patientId }: { patientId: string }) {
  return (
    <Button asChild variant="ghost" size="icon" title="View patient record">
      <Link to="/patient/$patientId" params={{ patientId }}>
        <Stethoscope className="size-4" />
      </Link>
    </Button>
  );
}

const CLOSED = ["cancelled", "no_show", "completed"];

/**
 * Appointment row actions. Check-in calls one backend function that marks the
 * appointment arrived, opens the visit and issues the queue token.
 */
export function AppointmentActions({ row }: { row: Row }) {
  const id = String(row["id"]);
  const status = String(row["status"] ?? "");
  const navigate = useNavigate();
  const checkIn = useCheckIn();
  const update = useAppointmentUpdate();
  const visits = useVisitByAppointments([id]);
  const visit = visits.data?.[id];

  if (visit) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Badge variant="secondary">Arrived · #{String(visit["token_no"] ?? "—")}</Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void navigate({ to: "/visit/$visitId", params: { visitId: String(visit["id"]) } })}
        >
          Open visit
        </Button>
        {row["patient_id"] ? <PatientRecordLink patientId={String(row["patient_id"])} /> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!CLOSED.includes(status) && (
        <Button
          size="sm"
          disabled={checkIn.isPending}
          onClick={() =>
            checkIn.mutate(id, {
              onSuccess: (v) => void navigate({ to: "/visit/$visitId", params: { visitId: String(v["id"]) } }),
            })
          }
        >
          <LogIn className="size-4" /> Check in
        </Button>
      )}
      {!CLOSED.includes(status) && (
        <>
          <RescheduleDialog row={row} />
          <Button
            size="icon"
            variant="ghost"
            title="Mark no-show"
            onClick={() => update.mutate({ id, patch: { status: "no_show" } })}
          >
            <UserX className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Cancel appointment"
            onClick={() => update.mutate({ id, patch: { status: "cancelled" } })}
          >
            <XCircle className="size-4" />
          </Button>
        </>
      )}
      {CLOSED.includes(status) && <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>}
      {row["patient_id"] ? <PatientRecordLink patientId={String(row["patient_id"])} /> : null}
    </div>
  );
}

function RescheduleDialog({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const current = String(row["scheduled_at"] ?? "");
  const [when, setWhen] = useState(current ? new Date(current).toISOString().slice(0, 16) : "");
  const update = useAppointmentUpdate();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Reschedule">
          <CalendarClock className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>New date &amp; time</Label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!when || update.isPending}
            onClick={() =>
              update.mutate(
                {
                  id: String(row["id"]),
                  patch: { scheduled_at: new Date(when).toISOString(), status: "scheduled" },
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
