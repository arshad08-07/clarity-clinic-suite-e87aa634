import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";

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
import { useLookup } from "@/lib/api";
import { useWalkIn } from "@/lib/queue";

/** Adds a patient without an appointment straight into the live queue. */
export function WalkInDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [complaint, setComplaint] = useState("");
  const navigate = useNavigate();

  const patients = useLookup("patients", "id, mrn, first_name, last_name", { orderBy: "first_name", enabled: open });
  const doctors = useLookup("profiles", "id, full_name", { orderBy: "full_name", enabled: open });
  const walkIn = useWalkIn();

  const submit = () => {
    if (!patientId) return;
    walkIn.mutate(
      { patientId, doctorId: doctorId || null, complaint, priority },
      {
        onSuccess: (visit) => {
          setOpen(false);
          setPatientId("");
          setComplaint("");
          void navigate({ to: "/visit/$visitId", params: { visitId: String(visit["id"]) } });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add walk-in patient</DialogTitle>
          <DialogDescription>
            Creates a visit and queue token immediately — no appointment needed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {(patients.data ?? []).map((p) => (
                  <SelectItem key={String(p["id"])} value={String(p["id"])}>
                    {`${p["first_name"] ?? ""} ${p["last_name"] ?? ""}`.trim()} · {String(p["mrn"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Doctor (optional)</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="Assign later" />
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
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="senior">Senior citizen</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Chief complaint</Label>
            <Input value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="e.g. Redness, watering" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!patientId || walkIn.isPending}>
            Add to queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
