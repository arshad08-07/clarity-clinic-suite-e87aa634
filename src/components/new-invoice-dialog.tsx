import { useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLookup, type Row } from "@/lib/api";
import { INVOICE_TYPES, useCreateInvoice } from "@/lib/billing";
import { titleize } from "@/lib/format";

interface Props {
  trigger: ReactNode;
  /** Pre-bind the invoice to a patient/visit when raised from a clinical screen. */
  patientId?: string;
  visitId?: string;
  branchId?: string;
  defaultType?: string;
}

export function NewInvoiceDialog({ trigger, patientId, visitId, branchId, defaultType = "consultation" }: Props) {
  const [open, setOpen] = useState(false);
  const [patient, setPatient] = useState(patientId ?? "");
  const [type, setType] = useState(defaultType);
  const [notes, setNotes] = useState("");
  const create = useCreateInvoice();
  const navigate = useNavigate();
  const patients = useLookup("patients", "id, mrn, first_name, last_name", {
    orderBy: "first_name",
    enabled: open && !patientId,
    limit: 300,
  });

  const submit = () => {
    create.mutate(
      {
        patient_id: patient || null,
        visit_id: visitId ?? null,
        branch_id: branchId ?? null,
        invoice_type: type,
        notes: notes || null,
      },
      {
        onSuccess: (row: Row) => {
          setOpen(false);
          void navigate({ to: "/invoice/$invoiceId", params: { invoiceId: String(row["id"]) } });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {!patientId && (
            <div className="grid gap-1.5">
              <Label>Patient</Label>
              <Select value={patient} onValueChange={setPatient}>
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
          )}
          <div className="grid gap-1.5">
            <Label>Invoice type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {titleize(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
          {visitId ? (
            <p className="text-xs text-muted-foreground">Linked to visit {visitId.slice(0, 8)}.</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={create.isPending || (!patient && !patientId)}>
            Create invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
