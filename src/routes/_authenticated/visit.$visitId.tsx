import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DiagnosticOrderPanel, statusVariant } from "@/components/diagnostic-order-panel";
import { EmptyState } from "@/components/empty-state";
import { NewInvoiceDialog } from "@/components/new-invoice-dialog";
import { OrderDiagnosticsDialog } from "@/components/order-diagnostics-dialog";

import { PageHeader } from "@/components/page-header";
import { PharmacyDispense } from "@/components/pharmacy-dispense";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowUpSection } from "@/components/follow-up-section";
import { VisitDiagnosisSection } from "@/components/visit-diagnosis-section";
import { VisitOpticalSection } from "@/components/visit-optical-section";
import { VisitPrescriptionSection } from "@/components/visit-prescription-section";

import { VisitSurgerySection } from "@/components/visit-surgery-section";

import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { db, errorMessage, type Row } from "@/lib/api";
import { useVisitInvoices } from "@/lib/billing";
import { DIAG_STATUS_LABEL, useUpdateDiagnosticOrder, useVisitDiagnostics } from "@/lib/diagnostics";

import { age, fmtDateTime, fmtTime, titleize } from "@/lib/format";
import { ALLOWED, patientName, STAGE_LABEL, useVisit, useVisitUpdate, waitingMinutes } from "@/lib/queue";


export const Route = createFileRoute("/_authenticated/visit/$visitId")({
  head: () => ({
    meta: [
      { title: "Visit Workspace — Vision Care HMS" },
      {
        name: "description",
        content: "One encounter screen: optometry, doctor consultation and queue stage for the current visit.",
      },
      { property: "og:title", content: "Visit Workspace — Vision Care HMS" },
      {
        property: "og:description",
        content: "Optometry and consultation recorded against the same live visit.",
      },
    ],
  }),
  component: VisitWorkspace,
  errorComponent: () => <EmptyState title="Could not load this visit" description="Please refresh and try again." />,
  notFoundComponent: () => <EmptyState title="Visit not found" description="This encounter no longer exists." />,
});

/** Single record per visit, created on first save and updated afterwards. */
function useVisitRecord(table: string, visitId: string) {
  return useQuery({
    queryKey: [table, "by-visit", visitId],
    queryFn: async () => {
      const { data, error } = await db.from(table).select("*").eq("visit_id", visitId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Row | null;
    },
  });
}

function useSaveVisitRecord(table: string, visitId: string, label: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Row }) => {
      const payload = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]),
      );
      const q = id
        ? db.from(table).update(payload).eq("id", id).select().single()
        : db.from(table).insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success(`${label} saved`);
      void qc.invalidateQueries({ queryKey: [table, "by-visit", visitId] });
      void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

