import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LogIn, Stethoscope } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { db, errorMessage, type Row } from "@/lib/api";

/** Opens the full chronological patient record. */
export function PatientRecordLink({ patientId }: { patientId: string }) {
  return (
    <Button asChild variant="ghost" size="icon" title="Open patient record">
      <Link to="/patient/$patientId" params={{ patientId }}>
        <Stethoscope className="size-4" />
      </Link>
    </Button>
  );
}

/** Marks an appointment as checked in; the backend creates the visit and token. */
export function CheckInButton({ row }: { row: Row }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const status = String(row["status"] ?? "");
  if (["checked_in", "in_progress", "completed", "cancelled", "no_show"].includes(status)) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Check in patient"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const { error } = await db
          .from("appointments")
          .update({ status: "checked_in" })
          .eq("id", row["id"]);
        setBusy(false);
        if (error) {
          toast.error(errorMessage(error));
          return;
        }
        toast.success("Patient checked in — visit and token created");
        void qc.invalidateQueries();
      }}
    >
      <LogIn className="size-4" />
    </Button>
  );
}

/** Advances a visit through the clinic queue stages. */
const FLOW = ["waiting", "optometry", "with_doctor", "diagnostics", "billing", "completed"] as const;

export function AdvanceVisitButton({ row }: { row: Row }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const current = String(row["status"] ?? "waiting");
  const idx = FLOW.indexOf(current as (typeof FLOW)[number]);
  if (idx < 0 || idx >= FLOW.length - 1) return null;
  const next = FLOW[idx + 1]!;

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      title={`Move to ${next.replace("_", " ")}`}
      onClick={async () => {
        setBusy(true);
        const patch: Row = { status: next };
        if (next === "completed") patch["completed_at"] = new Date().toISOString();
        const { error } = await db.from("visits").update(patch).eq("id", row["id"]);
        setBusy(false);
        if (error) {
          toast.error(errorMessage(error));
          return;
        }
        toast.success(`Moved to ${next.replace("_", " ")}`);
        void qc.invalidateQueries();
      }}
    >
      →
    </Button>
  );
}
