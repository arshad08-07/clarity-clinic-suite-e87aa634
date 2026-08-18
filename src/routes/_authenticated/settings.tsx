import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useLookup } from "@/lib/api";
import {
  DAY_KEYS,
  DAY_LABELS,
  type AppSettings,
  type DayHours,
  resolveSettings,
  useResetBranchSetting,
  useSaveSetting,
  useSettingsRows,
} from "@/lib/settings";

/* --------------------------------------------------------------- helpers */

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {help ? <p className="text-[11px] text-muted-foreground">{help}</p> : null}
    </div>
  );
}

function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SectionCard({
  title,
  description,
  onSave,
  saving,
  children,
}: {
  title: string;
  description: string;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card space-y-4 p-5">
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="size-4" /> Save
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the screen */

function SettingsWorkspace() {
  const { isAdmin, isSuperAdmin, primaryBranchId, branchIds } = useAuth();
  const rows = useSettingsRows();
  const branches = useLookup("branches", "id, name", { orderBy: "name" });
  const saveSetting = useSaveSetting();
  const resetSetting = useResetBranchSetting();

  const [scope, setScope] = useState<string>("global");
  const branchScope = scope === "global" ? null : scope;
  const [draft, setDraft] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (rows.data) setDraft(resolveSettings(rows.data, branchScope));
  }, [rows.data, branchScope]);

  if (!isAdmin) {
    return (
      <div className="surface-card p-8 text-center">
        <h1 className="font-display text-lg font-semibold">Administrators only</h1>
        <p className="text-sm text-muted-foreground">
          Clinic settings control invoicing, scheduling and reminders, so only administrators can
          change them.
        </p>
      </div>
    );
  }

  if (!draft) return <p className="p-6 text-sm text-muted-foreground">Loading settings…</p>;

  const set = <K extends keyof AppSettings>(key: K, patch: Partial<AppSettings[K]>) =>
    setDraft({ ...draft, [key]: { ...draft[key], ...patch } });

  const save = (key: keyof AppSettings) =>
    saveSetting.mutate({ key, value: draft[key], branchId: branchScope });

  const overridden = (key: string) =>
    (rows.data ?? []).some((r) => r["key"] === key && (r["branch_id"] ?? null) === branchScope);

  const scopeOptions = (branches.data ?? []).filter(
    (b) => isSuperAdmin || branchIds.includes(String(b["id"])) || String(b["id"]) === primaryBranchId,
  );

  const day = (k: string): DayHours =>
    draft.appointments.working_hours[k] ?? {
      open: false,
      start: "09:00",
      end: "18:00",
      break_start: "",
      break_end: "",
    };

  const setDay = (k: string, patch: Partial<DayHours>) =>
    set("appointments", {
      working_hours: { ...draft.appointments.working_hours, [k]: { ...day(k), ...patch } },
    });

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Clinic identity, billing, scheduling and reminder rules that drive the whole system."
        actions={
          <div className="flex items-center gap-2">
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Clinic-wide defaults</SelectItem>
                {scopeOptions.map((b) => (
                  <SelectItem key={String(b["id"])} value={String(b["id"])}>
                    {String(b["name"])} (branch override)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {branchScope ? (
        <p className="mb-4 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          Editing a branch override. Anything you save here beats the clinic-wide value for this
          branch only; sections without an override keep following the defaults.
        </p>
      ) : null}

      <Tabs defaultValue="clinic">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="clinic">Clinic identity</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------- identity */}
        <TabsContent value="clinic">
          <SectionCard
            title="Clinic identity"
            description="Shown in the sidebar, on invoices, receipts and every printed document."
            onSave={() => save("clinic_identity")}
            saving={saveSetting.isPending}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Clinic name">
                <Input
                  value={draft.clinic_identity.name}
                  onChange={(e) => set("clinic_identity", { name: e.target.value })}
                />
              </Field>
              <Field label="Logo URL" help="Used on printed documents when branding shows the logo.">
                <Input
                  value={draft.clinic_identity.logo_url}
                  onChange={(e) => set("clinic_identity", { logo_url: e.target.value })}
                />
              </Field>
              <Field label="Address">
                <Input
                  value={draft.clinic_identity.address}
                  onChange={(e) => set("clinic_identity", { address: e.target.value })}
                />
              </Field>
              <Field label="City">
                <Input
                  value={draft.clinic_identity.city}
                  onChange={(e) => set("clinic_identity", { city: e.target.value })}
                />
              </Field>
              <Field label="State">
                <Input
                  value={draft.clinic_identity.state}
                  onChange={(e) => set("clinic_identity", { state: e.target.value })}
                />
              </Field>
              <Field label="Pincode">
                <Input
                  value={draft.clinic_identity.pincode}
                  onChange={(e) => set("clinic_identity", { pincode: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={draft.clinic_identity.phone}
                  onChange={(e) => set("clinic_identity", { phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  value={draft.clinic_identity.email}
                  onChange={(e) => set("clinic_identity", { email: e.target.value })}
                />
              </Field>
              <Field label="Website">
                <Input
                  value={draft.clinic_identity.website}
                  onChange={(e) => set("clinic_identity", { website: e.target.value })}
                />
              </Field>
              <Field label="GST / Tax number">
                <Input
                  value={draft.clinic_identity.gst_no}
                  onChange={(e) => set("clinic_identity", { gst_no: e.target.value })}
                />
              </Field>
              <Field label="Registration number">
                <Input
                  value={draft.clinic_identity.registration_no}
                  onChange={(e) => set("clinic_identity", { registration_no: e.target.value })}
                />
              </Field>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ----------------------------------------------------- billing */}
        <TabsContent value="billing">
          <SectionCard
            title="Billing & numbering"
            description="Invoice numbers are generated on the server from these values; currency and tax labels apply across the app."
            onSave={() => save("billing")}
            saving={saveSetting.isPending}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Invoice prefix" help="e.g. INV- gives INV-000123">
                <Input
                  value={draft.billing.invoice_prefix}
                  onChange={(e) => set("billing", { invoice_prefix: e.target.value })}
                />
              </Field>
              <Field label="Receipt prefix">
                <Input
                  value={draft.billing.receipt_prefix}
                  onChange={(e) => set("billing", { receipt_prefix: e.target.value })}
                />
              </Field>
              <Field label="Number padding" help="Digits after the prefix (1–12).">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={draft.billing.number_padding}
                  onChange={(e) => set("billing", { number_padding: Number(e.target.value) })}
                />
              </Field>
              <Field label="Currency code">
                <Input
                  value={draft.billing.currency}
                  onChange={(e) => set("billing", { currency: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Number locale" help="Formats amounts, e.g. en-IN or en-US.">
                <Input
                  value={draft.billing.locale}
                  onChange={(e) => set("billing", { locale: e.target.value })}
                />
              </Field>
              <Field label="Tax label">
                <Input
                  value={draft.billing.tax_label}
                  onChange={(e) => set("billing", { tax_label: e.target.value })}
                />
              </Field>
              <Field label="Default tax %">
                <Input
                  type="number"
                  step="0.01"
                  value={draft.billing.default_tax_percent}
                  onChange={(e) => set("billing", { default_tax_percent: Number(e.target.value) })}
                />
              </Field>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ------------------------------------------------ appointments */}
        <TabsContent value="appointments">
          <SectionCard
            title="Appointment rules"
            description="These drive the slot picker and are enforced again in the database when an appointment is saved."
            onSave={() => save("appointments")}
            saving={saveSetting.isPending}
          >
            <Toggle
              label="Enforce scheduling rules"
              help="Blocks bookings outside working hours, in breaks and on holidays."
              checked={draft.appointments.enforce_rules}
              onChange={(v) => set("appointments", { enforce_rules: v })}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Slot duration (min)">
                <Input
                  type="number"
                  min={5}
                  value={draft.appointments.slot_minutes}
                  onChange={(e) => set("appointments", { slot_minutes: Number(e.target.value) })}
                />
              </Field>
              <Field label="Minimum notice (min)">
                <Input
                  type="number"
                  min={0}
                  value={draft.appointments.min_lead_minutes}
                  onChange={(e) => set("appointments", { min_lead_minutes: Number(e.target.value) })}
                />
              </Field>
              <Field label="Book up to (days ahead)" help="0 means no limit.">
                <Input
                  type="number"
                  min={0}
                  value={draft.appointments.max_advance_days}
                  onChange={(e) => set("appointments", { max_advance_days: Number(e.target.value) })}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Working hours & breaks
              </p>
              {DAY_KEYS.map((k) => {
                const d = day(k);
                return (
                  <div
                    key={k}
                    className="grid items-center gap-2 rounded-md border p-2 sm:grid-cols-[130px_repeat(4,1fr)]"
                  >
                    <div className="flex items-center gap-2">
                      <Switch checked={d.open} onCheckedChange={(v) => setDay(k, { open: v })} />
                      <span className="text-sm">{DAY_LABELS[k]}</span>
                    </div>
                    <Input
                      type="time"
                      value={d.start}
                      disabled={!d.open}
                      onChange={(e) => setDay(k, { start: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={d.end}
                      disabled={!d.open}
                      onChange={(e) => setDay(k, { end: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={d.break_start}
                      disabled={!d.open}
                      placeholder="Break from"
                      onChange={(e) => setDay(k, { break_start: e.target.value })}
                    />
                    <Input
                      type="time"
                      value={d.break_end}
                      disabled={!d.open}
                      placeholder="Break to"
                      onChange={(e) => setDay(k, { break_end: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>

            <Field label="Holidays" help="One date per line, format YYYY-MM-DD.">
              <Textarea
                rows={4}
                value={(draft.appointments.holidays ?? []).join("\n")}
                onChange={(e) =>
                  set("appointments", {
                    holidays: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </SectionCard>
        </TabsContent>

        {/* ----------------------------------------------- notifications */}
        <TabsContent value="notifications">
          <SectionCard
            title="Reminders & communication"
            description="Controls which follow-up reminders are queued and dispatched."
            onSave={() => save("notifications")}
            saving={saveSetting.isPending}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Reminders enabled"
                help="Master switch — off means nothing is queued or sent."
                checked={draft.notifications.reminders_enabled}
                onChange={(v) => set("notifications", { reminders_enabled: v })}
              />
              <Toggle
                label="Follow-up reminders"
                checked={draft.notifications.follow_up_reminders}
                onChange={(v) => set("notifications", { follow_up_reminders: v })}
              />
              <Toggle
                label="Internal staff notifications"
                checked={draft.notifications.internal_enabled}
                onChange={(v) => set("notifications", { internal_enabled: v })}
              />
              <Toggle
                label="SMS"
                checked={draft.notifications.sms_enabled}
                onChange={(v) => set("notifications", { sms_enabled: v })}
              />
              <Toggle
                label="WhatsApp"
                checked={draft.notifications.whatsapp_enabled}
                onChange={(v) => set("notifications", { whatsapp_enabled: v })}
              />
              <Toggle
                label="Email"
                checked={draft.notifications.email_enabled}
                onChange={(v) => set("notifications", { email_enabled: v })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default reminder lead (days before due)">
                <Input
                  type="number"
                  min={0}
                  value={draft.notifications.reminder_offset_days}
                  onChange={(e) =>
                    set("notifications", { reminder_offset_days: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Send hour (0–23)">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={draft.notifications.send_hour}
                  onChange={(e) => set("notifications", { send_hour: Number(e.target.value) })}
                />
              </Field>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ---------------------------------------------------- branding */}
        <TabsContent value="branding">
          <SectionCard
            title="Document branding"
            description="Applies to printed receipts, prescriptions and patient records."
            onSave={() => save("branding")}
            saving={saveSetting.isPending}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Show logo on documents"
                checked={draft.branding.show_logo}
                onChange={(v) => set("branding", { show_logo: v })}
              />
              <Toggle
                label="Show tax number on documents"
                checked={draft.branding.show_gst}
                onChange={(v) => set("branding", { show_gst: v })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Accent colour">
                <Input
                  value={draft.branding.accent}
                  onChange={(e) => set("branding", { accent: e.target.value })}
                />
              </Field>
              <Field label="Header note">
                <Input
                  value={draft.branding.document_header}
                  onChange={(e) => set("branding", { document_header: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Footer note">
              <Textarea
                rows={2}
                value={draft.branding.document_footer}
                onChange={(e) => set("branding", { document_footer: e.target.value })}
              />
            </Field>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {branchScope ? (
        <div className="surface-card mt-4 space-y-3 p-5">
          <h2 className="font-display text-base font-semibold">Branch overrides in place</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(["clinic_identity", "billing", "appointments", "notifications", "branding"] as const).map(
              (k) =>
                overridden(k) ? (
                  <Badge key={k} variant="secondary" className="gap-2">
                    {k.replace("_", " ")}
                    <button
                      className="underline"
                      onClick={() => resetSetting.mutate({ key: k, branchId: branchScope })}
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  </Badge>
                ) : null,
            )}
            {!["clinic_identity", "billing", "appointments", "notifications", "branding"].some(
              overridden,
            ) ? (
              <p className="text-sm text-muted-foreground">
                None yet — this branch follows the clinic-wide defaults.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Clinic Settings — Vision Care HMS" },
      {
        name: "description",
        content:
          "Control clinic identity, invoice numbering, appointment slot rules, reminders and document branding.",
      },
      { property: "og:title", content: "Clinic Settings — Vision Care HMS" },
      {
        property: "og:description",
        content: "Settings that actually drive invoicing, scheduling and reminders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsWorkspace,
});
