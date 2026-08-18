import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { db, errorMessage, useLookup, type Row } from "@/lib/api";
import { useCreateInvoice } from "@/lib/billing";
import { fmtDate, fmtDateTime, fmtMoney, titleize } from "@/lib/format";
import {
  CONSENT_STATUSES,
  PREOP_ITEMS,
  preopMissing,
  SURGERY_STATUSES,
  surgeryPatientName,
  useAvailableIols,
  useCreateSurgeryFollowUp,
  usePatientDiagnostics,
  useSurgery,
  useSurgeryFollowUps,
  useSurgeryStockMovements,
  useUpdateSurgery,
} from "@/lib/surgery";

export const Route = createFileRoute("/_authenticated/surgery/$surgeryId")({
  head: () => ({
    meta: [
      { title: "Surgery Workspace — Vision Care HMS" },
      {
        name: "description",
        content:
          "Surgery journey in one screen: estimate, consent, pre-op checklist, IOL selection, OT booking, billing, discharge and follow-up.",
      },
      { property: "og:title", content: "Surgery Workspace — Vision Care HMS" },
      {
        property: "og:description",
        content: "Estimate, consent, pre-op, implant, theatre booking, billing and discharge for one surgery.",
      },
    ],
  }),
  component: SurgeryWorkspace,
  errorComponent: () => <EmptyState title="Could not load this surgery" description="Please refresh and try again." />,
  notFoundComponent: () => <EmptyState title="Surgery not found" description="This record no longer exists." />,
});

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {description ? <p className="mb-3 text-sm text-muted-foreground">{description}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

function SurgeryWorkspace() {
  const { surgeryId } = useParams({ from: "/_authenticated/surgery/$surgeryId" });
  const query = useSurgery(surgeryId);
  const s = query.data;

  if (query.isLoading) return <Skeleton className="h-72 w-full" />;
  if (!s) return <EmptyState title="Surgery not found" description="This record no longer exists." />;

  const status = String(s["status"]);
  const done = status === "completed";
  const missing = preopMissing(s);
  const invoice = s["invoices"] as Row | null;

  return (
    <div>
      <PageHeader
        title={`${String(s["procedure"])} · ${String(s["eye"])}`}
        description={`${surgeryPatientName(s)} · ${(s["patients"] as Row | null)?.["mrn"] ?? ""} · ${
          s["scheduled_at"] ? fmtDateTime(String(s["scheduled_at"])) : "Not scheduled"
        } · ${(s["ot_rooms"] as Row | null)?.["name"] ?? "No theatre"}`}
        actions={
          <>
            <Badge variant={done ? "secondary" : "default"}>{titleize(status)}</Badge>
            {s["visit_id"] ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/visit/$visitId" params={{ visitId: String(s["visit_id"]) }}>
                  Open visit
                </Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline">
              <Link to="/patient/$patientId" params={{ patientId: String(s["patient_id"]) }}>
                Patient record
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/surgeries">All surgeries</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <EstimateCard surgery={s} />
          <ConsentCard surgery={s} />
          <PreopCard surgery={s} />
          <BiometryCard surgery={s} />
          <IolCard surgery={s} />
          <SchedulingCard surgery={s} />
          <CompletionCard surgery={s} missing={missing} />
          <DischargeCard surgery={s} />
        </div>
        <div className="space-y-4">
          <BillingCard surgery={s} invoice={invoice} />
          <StockCard surgery={s} />
          <FollowUpCard surgery={s} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- estimate ---------------- */

function EstimateCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const tests = useLookup("diagnostic_tests", "id, name, price", { filters: { is_active: true }, orderBy: "name" });
  const [amount, setAmount] = useState(String(surgery["estimate_amount"] ?? ""));
  const [notes, setNotes] = useState(String(surgery["estimate_notes"] ?? ""));

  const iol = surgery["iol_inventory"] as Row | null;
  const iolPrice = Number(((iol?.["iol_models"] as Row | null) ?? {})["price"] ?? 0);

  return (
    <Section title="Surgery estimate" description="Quote given to the patient before booking. Catalog prices can be added in.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="est-amount">Estimate (₹)</Label>
          <Input id="est-amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>Add a catalog service price</Label>
          <Select
            onValueChange={(v) => {
              const t = (tests.data ?? []).find((x: Row) => String(x["id"]) === v);
              if (t) setAmount(String(Number(amount || 0) + Number(t["price"] ?? 0)));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Add service / test price" />
            </SelectTrigger>
            <SelectContent>
              {(tests.data ?? []).map((t: Row) => (
                <SelectItem key={String(t["id"])} value={String(t["id"])}>
                  {String(t["name"])} · {fmtMoney(t["price"])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {iolPrice > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Selected implant price {fmtMoney(iolPrice)} —{" "}
          <button className="text-primary hover:underline" onClick={() => setAmount(String(Number(amount || 0) + iolPrice))}>
            add to estimate
          </button>
        </p>
      ) : null}
      <div className="mt-3 grid gap-1.5">
        <Label htmlFor="est-notes">Estimate notes</Label>
        <Textarea id="est-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button
        className="mt-3"
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            { estimate_amount: amount === "" ? null : Number(amount), estimate_notes: notes || null },
            { onSuccess: () => toast.success("Estimate saved") },
          )
        }
      >
        Save estimate
      </Button>
    </Section>
  );
}

/* ---------------- consent ---------------- */

function ConsentCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const qc = useQueryClient();
  const { profile } = useAuth();
  const status = String(surgery["consent_status"] ?? "pending");

  const addDoc = useMutation({
    mutationFn: async () => {
      const { data, error } = await db
        .from("patient_documents")
        .insert({
          patient_id: surgery["patient_id"],
          visit_id: surgery["visit_id"] ?? null,
          surgery_id: id,
          doc_type: "consent",
          title: `Surgical consent — ${String(surgery["procedure"])} (${String(surgery["eye"])})`,
          notes: `Recorded by ${profile?.full_name ?? "staff"}`,
          created_by: profile?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data as Row;
    },
    onSuccess: (doc) => {
      update.mutate(
        { consent_status: "signed", consent_signed_at: new Date().toISOString(), consent_document_id: doc["id"] },
        {
          onSuccess: () => {
            toast.success("Consent recorded");
            void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
          },
        },
      );
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Section title="Consent" description="Informed consent must be signed before the surgery can be completed.">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={status === "signed" ? "default" : "secondary"}>{titleize(status)}</Badge>
        {surgery["consent_signed_at"] ? (
          <span className="text-sm text-muted-foreground">Signed {fmtDateTime(String(surgery["consent_signed_at"]))}</span>
        ) : null}
        {status !== "signed" ? (
          <Button size="sm" disabled={addDoc.isPending || update.isPending} onClick={() => addDoc.mutate()}>
            Record signed consent
          </Button>
        ) : null}
        <Select
          value={status}
          onValueChange={(v) =>
            update.mutate(
              {
                consent_status: v,
                consent_signed_at: v === "signed" ? new Date().toISOString() : null,
              },
              { onSuccess: () => toast.success("Consent status updated") },
            )
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONSENT_STATUSES.map((c) => (
              <SelectItem key={c} value={c}>
                {titleize(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Section>
  );
}

/* ---------------- pre-op ---------------- */

function PreopCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const [list, setList] = useState<Record<string, boolean>>(
    (surgery["preop_checklist"] ?? {}) as Record<string, boolean>,
  );
  const [override, setOverride] = useState(Boolean(surgery["preop_override"]));
  const [reason, setReason] = useState(String(surgery["preop_override_reason"] ?? ""));

  useEffect(() => {
    setList((surgery["preop_checklist"] ?? {}) as Record<string, boolean>);
  }, [surgery]);

  return (
    <Section title="Pre-op checklist" description="Every item must be ticked, or an authorised override reason recorded.">
      <div className="grid gap-2 sm:grid-cols-2">
        {PREOP_ITEMS.map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={list[item.key] === true}
              onCheckedChange={(v) => setList((p) => ({ ...p, [item.key]: v === true }))}
            />
            {item.label}
          </label>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t pt-3">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={override} onCheckedChange={(v) => setOverride(v === true)} />
          Authorised override — complete without full pre-op data
        </label>
        {override ? (
          <Textarea rows={2} placeholder="Override reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        ) : null}
      </div>
      <Button
        className="mt-3"
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            { preop_checklist: list, preop_override: override, preop_override_reason: override ? reason || null : null },
            { onSuccess: () => toast.success("Pre-op checklist saved") },
          )
        }
      >
        Save checklist
      </Button>
    </Section>
  );
}

/* ---------------- biometry / diagnostics ---------------- */

function BiometryCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const orders = usePatientDiagnostics(String(surgery["patient_id"]));
  const [v, setV] = useState({
    biometry_axial_length: String(surgery["biometry_axial_length"] ?? ""),
    biometry_k1: String(surgery["biometry_k1"] ?? ""),
    biometry_k2: String(surgery["biometry_k2"] ?? ""),
    iol_power: String(surgery["iol_power"] ?? ""),
  });

  const num = (x: string) => (x === "" ? null : Number(x));

  return (
    <Section title="Biometry & required diagnostics" description="Link the biometry order performed for this patient and record the readings.">
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["biometry_axial_length", "Axial length"],
            ["biometry_k1", "K1"],
            ["biometry_k2", "K2"],
            ["iol_power", "IOL power"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={`bio-${key}`}>{label}</Label>
            <Input
              id={`bio-${key}`}
              type="number"
              step="0.01"
              value={v[key]}
              onChange={(e) => setV((p) => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-1.5">
        <Label>Linked diagnostic order</Label>
        <Select
          value={surgery["biometry_order_id"] ? String(surgery["biometry_order_id"]) : ""}
          onValueChange={(val) => update.mutate({ biometry_order_id: val }, { onSuccess: () => toast.success("Diagnostic linked") })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a completed diagnostic order" />
          </SelectTrigger>
          <SelectContent>
            {(orders.data ?? []).map((o: Row) => {
              const t = o["diagnostic_tests"] as Row | null;
              return (
                <SelectItem key={String(o["id"])} value={String(o["id"])}>
                  {String(t?.["name"] ?? "Test")} · {titleize(String(o["status"]))} · {fmtDate(String(o["created_at"]))}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
      <Button
        className="mt-3"
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            {
              biometry_axial_length: num(v.biometry_axial_length),
              biometry_k1: num(v.biometry_k1),
              biometry_k2: num(v.biometry_k2),
              iol_power: num(v.iol_power),
            },
            { onSuccess: () => toast.success("Biometry saved") },
          )
        }
      >
        Save biometry
      </Button>
    </Section>
  );
}

/* ---------------- IOL ---------------- */

function IolCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const done = String(surgery["status"]) === "completed";
  const iols = useAvailableIols(
    (surgery["branch_id"] as string | null) ?? null,
    (surgery["iol_inventory_id"] as string | null) ?? null,
  );
  const current = surgery["iol_inventory"] as Row | null;

  return (
    <Section
      title="IOL / implant"
      description="Only unused, unexpired implants in stock can be selected. The database blocks anything else."
    >
      {current ? (
        <p className="mb-3 text-sm">
          Selected: <span className="font-medium">{String(current["serial_no"])}</span> ·{" "}
          {String((current["iol_models"] as Row | null)?.["name"] ?? "")} · {String(current["power"] ?? "—")}D · expires{" "}
          {current["expiry_date"] ? fmtDate(String(current["expiry_date"])) : "—"}
        </p>
      ) : null}
      {done ? (
        <p className="text-sm text-muted-foreground">Implant is locked — the surgery is completed.</p>
      ) : (
        <Select
          value={surgery["iol_inventory_id"] ? String(surgery["iol_inventory_id"]) : ""}
          onValueChange={(val) => update.mutate({ iol_inventory_id: val }, { onSuccess: () => toast.success("Implant reserved") })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an available implant" />
          </SelectTrigger>
          <SelectContent>
            {(iols.data ?? []).map((i: Row) => (
              <SelectItem key={String(i["id"])} value={String(i["id"])}>
                {String(i["serial_no"])} · {String(i["model_name"] ?? "")} · {String(i["power"] ?? "—")}D ·{" "}
                {i["expiry_date"] ? `exp ${fmtDate(String(i["expiry_date"]))}` : "no expiry"}
              </SelectItem>
            ))}
            {(iols.data ?? []).length === 0 ? (
              <SelectItem value="none" disabled>
                No available implants in stock
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      )}
    </Section>
  );
}

/* ---------------- scheduling ---------------- */

function SchedulingCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const rooms = useLookup("ot_rooms", "id, name", { filters: { is_active: true }, orderBy: "name" });
  const staff = useLookup("profiles", "id, full_name", { filters: { is_active: true }, orderBy: "full_name" });
  const done = String(surgery["status"]) === "completed";

  const [v, setV] = useState({
    scheduled_at: surgery["scheduled_at"] ? String(surgery["scheduled_at"]).slice(0, 16) : "",
    duration_min: String(surgery["duration_min"] ?? 45),
    ot_room_id: surgery["ot_room_id"] ? String(surgery["ot_room_id"]) : "",
    surgeon_id: surgery["surgeon_id"] ? String(surgery["surgeon_id"]) : "",
    assistant_id: surgery["assistant_id"] ? String(surgery["assistant_id"]) : "",
    nurse_id: surgery["nurse_id"] ? String(surgery["nurse_id"]) : "",
    anesthesia: String(surgery["anesthesia"] ?? ""),
  });

  return (
    <Section title="OT scheduling" description="Theatre and surgeon double-booking is blocked by the system.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="sch-at">Date &amp; time</Label>
          <Input
            id="sch-at"
            type="datetime-local"
            disabled={done}
            value={v.scheduled_at}
            onChange={(e) => setV((p) => ({ ...p, scheduled_at: e.target.value }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sch-dur">Duration (min)</Label>
          <Input
            id="sch-dur"
            type="number"
            disabled={done}
            value={v.duration_min}
            onChange={(e) => setV((p) => ({ ...p, duration_min: e.target.value }))}
          />
        </div>
        <PickerField
          label="OT room"
          value={v.ot_room_id}
          disabled={done}
          options={(rooms.data ?? []).map((r: Row) => ({ value: String(r["id"]), label: String(r["name"]) }))}
          onChange={(val) => setV((p) => ({ ...p, ot_room_id: val }))}
        />
        <PickerField
          label="Surgeon"
          value={v.surgeon_id}
          disabled={done}
          options={(staff.data ?? []).map((r: Row) => ({ value: String(r["id"]), label: String(r["full_name"]) }))}
          onChange={(val) => setV((p) => ({ ...p, surgeon_id: val }))}
        />
        <PickerField
          label="Assistant"
          value={v.assistant_id}
          disabled={done}
          options={(staff.data ?? []).map((r: Row) => ({ value: String(r["id"]), label: String(r["full_name"]) }))}
          onChange={(val) => setV((p) => ({ ...p, assistant_id: val }))}
        />
        <PickerField
          label="Scrub nurse"
          value={v.nurse_id}
          disabled={done}
          options={(staff.data ?? []).map((r: Row) => ({ value: String(r["id"]), label: String(r["full_name"]) }))}
          onChange={(val) => setV((p) => ({ ...p, nurse_id: val }))}
        />
        <PickerField
          label="Anaesthesia"
          value={v.anesthesia}
          disabled={done}
          options={["topical", "peribulbar", "retrobulbar", "general"].map((a) => ({ value: a, label: titleize(a) }))}
          onChange={(val) => setV((p) => ({ ...p, anesthesia: val }))}
        />
      </div>
      {!done ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                {
                  scheduled_at: v.scheduled_at ? new Date(v.scheduled_at).toISOString() : null,
                  duration_min: Number(v.duration_min || 45),
                  ot_room_id: v.ot_room_id || null,
                  surgeon_id: v.surgeon_id || null,
                  assistant_id: v.assistant_id || null,
                  nurse_id: v.nurse_id || null,
                  anesthesia: v.anesthesia || null,
                  status: String(surgery["status"]) === "planned" && v.scheduled_at ? "scheduled" : surgery["status"],
                },
                { onSuccess: () => toast.success("Theatre booking saved") },
              )
            }
          >
            Save booking
          </Button>
        </div>
      ) : null}
    </Section>
  );
}

function PickerField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled === true}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ---------------- completion ---------------- */

function CompletionCard({ surgery, missing }: { surgery: Row; missing: string[] }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const status = String(surgery["status"]);
  const done = status === "completed";
  const override = Boolean(surgery["preop_override"]);
  const [notes, setNotes] = useState({
    pre_op_notes: String(surgery["pre_op_notes"] ?? ""),
    op_notes: String(surgery["op_notes"] ?? ""),
    complications: String(surgery["complications"] ?? ""),
    consumables: String(surgery["consumables"] ?? ""),
    post_op_notes: String(surgery["post_op_notes"] ?? ""),
  });

  return (
    <Section title="Surgery record" description="Completing the surgery consumes the implant and moves stock exactly once.">
      <div className="grid gap-3">
        {(
          [
            ["pre_op_notes", "Pre-op notes"],
            ["op_notes", "Operative notes"],
            ["complications", "Complications"],
            ["consumables", "Consumables used"],
            ["post_op_notes", "Post-op notes"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={`op-${key}`}>{label}</Label>
            <Textarea
              id={`op-${key}`}
              rows={2}
              value={notes[key]}
              onChange={(e) => setNotes((p) => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {!done && missing.length > 0 && !override ? (
        <p className="mt-3 text-sm text-destructive">Blocked until complete: {missing.join(", ")}.</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={update.isPending}
          onClick={() => update.mutate(notes, { onSuccess: () => toast.success("Notes saved") })}
        >
          Save notes
        </Button>
        {!done ? (
          <>
            {status !== "in_progress" ? (
              <Button
                variant="outline"
                disabled={update.isPending}
                onClick={() =>
                  update.mutate(
                    { status: "in_progress", started_at: new Date().toISOString() },
                    { onSuccess: () => toast.success("Surgery started") },
                  )
                }
              >
                Start surgery
              </Button>
            ) : null}
            <Button
              disabled={update.isPending || (missing.length > 0 && !override)}
              onClick={() =>
                update.mutate(
                  { ...notes, status: "completed" },
                  { onSuccess: () => toast.success("Surgery completed — implant consumed and stock updated") },
                )
              }
            >
              Complete surgery
            </Button>
          </>
        ) : (
          <span className="self-center text-sm text-muted-foreground">
            Completed {surgery["ended_at"] ? fmtDateTime(String(surgery["ended_at"])) : ""} — record is locked.
          </span>
        )}
      </div>
    </Section>
  );
}

/* ---------------- discharge ---------------- */

function DischargeCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const update = useUpdateSurgery(id);
  const [summary, setSummary] = useState(String(surgery["discharge_summary"] ?? ""));
  const [instructions, setInstructions] = useState(String(surgery["discharge_instructions"] ?? ""));
  const done = String(surgery["status"]) === "completed";

  return (
    <Section title="Discharge" description="Available once the surgery is completed.">
      {surgery["discharged_at"] ? (
        <p className="mb-2 text-sm text-muted-foreground">Discharged {fmtDateTime(String(surgery["discharged_at"]))}</p>
      ) : null}
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="dc-sum">Discharge summary</Label>
          <Textarea id="dc-sum" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dc-ins">Instructions &amp; medication advice</Label>
          <Textarea id="dc-ins" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={!done || update.isPending}
          onClick={() =>
            update.mutate(
              {
                discharge_summary: summary || null,
                discharge_instructions: instructions || null,
                discharged_at: surgery["discharged_at"] ?? new Date().toISOString(),
              },
              { onSuccess: () => toast.success("Discharge recorded") },
            )
          }
        >
          {surgery["discharged_at"] ? "Update discharge" : "Discharge patient"}
        </Button>
        {!done ? <span className="self-center text-sm text-muted-foreground">Complete the surgery first.</span> : null}
      </div>
    </Section>
  );
}

/* ---------------- billing ---------------- */

function BillingCard({ surgery, invoice }: { surgery: Row; invoice: Row | null }) {
  const id = String(surgery["id"]);
  const navigate = useNavigate();
  const createInvoice = useCreateInvoice();
  const update = useUpdateSurgery(id);
  const qc = useQueryClient();

  const iol = surgery["iol_inventory"] as Row | null;
  const iolModel = (iol?.["iol_models"] as Row | null) ?? null;
  const fee = Number(surgery["estimate_amount"] ?? 0);

  const raise = useMutation({
    mutationFn: async () => {
      const inv = await createInvoice.mutateAsync({
        patient_id: String(surgery["patient_id"]),
        visit_id: (surgery["visit_id"] as string | null) ?? null,
        branch_id: (surgery["branch_id"] as string | null) ?? null,
        invoice_type: "surgery",
        notes: `Surgery ${String(surgery["procedure"])} (${String(surgery["eye"])})`,
      });
      const invoiceId = String(inv["id"]);
      const items: Row[] = [
        {
          invoice_id: invoiceId,
          description: `${String(surgery["procedure"])} · ${String(surgery["eye"])}`,
          item_type: "procedure",
          quantity: 1,
          unit_price: fee,
          tax_percent: 0,
          source_type: "surgery",
          source_id: id,
          source_ref: String(surgery["procedure"]),
        },
      ];
      if (iolModel && Number(iolModel["price"] ?? 0) > 0) {
        items.push({
          invoice_id: invoiceId,
          description: `IOL ${String(iolModel["name"])} · ${String(iol?.["serial_no"] ?? "")}`,
          item_type: "implant",
          quantity: 1,
          unit_price: Number(iolModel["price"]),
          tax_percent: 0,
          source_type: "surgery",
          source_id: id,
          source_ref: String(iol?.["serial_no"] ?? ""),
        });
      }
      const { error } = await db.from("invoice_items").insert(items);
      if (error) throw error;
      await update.mutateAsync({ invoice_id: invoiceId });
      return invoiceId;
    },
    onSuccess: (invoiceId) => {
      void qc.invalidateQueries({ queryKey: ["surgery", id] });
      void navigate({ to: "/invoice/$invoiceId", params: { invoiceId } });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Section title="Billing & payment" description="Uses the standard invoice and payment engine.">
      {invoice ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{String(invoice["invoice_no"])}</p>
          <p className="text-muted-foreground">
            {fmtMoney(invoice["total"])} billed · {fmtMoney(invoice["paid_amount"])} paid ·{" "}
            {titleize(String(invoice["status"]))}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/invoice/$invoiceId" params={{ invoiceId: String(invoice["id"]) }}>
              Open invoice &amp; take payment
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Raises a surgery invoice for {fmtMoney(fee)}
            {iolModel && Number(iolModel["price"] ?? 0) > 0 ? ` plus the implant ${fmtMoney(iolModel["price"])}` : ""}.
          </p>
          <Button size="sm" disabled={raise.isPending} onClick={() => raise.mutate()}>
            Create surgery invoice
          </Button>
        </div>
      )}
    </Section>
  );
}

/* ---------------- stock ---------------- */

function StockCard({ surgery }: { surgery: Row }) {
  const movements = useSurgeryStockMovements(String(surgery["id"]));
  return (
    <Section title="Implant stock movement" description="Recorded once when the surgery is completed.">
      {movements.data?.length ? (
        <ul className="space-y-2 text-sm">
          {movements.data.map((m: Row) => {
            const p = m["products"] as Row | null;
            return (
              <li key={String(m["id"])} className="flex justify-between gap-2">
                <span>
                  {String(p?.["name"] ?? "Item")}
                  {m["batch_no"] ? ` · ${String(m["batch_no"])}` : ""}
                </span>
                <span className="font-medium">{String(m["change_qty"])}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No stock movement yet.</p>
      )}
    </Section>
  );
}

/* ---------------- follow-up ---------------- */

function FollowUpCard({ surgery }: { surgery: Row }) {
  const id = String(surgery["id"]);
  const list = useSurgeryFollowUps(id);
  const create = useCreateSurgeryFollowUp(id);
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("Day-1 post-operative review");

  return (
    <Section title="Post-op follow-up" description="Recall linked to this surgery and patient.">
      {list.data?.length ? (
        <ul className="mb-3 space-y-2 text-sm">
          {list.data.map((f: Row) => (
            <li key={String(f["id"])} className="flex justify-between gap-2">
              <span>
                {fmtDate(String(f["due_date"]))} · {titleize(String(f["type"] ?? "post_op"))}
              </span>
              <Badge variant={f["is_done"] ? "secondary" : "default"}>{f["is_done"] ? "Done" : "Pending"}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-2">
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
        <Button
          size="sm"
          disabled={!due || create.isPending}
          onClick={() =>
            create.mutate(
              {
                patient_id: String(surgery["patient_id"]),
                visit_id: (surgery["visit_id"] as string | null) ?? null,
                due_date: due,
                type: "post_op",
                notes: notes || null,
              },
              { onSuccess: () => setDue("") },
            )
          }
        >
          Schedule follow-up
        </Button>
      </div>
    </Section>
  );
}
