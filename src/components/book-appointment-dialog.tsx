import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

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
import { useAuth } from "@/hooks/use-auth";
import { db, useLookup, useSaveRow } from "@/lib/api";
import { generateSlots, useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Books an appointment on a slot grid generated from the clinic's appointment
 * settings, so working hours, breaks, holidays and slot length are respected
 * before the database rules ever run.
 */
export function BookAppointmentDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIso());
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("");

  const { primaryBranchId } = useAuth();
  const { settings } = useSettings(primaryBranchId);
  const cfg = settings.appointments;

  const patients = useLookup("patients", "id, mrn, first_name, last_name", { orderBy: "first_name", enabled: open });
  const doctors = useLookup("profiles", "id, full_name", { orderBy: "full_name", enabled: open });
  const save = useSaveRow("appointments", "Appointment");

  const booked = useQuery({
    queryKey: ["slots-taken", date, doctorId],
    enabled: open && !!date,
    queryFn: async () => {
      let q = db
        .from("appointments")
        .select("scheduled_at, doctor_id, status")
        .gte("scheduled_at", `${date}T00:00:00`)
        .lte("scheduled_at", `${date}T23:59:59`);
      if (doctorId) q = q.eq("doctor_id", doctorId);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as { scheduled_at: string; status: string }[])
        .filter((r) => !["cancelled", "no_show"].includes(String(r.status)))
        .map((r) => String(r.scheduled_at));

    },
  });

  const { slots, closedReason } = useMemo(
    () => generateSlots(cfg, date, booked.data ?? []),
    [cfg, date, booked.data],
  );

  const submit = () => {
    if (!patientId || !slot) return;
    save.mutate(
      {
        patient_id: patientId,
        doctor_id: doctorId || null,
        scheduled_at: slot,
        duration_min: cfg.slot_minutes,
        reason: reason || null,
        status: "scheduled",
        branch_id: primaryBranchId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setSlot("");
          setReason("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <CalendarPlus className="size-4" /> Book slot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Book an appointment slot</DialogTitle>
          <DialogDescription>
            Slots follow the clinic settings — {cfg.slot_minutes} minute slots, working hours, breaks
            and holidays.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {(patients.data ?? []).map((p) => (
                  <SelectItem key={String(p["id"])} value={String(p["id"])}>
                    {`${p["first_name"] ?? ""} ${p["last_name"] ?? ""}`.trim()} · {String(p["mrn"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
            <div className="grid gap-1.5">
              <Label>Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Any doctor" /></SelectTrigger>
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
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlot("");
                }}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Available slots</Label>
            {closedReason ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{closedReason}</p>
            ) : (
              <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {slots.map((s) => (
                  <Button
                    key={s.value}
                    type="button"
                    size="sm"
                    disabled={s.taken}
                    variant={slot === s.value ? "default" : "outline"}
                    className={cn("text-xs", s.taken && "line-through opacity-50")}
                    onClick={() => setSlot(s.value)}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Eye check-up" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!patientId || !slot || save.isPending}>
            Book appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
