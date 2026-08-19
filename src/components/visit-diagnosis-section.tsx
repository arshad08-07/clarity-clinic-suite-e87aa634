import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { type Row } from "@/lib/api";
import {
  DIAGNOSIS_EYES,
  DIAGNOSIS_SEVERITIES,
  diagnosisCode,
  diagnosisLabel,
  useAddDiagnosis,
  useDeleteDiagnosis,
  useDiagnosisCatalog,
  usePatientDiagnosisHistory,
  useUpdateDiagnosis,
  useVisitDiagnoses,
} from "@/lib/diagnoses";
import { fmtDateTime, titleize } from "@/lib/format";

const NONE = "__none__";

/**
 * Diagnosis capture for the encounter that is open on screen. Every row is
 * bound to this visit, patient and doctor — nothing is re-selected by hand.
 */
export function VisitDiagnosisSection({ visit }: { visit: Row }) {
  const visitId = String(visit["id"]);
  const patientId = String(visit["patient_id"]);
  const { profile, isAdmin, hasRole } = useAuth();
  const catalog = useDiagnosisCatalog();
  const current = useVisitDiagnoses(visitId);
  const history = usePatientDiagnosisHistory(patientId, visitId);
  const add = useAddDiagnosis();
  const del = useDeleteDiagnosis();

  const canEdit = isAdmin || hasRole("doctor", "optometrist");
  const rows = current.data ?? [];
  const hasPrimary = rows.some((r) => r["is_primary"] === true);

  const [search, setSearch] = useState("");
  const [catalogId, setCatalogId] = useState<string>(NONE);
  const [freeText, setFreeText] = useState("");
  const [eye, setEye] = useState("OU");
  const [severity, setSeverity] = useState<string>(NONE);
  const [notes, setNotes] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  const options = useMemo(() => {
    const list = catalog.data ?? [];
    const term = search.trim().toLowerCase();
    const filtered = term
      ? list.filter((c) =>
          [c["name"], c["code"], c["category"]].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)),
        )
      : list;
    return filtered.slice(0, 100);
  }, [catalog.data, search]);

  const reset = () => {
    setCatalogId(NONE);
    setFreeText("");
    setSeverity(NONE);
    setNotes("");
    setIsPrimary(false);
    setSearch("");
  };

  const submit = () => {
    if (catalogId === NONE && !freeText.trim()) return;
    add.mutate(
      {
        patient_id: patientId,
        visit_id: visitId,
        diagnosis_id: catalogId === NONE ? null : catalogId,
        diagnosis_text: catalogId === NONE ? freeText : null,
        eye,
        severity: severity === NONE ? null : severity,
        notes,
        is_primary: isPrimary && !hasPrimary,
        diagnosed_by: (visit["doctor_id"] as string | null) ?? profile?.id ?? null,
      },
      { onSuccess: reset },
    );
  };

  return (
    <div className="space-y-4">
      <section className="surface-card p-5">
        <h3 className="font-display text-base font-semibold">Add diagnosis to this visit</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Bound to visit {visitId.slice(0, 8)} · token #{String(visit["token_no"] ?? "—")} — the patient, doctor and
          branch are taken from this encounter.
        </p>

        {!canEdit ? (
          <p className="text-sm text-muted-foreground">Only clinicians can record diagnoses.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="dx-search">Search clinical catalog</Label>
                <Input
                  id="dx-search"
                  placeholder="Search by name or code, e.g. cataract…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Diagnosis code</Label>
                <Select value={catalogId} onValueChange={setCatalogId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select from catalog" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value={NONE}>Free text (no code)</SelectItem>
                    {options.map((c) => (
                      <SelectItem key={String(c["id"])} value={String(c["id"])}>
                        {String(c["code"])} · {String(c["name"])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dx-text">Free-text diagnosis</Label>
                <Input
                  id="dx-text"
                  placeholder="Used when no code applies"
                  value={freeText}
                  disabled={catalogId !== NONE}
                  onChange={(e) => setFreeText(e.target.value)}
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
              <div className="grid gap-1.5">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Not applicable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not applicable</SelectItem>
                    {DIAGNOSIS_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {titleize(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="dx-notes">Clinical note</Label>
                <Textarea id="dx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm" htmlFor="dx-primary">
                <Checkbox
                  id="dx-primary"
                  checked={isPrimary && !hasPrimary}
                  disabled={hasPrimary}
                  onCheckedChange={(c) => setIsPrimary(c === true)}
                />
                Primary diagnosis
                {hasPrimary ? <span className="text-muted-foreground">(already set for this visit)</span> : null}
              </label>
              <Button onClick={submit} disabled={add.isPending || (catalogId === NONE && !freeText.trim())}>
                Add diagnosis
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Current visit diagnoses</h3>
        {current.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rows.length === 0 ? (
          <EmptyState title="No diagnosis yet" description="Record the working diagnosis for this encounter above." />
        ) : (
          <ul className="space-y-2">
            {rows.map((d) => (
              <DiagnosisRow
                key={String(d["id"])}
                row={d}
                editable={canEdit}
                {...(isAdmin ? { onDelete: () => del.mutate(String(d["id"])) } : {})}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="surface-card p-5">
        <h3 className="mb-1 font-display text-base font-semibold">Previous diagnoses</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          History from earlier visits — read-only, never overwritten by this encounter.
        </p>
        {history.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (history.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No earlier diagnoses recorded for this patient.</p>
        ) : (
          <ul className="space-y-2">
            {(history.data ?? []).map((d) => (
              <DiagnosisRow key={String(d["id"])} row={d} editable={false} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DiagnosisRow({
  row,
  editable,
  onDelete,
}: {
  row: Row;
  editable: boolean;
  onDelete?: () => void;
}) {
  const update = useUpdateDiagnosis();
  const doctor = row["profiles"] as Row | null;
  const code = diagnosisCode(row);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(String(row["notes"] ?? ""));
  const [severity, setSeverity] = useState(String(row["severity"] ?? NONE));
  const [eye, setEye] = useState(String(row["eye"] ?? "NA"));

  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={row["is_primary"] ? "default" : "secondary"}>
          {row["is_primary"] ? "Primary" : "Secondary"}
        </Badge>
        <span className="font-medium">{diagnosisLabel(row)}</span>
        {code ? <Badge variant="outline">{code}</Badge> : null}
        <Badge variant="outline">{row["eye"] ? String(row["eye"]) : "N/A"}</Badge>
        {row["severity"] ? <Badge variant="secondary">{titleize(String(row["severity"]))}</Badge> : null}
        <span className="text-xs text-muted-foreground">
          {fmtDateTime(String(row["created_at"]))}
          {doctor?.["full_name"] ? ` · ${String(doctor["full_name"])}` : ""}
        </span>
        {editable ? (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
        ) : null}
        {onDelete ? (
          <Button size="sm" variant="ghost" onClick={onDelete}>
            Remove
          </Button>
        ) : null}
      </div>
      {row["notes"] && !editing ? <p className="mt-1 text-muted-foreground">{String(row["notes"])}</p> : null}

      {editing ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
          <div className="grid gap-1.5">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not applicable</SelectItem>
                {DIAGNOSIS_SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {titleize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5 sm:col-span-3">
            <Label>Note</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  {
                    id: String(row["id"]),
                    patch: {
                      eye: eye === "NA" ? null : eye,
                      severity: severity === NONE ? null : severity,
                      notes: notes.trim() || null,
                    },
                  },
                  { onSuccess: () => setEditing(false) },
                )
              }
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
