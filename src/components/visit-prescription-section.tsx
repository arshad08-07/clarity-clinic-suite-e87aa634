import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { type Row } from "@/lib/api";
import { DIAGNOSIS_EYES, diagnosisCode, diagnosisLabel, useVisitDiagnoses } from "@/lib/diagnoses";
import { fmtDate } from "@/lib/format";
import { useAddPrescriptionItem, useSavePrescriptionNotes, useVisitPrescription } from "@/lib/prescriptions";

const NONE = "__none__";

/** Prescription for the current encounter, optionally tied to this visit's diagnoses. */
export function VisitPrescriptionSection({ visit }: { visit: Row }) {
  const visitId = String(visit["id"]);
  const { profile } = useAuth();
  const rx = useVisitPrescription(visitId);
  const diagnoses = useVisitDiagnoses(visitId);
  const addItem = useAddPrescriptionItem(visit);
  const saveNotes = useSavePrescriptionNotes(visitId);

  const [drug, setDrug] = useState("");
  const [strength, setStrength] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [route, setRoute] = useState("");
  const [eye, setEye] = useState("OU");
  const [diagnosisId, setDiagnosisId] = useState(NONE);
  const [instructions, setInstructions] = useState("");

  const record = rx.data;
  const items = (record?.["prescription_items"] ?? []) as Row[];
  const dxRows = diagnoses.data ?? [];
  const dxById = new Map(dxRows.map((d) => [String(d["id"]), d]));

  const [notes, setNotes] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);

  const submit = () => {
    if (!drug.trim()) return;
    addItem.mutate(
      {
        item: {
          drug_name: drug,
          strength,
          dosage,
          frequency,
          duration,
          route,
          instructions,
          eye,
          diagnosis_id: diagnosisId === NONE ? null : diagnosisId,
        },
        doctorId: profile?.id ?? null,
      },
      {
        onSuccess: () => {
          setDrug("");
          setStrength("");
          setDosage("");
          setFrequency("");
          setDuration("");
          setInstructions("");
        },
      },
    );
  };

  if (rx.isLoading) return <Skeleton className="h-56 w-full" />;

  return (
    <div className="space-y-4">
      <section className="surface-card p-5">
        <h3 className="font-display text-base font-semibold">Prescribe for this visit</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Medicines stay attached to visit {visitId.slice(0, 8)} and flow to the pharmacy queue. Linking a diagnosis is
          optional.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rx-drug">Drug</Label>
            <Input id="rx-drug" value={drug} onChange={(e) => setDrug(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rx-strength">Strength</Label>
            <Input id="rx-strength" value={strength} onChange={(e) => setStrength(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rx-dosage">Dosage</Label>
            <Input id="rx-dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rx-freq">Frequency</Label>
            <Input id="rx-freq" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rx-duration">Duration</Label>
            <Input id="rx-duration" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rx-route">Route</Label>
            <Input id="rx-route" placeholder="Topical / oral" value={route} onChange={(e) => setRoute(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Eye</Label>
            <Select value={eye} onValueChange={setEye}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIAGNOSIS_EYES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>For diagnosis (optional)</Label>
            <Select value={diagnosisId} onValueChange={setDiagnosisId}>
              <SelectTrigger>
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not linked</SelectItem>
                {dxRows.map((d) => (
                  <SelectItem key={String(d["id"])} value={String(d["id"])}>
                    {diagnosisLabel(d)}
                    {diagnosisCode(d) ? ` (${diagnosisCode(d)})` : ""} · {String(d["eye"] ?? "N/A")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-3">
            <Label htmlFor="rx-instructions">Instructions</Label>
            <Textarea id="rx-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={submit} disabled={!drug.trim() || addItem.isPending}>
            Add medicine
          </Button>
        </div>
      </section>

      <section className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Prescription for this visit</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medicines added yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((i) => {
              const dx = i["diagnosis_id"] ? dxById.get(String(i["diagnosis_id"])) : null;
              return (
                <li key={String(i["id"])} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{String(i["drug_name"])}</span>
                    {i["strength"] ? <Badge variant="outline">{String(i["strength"])}</Badge> : null}
                    {i["eye"] ? <Badge variant="outline">{String(i["eye"])}</Badge> : null}
                    {dx ? <Badge variant="secondary">For {diagnosisLabel(dx)}</Badge> : null}
                  </div>
                  <p className="text-muted-foreground">
                    {[i["dosage"], i["frequency"], i["duration"], i["route"], i["instructions"]]
                      .filter(Boolean)
                      .map(String)
                      .join(" · ") || "—"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {record ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rx-notes">Prescription notes</Label>
              <Textarea
                id="rx-notes"
                value={notes ?? String(record["notes"] ?? "")}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rx-followup">Review on</Label>
              <Input
                id="rx-followup"
                type="date"
                value={followUp ?? (record["follow_up_date"] ? String(record["follow_up_date"]) : "")}
                onChange={(e) => setFollowUp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {record["follow_up_date"] ? `Currently ${fmtDate(String(record["follow_up_date"]))}` : "Not set"}
              </p>
            </div>
            <div>
              <Button
                variant="outline"
                disabled={saveNotes.isPending}
                onClick={() =>
                  saveNotes.mutate({
                    id: String(record["id"]),
                    notes: notes ?? (record["notes"] ? String(record["notes"]) : null),
                    followUp: followUp ?? (record["follow_up_date"] ? String(record["follow_up_date"]) : null),
                  })
                }
              >
                Save prescription
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
