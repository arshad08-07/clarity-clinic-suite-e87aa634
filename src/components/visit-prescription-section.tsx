import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

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
import {
  parseRxLine,
  rxSummary,
  RX_QUICK_PICKS,
  useAddPrescriptionItems,
  usePreviousPrescription,
  useRemovePrescriptionItem,
} from "@/lib/rx-quick";

const NONE = "__none__";

/** Prescription for the current encounter — fast pad first, detailed form on demand. */
export function VisitPrescriptionSection({ visit }: { visit: Row }) {
  const visitId = String(visit["id"]);
  const patientId = String(visit["patient_id"]);
  const { profile } = useAuth();
  const rx = useVisitPrescription(visitId);
  const diagnoses = useVisitDiagnoses(visitId);
  const addItem = useAddPrescriptionItem(visit);
  const addItems = useAddPrescriptionItems(visit);
  const removeItem = useRemovePrescriptionItem(visitId);
  const saveNotes = useSavePrescriptionNotes(visitId);
  const previous = usePreviousPrescription(patientId, visitId);

  const [pad, setPad] = useState("");
  const [showDetailed, setShowDetailed] = useState(false);

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

  const parsed = useMemo(
    () =>
      pad
        .split("\n")
        .map((l) => parseRxLine(l))
        .filter((p): p is NonNullable<typeof p> => !!p),
    [pad],
  );

  const prevItems = (previous.data?.["prescription_items"] ?? []) as Row[];

  const appendLine = (line: string) => setPad((p) => (p.trim() ? `${p.replace(/\n+$/, "")}\n${line}` : line));

  const commitPad = () => {
    if (parsed.length === 0) return;
    addItems.mutate(
      { items: parsed.map(({ unparsed: _u, ...item }) => item), doctorId: profile?.id ?? null },
      { onSuccess: () => setPad("") },
    );
  };

  const repeatPrevious = () => {
    if (prevItems.length === 0) return;
    addItems.mutate({
      items: prevItems.map((i) => ({
        drug_name: String(i["drug_name"]),
        strength: (i["strength"] as string | null) ?? null,
        dosage: (i["dosage"] as string | null) ?? null,
        frequency: (i["frequency"] as string | null) ?? null,
        duration: (i["duration"] as string | null) ?? null,
        route: (i["route"] as string | null) ?? null,
        instructions: (i["instructions"] as string | null) ?? null,
        eye: (i["eye"] as string | null) ?? null,
      })),
      doctorId: profile?.id ?? null,
    });
  };

  const submitDetailed = () => {
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-semibold">Rx pad</h3>
            <p className="text-sm text-muted-foreground">
              Write like on paper — one medicine per line. e.g.{" "}
              <code className="rounded bg-muted px-1">Moxifloxacin 0.5% 1drop qid 7d OD</code>
            </p>
          </div>
          {prevItems.length > 0 ? (
            <Button variant="outline" size="sm" onClick={repeatPrevious} disabled={addItems.isPending}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Repeat last Rx ({prevItems.length})
            </Button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {RX_QUICK_PICKS.map((q) => (
            <Button
              key={q.label}
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => appendLine(q.line)}
            >
              <Plus className="mr-1 h-3 w-3" />
              {q.label}
            </Button>
          ))}
        </div>

        <Textarea
          className="mt-3 min-h-28 font-mono text-sm"
          placeholder={"Moxifloxacin 0.5% 1drop qid 7d OD\nCarboxymethylcellulose 0.5% 1drop 6t 30d OU"}
          value={pad}
          onChange={(e) => setPad(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              commitPad();
            }
          }}
        />

        {parsed.length > 0 ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {parsed.map((p, idx) => (
              <li key={`${p.drug_name}-${idx}`} className="rounded-md border border-dashed p-2">
                <span className="font-medium">{p.drug_name}</span>{" "}
                <span className="text-muted-foreground">{rxSummary(p) || "no details"}</span>
                {p.instructions ? <span className="text-muted-foreground"> · {p.instructions}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={commitPad} disabled={parsed.length === 0 || addItems.isPending}>
            Add {parsed.length || ""} medicine{parsed.length === 1 ? "" : "s"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Ctrl/Cmd + Enter to add · shorthand: qd bd tds qid hs sos · 7d 2w 1m · OD OS OU · po/top
          </span>
          <Button variant="ghost" size="sm" onClick={() => setShowDetailed((v) => !v)}>
            {showDetailed ? "Hide detailed form" : "Detailed form"}
          </Button>
        </div>
      </section>

      {showDetailed ? (
        <section className="surface-card p-5">
          <h3 className="font-display text-base font-semibold">Detailed entry</h3>
          <p className="mb-3 text-sm text-muted-foreground">
            Use this when you need to link a medicine to a specific diagnosis of visit {visitId.slice(0, 8)}.
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
              <Input
                id="rx-route"
                placeholder="Topical / oral"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
              />
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
            <Button onClick={submitDetailed} disabled={!drug.trim() || addItem.isPending}>
              Add medicine
            </Button>
          </div>
        </section>
      ) : null}

      <section className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Prescription for this visit</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No medicines added yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((i) => {
              const dx = i["diagnosis_id"] ? dxById.get(String(i["diagnosis_id"])) : null;
              return (
                <li key={String(i["id"])} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div>
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
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${String(i["drug_name"])}`}
                    disabled={removeItem.isPending}
                    onClick={() => removeItem.mutate(String(i["id"]))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
