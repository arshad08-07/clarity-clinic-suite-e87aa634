import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { Printer } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { db, type Row } from "@/lib/api";
import { age, fmtDateTime, fmtMoney, titleize } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/patient/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient Record — Vision Care HMS" },
      {
        name: "description",
        content: "Complete chronological patient record: visits, clinical findings, orders, billing and follow-ups.",
      },
      { property: "og:title", content: "Patient Record — Vision Care HMS" },
      {
        property: "og:description",
        content: "Complete chronological patient record across every clinic module.",
      },
    ],
  }),
  component: PatientRecord,
  errorComponent: () => (
    <EmptyState title="Could not load this patient" description="Please refresh or go back to the patient list." />
  ),
  notFoundComponent: () => <EmptyState title="Patient not found" description="This record no longer exists." />,
});

interface Source {
  table: string;
  select: string;
  label: string;
  dateField: string;
  describe: (r: Row) => string;
}

const SOURCES: Source[] = [
  {
    table: "appointments",
    select: "id, scheduled_at, status, reason, appointment_type",
    label: "Appointment",
    dateField: "scheduled_at",
    describe: (r) => `${titleize(String(r["appointment_type"] ?? "consultation"))} · ${titleize(String(r["status"]))}${r["reason"] ? ` · ${String(r["reason"])}` : ""}`,
  },
  {
    table: "visits",
    select: "id, checked_in_at, status, token_no, chief_complaint",
    label: "Visit",
    dateField: "checked_in_at",
    describe: (r) => `Token ${String(r["token_no"] ?? "—")} · ${titleize(String(r["status"]))}${r["chief_complaint"] ? ` · ${String(r["chief_complaint"])}` : ""}`,
  },
  {
    table: "optometry_records",
    select: "id, created_at, ucva_od, ucva_os, bcva_od, bcva_os, iop_od, iop_os",
    label: "Optometry",
    dateField: "created_at",
    describe: (r) =>
      `UCVA ${String(r["ucva_od"] ?? "—")}/${String(r["ucva_os"] ?? "—")} · BCVA ${String(r["bcva_od"] ?? "—")}/${String(r["bcva_os"] ?? "—")} · IOP ${String(r["iop_od"] ?? "—")}/${String(r["iop_os"] ?? "—")}`,
  },
  {
    table: "examinations",
    select: "id, created_at, chief_complaint, plan",
    label: "Examination",
    dateField: "created_at",
    describe: (r) => String(r["chief_complaint"] ?? r["plan"] ?? "Slit-lamp / fundus examination"),
  },
  {
    table: "patient_diagnoses",
    select: "id, created_at, diagnosis_text, eye, severity, is_primary, diagnosis_catalog(name, code)",
    label: "Diagnosis",
    dateField: "created_at",
    describe: (r) => {
      const cat = r["diagnosis_catalog"] as { name?: string; code?: string } | null;
      const name = cat?.name ?? String(r["diagnosis_text"] ?? "Diagnosis");
      return `${r["is_primary"] === false ? "Secondary" : "Primary"} · ${name} · ${String(r["eye"] ?? "OU")}${r["severity"] ? ` · ${titleize(String(r["severity"]))}` : ""}`;
    },
  },
  {
    table: "prescriptions",
    select: "id, created_at, notes, follow_up_date",
    label: "Prescription",
    dateField: "created_at",
    describe: (r) => String(r["notes"] ?? "Medication prescribed"),
  },
  {
    table: "optical_prescriptions",
    select: "id, created_at, type, lens_type, coating",
    label: "Optical Rx",
    dateField: "created_at",
    describe: (r) => `${titleize(String(r["type"]))}${r["lens_type"] ? ` · ${String(r["lens_type"])}` : ""}`,
  },
  {
    table: "diagnostic_orders",
    select: "id, created_at, status, eye, impression, diagnostic_tests(name)",
    label: "Diagnostic",
    dateField: "created_at",
    describe: (r) => {
      const t = r["diagnostic_tests"] as { name?: string } | null;
      return `${t?.name ?? "Test"} · ${titleize(String(r["status"]))}${r["impression"] ? ` · ${String(r["impression"])}` : ""}`;
    },
  },
  {
    table: "surgeries",
    select: "id, created_at, scheduled_at, procedure, eye, status, iol_power, discharged_at",
    label: "Surgery",
    dateField: "created_at",
    describe: (r) =>
      `${String(r["procedure"])} · ${String(r["eye"])} · ${titleize(String(r["status"]))}${r["iol_power"] ? ` · IOL ${String(r["iol_power"])}D` : ""}${r["discharged_at"] ? " · discharged" : ""}`,
  },
  {
    table: "optical_orders",
    select: "id, created_at, status, brand, coating, selling_price, invoice_id, delivered_at",
    label: "Optical order",
    dateField: "created_at",
    describe: (r) => `${titleize(String(r["status"]))}${r["brand"] ? ` · ${String(r["brand"])}` : ""} · ${fmtMoney(r["selling_price"] as number)}`,
  },
  {
    table: "invoices",
    select: "id, created_at, invoice_no, invoice_type, total, paid_amount, status",
    label: "Invoice",
    dateField: "created_at",
    describe: (r) =>
      `${String(r["invoice_no"])} · ${titleize(String(r["invoice_type"]))} · ${fmtMoney(r["total"] as number)} · ${titleize(String(r["status"]))}`,
  },
  {
    table: "insurance_claims",
    select: "id, created_at, provider, claim_amount, status",
    label: "Insurance",
    dateField: "created_at",
    describe: (r) => `${String(r["provider"])} · ${fmtMoney(r["claim_amount"] as number)} · ${titleize(String(r["status"]))}`,
  },
  {
    table: "follow_ups",
    select: "id, created_at, due_date, type, status, is_done, reason, notes, outcome_notes, cancel_reason",
    label: "Follow-up",
    dateField: "due_date",
    describe: (r) => {
      const status = String(r["status"] ?? (r["is_done"] ? "completed" : "upcoming"));
      const tail = r["outcome_notes"] ?? r["cancel_reason"] ?? r["reason"] ?? r["notes"];
      return `${titleize(String(r["type"] ?? "review"))} · ${titleize(status)}${tail ? ` · ${String(tail)}` : ""}`;
    },
  },

  {
    table: "patient_documents",
    select: "id, created_at, doc_type, title, file_url",
    label: "Document",
    dateField: "created_at",
    describe: (r) => `${titleize(String(r["doc_type"]))} · ${String(r["title"])}`,
  },
  {
    table: "pharmacy_sales",
    select: "id, created_at, quantity, amount, status, returned_qty, products(name, sku), product_batches(batch_no)",
    label: "Pharmacy",
    dateField: "created_at",
    describe: (r) => {
      const prod = r["products"] as { name?: string } | null;
      const batch = r["product_batches"] as { batch_no?: string } | null;
      const returned = Number(r["returned_qty"] ?? 0);
      return `${prod?.name ?? "Medicine"} × ${String(r["quantity"])}${batch?.batch_no ? ` · batch ${batch.batch_no}` : ""} · ${fmtMoney(r["amount"])}${returned > 0 ? ` · returned ${returned}` : ""}`;
    },
  },
  {
    table: "communications",
    select: "id, created_at, channel, direction, subject, message, status, purpose, sent_at, failure_reason",
    label: "Communication",
    dateField: "created_at",
    describe: (r) => {
      const purpose = r["purpose"] === "follow_up_reminder" ? "Follow-up reminder" : titleize(String(r["direction"]));
      const status = titleize(String(r["status"] ?? ""));
      const fail = r["failure_reason"] ? ` · ${String(r["failure_reason"])}` : "";
      return `${titleize(String(r["channel"]))} · ${purpose} · ${status}${fail} · ${String(r["subject"] ?? r["message"] ?? "")}`;
    },
  },

];