function VisitWorkspace() {
  const { visitId } = useParams({ from: "/_authenticated/visit/$visitId" });
  const visit = useVisit(visitId);
  const update = useVisitUpdate();
  const v = visit.data;

  const patientId = v ? String(v["patient_id"]) : "";
  const patient = useQuery({
    queryKey: ["patient", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await db.from("patients").select("*").eq("id", patientId).maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });

  const history = useQuery({
    queryKey: ["visit-history", patientId, visitId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data } = await db
        .from("visits")
        .select("id, checked_in_at, status, chief_complaint, token_no")
        .eq("patient_id", patientId)
        .neq("id", visitId)
        .order("checked_in_at", { ascending: false })
        .limit(8);
      return (data ?? []) as Row[];
    },
  });

  if (visit.isLoading) return <Skeleton className="h-72 w-full" />;
  if (!v) return <EmptyState title="Visit not found" description="This encounter no longer exists." />;

  const status = String(v["status"]);
  const appt = v["appointments"] as { scheduled_at?: string; appointment_type?: string } | null;
  const doctor = v["profiles"] as { full_name?: string } | null;
  const p = patient.data;
  const move = (next: string) => update.mutate({ id: visitId, patch: { status: next } });

  return (
    <div>
      <PageHeader
        title={`#${String(v["token_no"] ?? "—")} · ${patientName(v)}`}
        description={`Visit ${visitId.slice(0, 8)} · ${appt?.scheduled_at ? `Appointment ${fmtTime(appt.scheduled_at)}` : "Walk-in"} · ${doctor?.full_name ?? "No doctor assigned"} · checked in ${fmtTime(String(v["checked_in_at"]))} (${waitingMinutes(v)}m in ${STAGE_LABEL[status]})`}
        actions={
          <>
            <Badge variant={status === "completed" ? "secondary" : "default"}>{STAGE_LABEL[status] ?? status}</Badge>
            <VisitBillingActions visit={v} />
            {p ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/patient/$patientId" params={{ patientId: String(p["id"]) }}>
                  Patient record
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link to="/queue">Back to queue</Link>
            </Button>
          </>
        }

      />

      <div className="surface-card mb-4 flex flex-wrap items-center gap-2 p-4">
        <span className="mr-2 text-sm text-muted-foreground">Move this visit to:</span>
        {(ALLOWED[status] ?? []).map((next) => (
          <Button
            key={next}
            size="sm"
            variant={next === "cancelled" ? "ghost" : "outline"}
            disabled={update.isPending}
            onClick={() => move(next)}
          >
            {STAGE_LABEL[next] ?? next}
          </Button>
        ))}
        {(ALLOWED[status] ?? []).length === 0 && (
          <span className="text-sm text-muted-foreground">
            This visit is {STAGE_LABEL[status]?.toLowerCase()} — no further stage changes.
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <section className="surface-card space-y-3 p-5 text-sm">
          <h2 className="font-display text-base font-semibold">Patient</h2>
          <Detail label="MRN" value={p?.["mrn"]} />
          <Detail label="Age / gender" value={p ? `${age(p["date_of_birth"] as string) || "—"} · ${titleize(String(p["gender"] ?? "—"))}` : "—"} />
          <Detail label="Phone" value={p?.["phone"]} />
          <Detail label="Allergies" value={p?.["allergies"]} />
          <Detail label="Chief complaint" value={v["chief_complaint"]} />
          <Detail label="Priority" value={v["priority"]} />
          <div className="border-t pt-3">
            <p className="mb-1 text-xs text-muted-foreground">Previous visits</p>
            {history.data?.length ? (
              <ul className="space-y-1">
                {history.data.map((h) => (
                  <li key={String(h["id"])}>
                    <Link
                      to="/visit/$visitId"
                      params={{ visitId: String(h["id"]) }}
                      className="text-xs text-primary hover:underline"
                    >
                      {fmtDateTime(String(h["checked_in_at"]))} · {STAGE_LABEL[String(h["status"])]}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">First visit</p>
            )}
          </div>
        </section>

        <div className="lg:col-span-3">
          <Tabs defaultValue={status === "diagnostics" ? "diagnostics" : status === "with_doctor" || status === "completed" ? "consultation" : "optometry"}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="optometry">Optometry</TabsTrigger>
              <TabsTrigger value="consultation">Consultation</TabsTrigger>
              <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
              <TabsTrigger value="prescription">Prescription</TabsTrigger>
              <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
              <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
              <TabsTrigger value="surgery">Surgery</TabsTrigger>
              <TabsTrigger value="optical">Optical</TabsTrigger>
              <TabsTrigger value="follow-up">Follow-up</TabsTrigger>
            </TabsList>
            <TabsContent value="optometry" className="mt-4">
              <OptometryForm visit={v} onCompleted={() => move("with_doctor")} />
            </TabsContent>
            <TabsContent value="consultation" className="mt-4">
              <ConsultationForm visit={v} onSend={move} />
            </TabsContent>
            <TabsContent value="diagnosis" className="mt-4">
              <VisitDiagnosisSection visit={v} />
            </TabsContent>
            <TabsContent value="prescription" className="mt-4">
              <VisitPrescriptionSection visit={v} />
            </TabsContent>
            <TabsContent value="diagnostics" className="mt-4">
              <DiagnosticsSection visit={v} onSend={move} />
            </TabsContent>
            <TabsContent value="pharmacy" className="mt-4">
              <PharmacyDispense visitId={visitId} />
            </TabsContent>
            <TabsContent value="surgery" className="mt-4">
              <VisitSurgerySection visit={v} />
            </TabsContent>
            <TabsContent value="optical" className="mt-4">
              <VisitOpticalSection visit={v} />
            </TabsContent>
            <TabsContent value="follow-up" className="mt-4">
              <FollowUpSection
                patientId={String(v["patient_id"])}
                visitId={visitId}
                doctorId={(v["doctor_id"] as string | null) ?? null}
                branchId={(v["branch_id"] as string | null) ?? null}
              />
            </TabsContent>



          </Tabs>

        </div>
      </div>
    </div>
  );
}

/** Billing entry point for the current encounter: open or raise its invoice. */
function VisitBillingActions({ visit }: { visit: Row }) {
  const visitId = String(visit["id"]);
  const invoices = useVisitInvoices(visitId);
  const existing = invoices.data?.[0];
  if (existing) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to="/invoice/$invoiceId" params={{ invoiceId: String(existing["id"]) }}>
          Invoice {String(existing["invoice_no"])}
        </Link>
      </Button>
    );
  }
  return (
    <NewInvoiceDialog
      trigger={
        <Button variant="outline" size="sm">
          Create invoice
        </Button>
      }
      patientId={String(visit["patient_id"])}
      visitId={visitId}
      {...(visit["branch_id"] ? { branchId: String(visit["branch_id"]) } : {})}
      defaultType="consultation"
    />
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value ? String(value) : "—"}</p>
    </div>
  );
}

const OPTOM_FIELDS: { name: string; label: string; number?: boolean }[] = [
  { name: "ucva_od", label: "UCVA OD" },
  { name: "ucva_os", label: "UCVA OS" },
  { name: "bcva_od", label: "BCVA OD" },
  { name: "bcva_os", label: "BCVA OS" },
  { name: "sph_od", label: "SPH OD", number: true },
  { name: "cyl_od", label: "CYL OD", number: true },
  { name: "axis_od", label: "Axis OD", number: true },
  { name: "add_od", label: "ADD OD", number: true },
  { name: "sph_os", label: "SPH OS", number: true },
  { name: "cyl_os", label: "CYL OS", number: true },
  { name: "axis_os", label: "Axis OS", number: true },
  { name: "add_os", label: "ADD OS", number: true },
  { name: "pd", label: "PD", number: true },
  { name: "iop_od", label: "IOP OD", number: true },
  { name: "iop_os", label: "IOP OS", number: true },
  { name: "keratometry", label: "Keratometry" },
];

function OptometryForm({ visit, onCompleted }: { visit: Row; onCompleted: () => void }) {
  const visitId = String(visit["id"]);
  const { profile } = useAuth();
  const record = useVisitRecord("optometry_records", visitId);
  const save = useSaveVisitRecord("optometry_records", visitId, "Optometry");
  const [values, setValues] = useState<Row>({});

  useEffect(() => {
    if (record.data) setValues(record.data);
  }, [record.data]);

  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const submit = (thenSend: boolean) => {
    const payload: Row = {
      patient_id: visit["patient_id"],
      visit_id: visitId,
      optometrist_id: values["optometrist_id"] ?? profile?.id ?? null,
    };
    for (const f of OPTOM_FIELDS) {
      const raw = values[f.name];
      payload[f.name] = raw === "" || raw === undefined || raw === null ? null : f.number ? Number(raw) : raw;
    }
    payload["notes"] = values["notes"] ?? null;
    save.mutate(
      { ...(record.data ? { id: String(record.data["id"]) } : {}), values: payload },
      { onSuccess: () => thenSend && onCompleted() },
    );
  };

  if (record.isLoading) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="surface-card p-5">
      <h2 className="mb-1 font-display text-base font-semibold">Optometry for this visit</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Saved against visit {visitId.slice(0, 8)} — no new patient or visit is created.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OPTOM_FIELDS.map((f) => (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={`optom-${f.name}`}>{f.label}</Label>
            <Input
              id={`optom-${f.name}`}
              type={f.number ? "number" : "text"}
              step="0.25"
              value={values[f.name] === null || values[f.name] === undefined ? "" : String(values[f.name])}
              onChange={(e) => set(f.name, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-1.5">
        <Label htmlFor="optom-notes">Notes</Label>
        <Textarea
          id="optom-notes"
          value={values["notes"] ? String(values["notes"]) : ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => submit(false)} disabled={save.isPending}>
          Save optometry
        </Button>
        <Button variant="outline" onClick={() => submit(true)} disabled={save.isPending}>
          Complete &amp; send to doctor
        </Button>
      </div>
    </div>
  );
}

const EXAM_FIELDS: { name: string; label: string }[] = [
  { name: "cornea_od", label: "Cornea OD" },
  { name: "cornea_os", label: "Cornea OS" },
  { name: "anterior_chamber_od", label: "AC OD" },
  { name: "anterior_chamber_os", label: "AC OS" },
  { name: "lens_od", label: "Lens OD" },
  { name: "lens_os", label: "Lens OS" },
  { name: "fundus_od", label: "Fundus OD" },
  { name: "fundus_os", label: "Fundus OS" },
];

function ConsultationForm({ visit, onSend }: { visit: Row; onSend: (next: string) => void }) {
  const visitId = String(visit["id"]);
  const { profile } = useAuth();
  const exam = useVisitRecord("examinations", visitId);
  const optometry = useVisitRecord("optometry_records", visitId);
  const save = useSaveVisitRecord("examinations", visitId, "Consultation");
  const [values, setValues] = useState<Row>({});

  useEffect(() => {
    if (exam.data) setValues(exam.data);
  }, [exam.data]);

  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));
  const o = optometry.data;

  const submit = (next?: string) => {
    const payload: Row = {
      patient_id: visit["patient_id"],
      visit_id: visitId,
      doctor_id: values["doctor_id"] ?? visit["doctor_id"] ?? profile?.id ?? null,
      chief_complaint: values["chief_complaint"] ?? visit["chief_complaint"] ?? null,
      history: values["history"] ?? null,
      advice: values["advice"] ?? null,
      plan: values["plan"] ?? null,
    };
    for (const f of EXAM_FIELDS) payload[f.name] = values[f.name] ?? null;
    save.mutate(
      { ...(exam.data ? { id: String(exam.data["id"]) } : {}), values: payload },
      { onSuccess: () => next && onSend(next) },
    );
  };

  if (exam.isLoading) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="space-y-4">
      <div className="surface-card p-5">
        <h2 className="mb-3 font-display text-base font-semibold">Optometry findings from this visit</h2>
        {o ? (
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <Detail label="UCVA OD/OS" value={`${o["ucva_od"] ?? "—"} / ${o["ucva_os"] ?? "—"}`} />
            <Detail label="BCVA OD/OS" value={`${o["bcva_od"] ?? "—"} / ${o["bcva_os"] ?? "—"}`} />
            <Detail
              label="Refraction OD"
              value={`${o["sph_od"] ?? "—"} / ${o["cyl_od"] ?? "—"} × ${o["axis_od"] ?? "—"}`}
            />
            <Detail
              label="Refraction OS"
              value={`${o["sph_os"] ?? "—"} / ${o["cyl_os"] ?? "—"} × ${o["axis_os"] ?? "—"}`}
            />
            <Detail label="IOP OD/OS" value={`${o["iop_od"] ?? "—"} / ${o["iop_os"] ?? "—"}`} />
            <Detail label="PD" value={o["pd"]} />
            <Detail label="Keratometry" value={o["keratometry"]} />
            <Detail label="Optometry notes" value={o["notes"]} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No optometry recorded for this visit yet — the optometry tab writes into this same encounter.
          </p>
        )}
      </div>

      <div className="surface-card p-5">
        <h2 className="mb-4 font-display text-base font-semibold">Doctor consultation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Chief complaint</Label>
            <Input
              value={String(values["chief_complaint"] ?? visit["chief_complaint"] ?? "")}
              onChange={(e) => set("chief_complaint", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>History</Label>
            <Input value={String(values["history"] ?? "")} onChange={(e) => set("history", e.target.value)} />
          </div>
          {EXAM_FIELDS.map((f) => (
            <div key={f.name} className="grid gap-1.5">
              <Label htmlFor={`exam-${f.name}`}>{f.label}</Label>
              <Input id={`exam-${f.name}`} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Advice</Label>
            <Textarea value={String(values["advice"] ?? "")} onChange={(e) => set("advice", e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Plan</Label>
            <Textarea value={String(values["plan"] ?? "")} onChange={(e) => set("plan", e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => submit()} disabled={save.isPending}>
            Save consultation
          </Button>
          {(ALLOWED[String(visit["status"])] ?? []).includes("diagnostics") && (
            <Button variant="outline" onClick={() => submit("diagnostics")} disabled={save.isPending}>
              Send to diagnostics
            </Button>
          )}
          {(ALLOWED[String(visit["status"])] ?? []).includes("billing") && (
            <Button variant="outline" onClick={() => submit("billing")} disabled={save.isPending}>
              Send to billing
            </Button>
          )}
          {(ALLOWED[String(visit["status"])] ?? []).includes("completed") && (
            <Button variant="ghost" onClick={() => submit("completed")} disabled={save.isPending}>
              Complete visit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Diagnostics for THIS visit: doctor orders, live status, results and review. */
function DiagnosticsSection({ visit, onSend }: { visit: Row; onSend: (next: string) => void }) {
  const visitId = String(visit["id"]);
  const orders = useVisitDiagnostics(visitId);
  const update = useUpdateDiagnosticOrder();
  const { profile } = useAuth();
  const rows = orders.data ?? [];
  const allowed = ALLOWED[String(visit["status"])] ?? [];

  return (
    <div className="space-y-4">
      <div className="surface-card flex flex-wrap items-center justify-between gap-2 p-5">
        <div>
          <h2 className="font-display text-base font-semibold">Diagnostic orders for this visit</h2>
          <p className="text-sm text-muted-foreground">
            Orders stay attached to visit {visitId.slice(0, 8)} and appear instantly in the diagnostics workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderDiagnosticsDialog visit={visit} trigger={<Button size="sm">Order tests</Button>} />
          {allowed.includes("diagnostics") && (
            <Button size="sm" variant="outline" onClick={() => onSend("diagnostics")}>
              Send to diagnostics
            </Button>
          )}
          <Button asChild size="sm" variant="ghost">
            <Link to="/diagnostics">Diagnostics workspace</Link>
          </Button>
        </div>
      </div>

      {orders.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <EmptyState title="No tests ordered" description="Use “Order tests” to raise investigations for this visit." />
      ) : (
        <div className="space-y-3">
          {rows.map((o) => {
            const t = o["diagnostic_tests"] as Row | null;
            const st = String(o["status"]);
            return (
              <div key={String(o["id"])} className="surface-card p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t?.["name"] ? String(t["name"]) : "Test"}</span>
                  <Badge variant="outline">{String(o["eye"] ?? "OU")}</Badge>
                  <Badge variant={statusVariant(st)}>{DIAG_STATUS_LABEL[st] ?? st}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Ordered {fmtDateTime(String(o["created_at"]))}
                    {o["performed_at"] ? ` · performed ${fmtDateTime(String(o["performed_at"]))}` : ""}
                  </span>
                </div>
                {st === "completed" || st === "reviewed" ? (
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <Detail label="Findings" value={o["findings"]} />
                    <Detail label="Impression" value={o["impression"]} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Awaiting the diagnostic team.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {o["report_url"] ? (
                    <Button asChild size="sm" variant="outline">
                      <a href={String(o["report_url"])} target="_blank" rel="noreferrer">
                        View report
                      </a>
                    </Button>
                  ) : null}
                  <DiagnosticOrderPanel
                    order={o}
                    trigger={
                      <Button size="sm" variant="ghost">
                        Open order
                      </Button>
                    }
                  />
                  {st === "completed" ? (
                    <Button
                      size="sm"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate({
                          id: String(o["id"]),
                          patch: { status: "reviewed", reviewed_by: profile?.id ?? null },
                        })
                      }
                    >
                      Mark reviewed
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="surface-card flex flex-wrap gap-2 p-5">
        <span className="mr-2 self-center text-sm text-muted-foreground">Continue this visit:</span>
        {allowed
          .filter((s) => s === "with_doctor" || s === "billing" || s === "completed")
          .map((s) => (
            <Button key={s} size="sm" variant="outline" onClick={() => onSend(s)}>
              {STAGE_LABEL[s] ?? s}
            </Button>
          ))}
      </div>
    </div>
  );
}
