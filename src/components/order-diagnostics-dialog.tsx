import { type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { type Row } from "@/lib/api";
import { diagnosisCode, diagnosisLabel, useVisitDiagnoses } from "@/lib/diagnoses";
import { DIAG_PRIORITIES, useCreateDiagnosticOrders, useDiagnosticTests } from "@/lib/diagnostics";
import { titleize } from "@/lib/format";

const NO_DX = "__none__";

/**
 * Doctor-side ordering: every order is bound to the visit that is open on screen,
 * so no new patient or encounter is ever created here.
 */
export function OrderDiagnosticsDialog({
  visit,
  trigger,
  onOrdered,
}: {
  visit: Row;
  trigger: ReactNode;
  onOrdered?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [eye, setEye] = useState("OU");
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  const [dxId, setDxId] = useState(NO_DX);
  const { profile } = useAuth();
  const tests = useDiagnosticTests(open);
  const diagnoses = useVisitDiagnoses(open ? String(visit["id"]) : "");

  const create = useCreateDiagnosticOrders();

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!picked.length) return;
    const dx = (diagnoses.data ?? []).find((d) => String(d["id"]) === dxId);
    const dxLine = dx
      ? `Indication: ${diagnosisLabel(dx)}${diagnosisCode(dx) ? ` (${diagnosisCode(dx)})` : ""}`
      : "";
    const combinedNotes = [dxLine, notes.trim()].filter(Boolean).join(" — ");
    create.mutate(
      picked.map((test_id) => ({
        patient_id: String(visit["patient_id"]),
        visit_id: String(visit["id"]),
        test_id,
        eye,
        priority,
        ordered_by: (visit["doctor_id"] as string) ?? profile?.id ?? null,
        doctor_notes: combinedNotes || null,
      })),
      {
        onSuccess: () => {
          setOpen(false);
          setPicked([]);
          setNotes("");
          setDxId(NO_DX);
          onOrdered?.();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Order diagnostics for this visit</DialogTitle>
          <DialogDescription>
            Tests are linked to visit {String(visit["id"]).slice(0, 8)} · token #{String(visit["token_no"] ?? "—")}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label className="mb-2 block">Tests</Label>
            <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
              {(tests.data ?? []).map((t) => {
                const id = String(t["id"]);
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm"
                    htmlFor={`test-${id}`}
                  >
                    <Checkbox id={`test-${id}`} checked={picked.includes(id)} onCheckedChange={() => toggle(id)} />
                    <span className="flex-1">{String(t["name"])}</span>
                    <Badge variant="secondary">{String(t["code"])}</Badge>
                  </label>
                );
              })}
              {tests.data?.length === 0 && <p className="text-sm text-muted-foreground">No active tests in catalog.</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Eye</Label>
              <Select value={eye} onValueChange={setEye}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["OD", "OS", "OU"].map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
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
                  {DIAG_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {titleize(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Note for diagnostic staff</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={submit} disabled={!picked.length || create.isPending}>
            Order {picked.length || ""} test{picked.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