const TONE: Record<string, string> = {
  Appointment: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  Visit: "bg-primary/10 text-primary",
  Optometry: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  Examination: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  Diagnosis: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  Prescription: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Pharmacy: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  Surgery: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  Invoice: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function PatientRecord() {
  const { patientId } = useParams({ from: "/_authenticated/patient/$patientId" });

  const patient = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const { data, error } = await db.from("patients").select("*").eq("id", patientId).maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });

  const timeline = useQuery({
    queryKey: ["patient-timeline", patientId],
    queryFn: async () => {
      const results = await Promise.all(
        SOURCES.map(async (s) => {
          const { data, error } = await db
            .from(s.table)
            .select(s.select)
            .eq("patient_id", patientId)
            .limit(50);
          if (error) return [];
          return ((data ?? []) as Row[]).map((r) => ({
            key: `${s.table}-${String(r["id"])}`,
            label: s.label,
            when: String(r[s.dateField] ?? r["created_at"] ?? ""),
            text: s.describe(r),
            surgeryId: s.table === "surgeries" ? String(r["id"]) : null,
            opticalOrderId: s.table === "optical_orders" ? String(r["id"]) : null,
          }));
        }),
      );
      return results
        .flat()
        .filter((e) => e.when)
        .sort((a, b) => (a.when < b.when ? 1 : -1));
    },
  });

  const payments = useQuery({
    queryKey: ["patient-payments", patientId],
    queryFn: async () => {
      const { data } = await db
        .from("invoices")
        .select("total, paid_amount")
        .eq("patient_id", patientId);
      const rows = (data ?? []) as Row[];
      return {
        billed: rows.reduce((s, r) => s + Number(r["total"] ?? 0), 0),
        paid: rows.reduce((s, r) => s + Number(r["paid_amount"] ?? 0), 0),
      };
    },
  });

  const p = patient.data;
  const leadId = p?.["lead_id"] ? String(p["lead_id"]) : null;

  const lead = useQuery({
    queryKey: ["patient-lead", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data } = await db
        .from("leads")
        .select("id, name, source, campaign, status, created_at")
        .eq("id", leadId)
        .maybeSingle();
      return (data ?? null) as Row | null;
    },
  });

  const leadActivities = useQuery({
    queryKey: ["patient-lead-activities", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data } = await db
        .from("lead_activities")
        .select("id, activity, outcome, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      return (data ?? []) as Row[];
    },
  });

  if (patient.isLoading) return <Skeleton className="h-64 w-full" />;
  if (!p) return <EmptyState title="Patient not found" description="This record no longer exists." />;

  return (
    <div>
      <PageHeader
        title={`${String(p["first_name"] ?? "")} ${String(p["last_name"] ?? "")}`.trim()}
        description={`${String(p["mrn"])} · ${titleize(String(p["gender"] ?? "—"))} · ${age(p["date_of_birth"] as string) || "—"} · ${String(p["phone"])}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" /> Print record
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/patients">Back to patients</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface-card space-y-3 p-5 text-sm">
          <h2 className="font-display text-base font-semibold">Clinical summary</h2>
          <Detail label="Allergies" value={p["allergies"]} highlight />
          <Detail label="Medical history" value={p["medical_history"]} />
          <Detail label="Blood group" value={p["blood_group"]} />
          <Detail label="Insurance" value={p["insurance_provider"]} />
          <Detail label="Policy no." value={p["insurance_policy_no"]} />
          <Detail label="Emergency" value={p["emergency_contact_phone"]} />
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground">Billed / Collected</p>
            <p className="font-medium">
              {fmtMoney(payments.data?.billed ?? 0)} / {fmtMoney(payments.data?.paid ?? 0)}
            </p>
          </div>
          {lead.data ? (
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground">Enquiry origin</p>
              <p className="font-medium">
                {titleize(String(lead.data["source"] ?? "lead"))}
                {lead.data["campaign"] ? ` · ${String(lead.data["campaign"])}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Converted from lead “{String(lead.data["name"])}”
                {p["converted_at"] ? ` on ${fmtDateTime(String(p["converted_at"]))}` : ""}
              </p>
              {leadActivities.data?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {leadActivities.data.slice(0, 5).map((a) => (
                    <li key={String(a["id"])}>
                      {fmtDateTime(String(a["created_at"]))} · {String(a["activity"])}
                      {a["outcome"] ? ` — ${String(a["outcome"])}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link to="/leads" className="text-xs text-primary hover:underline">
                Open CRM pipeline
              </Link>
            </div>
          ) : null}
        </section>

        <section className="surface-card p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-base font-semibold">Chronological record</h2>
          {timeline.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : timeline.data?.length ? (
            <ol className="space-y-3">
              {timeline.data.map((e) => (
                <li key={e.key} className="flex gap-3 border-b pb-3 last:border-0">
                  <Badge className={TONE[e.label] ?? "bg-muted text-muted-foreground"} variant="secondary">
                    {e.label}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{e.text}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(e.when)}</p>
                    {e.surgeryId ? (
                      <Link
                        to="/surgery/$surgeryId"
                        params={{ surgeryId: e.surgeryId }}
                        className="text-xs text-primary hover:underline"
                      >
                        Open surgery workspace
                      </Link>
                    ) : null}
                    {e.opticalOrderId ? (
                      <Link
                        to="/optical-order/$orderId"
                        params={{ orderId: e.opticalOrderId }}
                        className="text-xs text-primary hover:underline"
                      >
                        Open optical order
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="Nothing recorded yet"
              description="Appointments, clinical findings, orders and bills will appear here."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({ label, value, highlight }: { label: string; value: unknown; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={highlight && value ? "font-medium text-destructive" : "font-medium"}>
        {value ? String(value) : "—"}
      </p>
    </div>
  );
}
