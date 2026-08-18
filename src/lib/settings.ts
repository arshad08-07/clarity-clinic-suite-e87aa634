import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";
import { setMoneyFormat } from "@/lib/format";

/* ------------------------------------------------------------------ types */

export interface ClinicIdentity {
  name: string;
  logo_url: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gst_no: string;
  registration_no: string;
}

export interface BillingSettings {
  invoice_prefix: string;
  receipt_prefix: string;
  number_padding: number;
  currency: string;
  locale: string;
  default_tax_percent: number;
  tax_label: string;
  tax_inclusive: boolean;
}

export interface DayHours {
  open: boolean;
  start: string;
  end: string;
  break_start: string;
  break_end: string;
}

export interface AppointmentSettings {
  enforce_rules: boolean;
  slot_minutes: number;
  min_lead_minutes: number;
  max_advance_days: number;
  holidays: string[];
  working_hours: Record<string, DayHours>;
}

export interface NotificationSettings {
  reminders_enabled: boolean;
  follow_up_reminders: boolean;
  internal_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  reminder_offset_days: number;
  send_hour: number;
}

export interface BrandingSettings {
  document_header: string;
  document_footer: string;
  show_logo: boolean;
  show_gst: boolean;
  accent: string;
}

export interface AppSettings {
  clinic_identity: ClinicIdentity;
  billing: BillingSettings;
  appointments: AppointmentSettings;
  notifications: NotificationSettings;
  branding: BrandingSettings;
}

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const day = (open: boolean, start: string, end: string, bs = "", be = ""): DayHours => ({
  open,
  start,
  end,
  break_start: bs,
  break_end: be,
});

export const DEFAULT_SETTINGS: AppSettings = {
  clinic_identity: {
    name: "Vision Care Eye Hospital",
    logo_url: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    website: "",
    gst_no: "",
    registration_no: "",
  },
  billing: {
    invoice_prefix: "INV-",
    receipt_prefix: "RCPT-",
    number_padding: 6,
    currency: "INR",
    locale: "en-IN",
    default_tax_percent: 0,
    tax_label: "GST",
    tax_inclusive: false,
  },
  appointments: {
    enforce_rules: true,
    slot_minutes: 15,
    min_lead_minutes: 0,
    max_advance_days: 90,
    holidays: [],
    working_hours: {
      mon: day(true, "09:00", "18:00", "13:00", "14:00"),
      tue: day(true, "09:00", "18:00", "13:00", "14:00"),
      wed: day(true, "09:00", "18:00", "13:00", "14:00"),
      thu: day(true, "09:00", "18:00", "13:00", "14:00"),
      fri: day(true, "09:00", "18:00", "13:00", "14:00"),
      sat: day(true, "09:00", "14:00"),
      sun: day(false, "09:00", "13:00"),
    },
  },
  notifications: {
    reminders_enabled: true,
    follow_up_reminders: true,
    internal_enabled: true,
    sms_enabled: true,
    whatsapp_enabled: true,
    email_enabled: true,
    reminder_offset_days: 1,
    send_hour: 9,
  },
  branding: {
    document_header: "",
    document_footer: "Computer generated document. No signature required.",
    show_logo: true,
    show_gst: true,
    accent: "#0f766e",
  },
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];

/* ------------------------------------------------- non-react snapshot ---- */

let snapshot: AppSettings = DEFAULT_SETTINGS;

/** Latest resolved settings for helpers that run outside React (printing). */
export function getSettings(): AppSettings {
  return snapshot;
}

export function setSettingsSnapshot(next: AppSettings) {
  snapshot = next;
  setMoneyFormat(next.billing.currency, next.billing.locale);
}

/* ------------------------------------------------------------- resolving */

function mergeSection<T>(base: T, value: unknown): T {
  if (!value || typeof value !== "object") return base;
  return { ...base, ...(value as Record<string, unknown>) } as T;
}

/** Global values, overridden by branch values key-by-key. */
export function resolveSettings(rows: Row[], branchId: string | null | undefined): AppSettings {
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  const pick = (branch: string | null) => rows.filter((r) => (r["branch_id"] ?? null) === branch);
  const scopes: (string | null)[] = branchId ? [null, branchId] : [null];

  for (const scope of scopes) {
    for (const row of pick(scope)) {
      const key = String(row["key"]);
      if (!SETTING_KEYS.includes(key as keyof AppSettings)) continue;
      out[key] = mergeSection(out[key], row["value"]);
    }
  }
  return out as unknown as AppSettings;
}


export function useSettingsRows() {
  return useQuery({
    queryKey: ["app-settings"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await db.from("settings").select("id, branch_id, key, value");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** Resolved settings for a branch (falls back to the clinic-wide values). */
export function useSettings(branchId?: string | null) {
  const rows = useSettingsRows();
  const resolved = resolveSettings(rows.data ?? [], branchId ?? null);
  return { ...rows, settings: resolved };
}

export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      key,
      value,
      branchId,
    }: {
      key: keyof AppSettings;
      value: unknown;
      branchId: string | null;
    }) => {
      const existing = await db
        .from("settings")
        .select("id")
        .eq("key", key)
        [branchId ? "eq" : "is"]("branch_id", branchId)
        .maybeSingle();
      if (existing.error) throw existing.error;

      if (existing.data?.id) {
        const { error } = await db
          .from("settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("id", existing.data.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("settings").insert({ key, value, branch_id: branchId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
}

export function useResetBranchSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, branchId }: { key: keyof AppSettings; branchId: string }) => {
      const { error } = await db.from("settings").delete().eq("key", key).eq("branch_id", branchId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branch override removed — clinic defaults apply");
      void qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
}

/* -------------------------------------------------------- slot generation */

const DOW: string[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isHoliday(cfg: AppointmentSettings, isoDate: string) {
  return (cfg.holidays ?? []).includes(isoDate);
}

export interface Slot {
  /** ISO date-time of the slot start. */
  value: string;
  label: string;
  taken: boolean;
}

/**
 * Builds the bookable slots for a day straight from the appointment settings,
 * so the picker and the database rules always agree.
 */
export function generateSlots(
  cfg: AppointmentSettings,
  isoDate: string,
  taken: string[] = [],
  now = new Date(),
): { slots: Slot[]; closedReason: string | null } {
  const base = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(base.getTime())) return { slots: [], closedReason: "Invalid date" };
  if (isHoliday(cfg, isoDate)) return { slots: [], closedReason: "Clinic holiday" };

  const dayKey = DOW[base.getDay()]!;
  const hours = cfg.working_hours?.[dayKey];
  if (!hours || !hours.open) return { slots: [], closedReason: "Clinic closed on this day" };

  if (cfg.max_advance_days > 0) {
    const limit = new Date(now);
    limit.setHours(0, 0, 0, 0);
    limit.setDate(limit.getDate() + cfg.max_advance_days);
    if (base > limit) return { slots: [], closedReason: `Bookings open only ${cfg.max_advance_days} days ahead` };
  }

  const start = toMinutes(hours.start) ?? 540;
  const end = toMinutes(hours.end) ?? 1080;
  const bs = toMinutes(hours.break_start);
  const be = toMinutes(hours.break_end);
  const step = Math.max(cfg.slot_minutes || 15, 5);
  const earliest = new Date(now.getTime() + Math.max(cfg.min_lead_minutes || 0, 0) * 60000);
  const takenSet = new Set(taken.map((t) => new Date(t).getTime()));

  const slots: Slot[] = [];
  for (let m = start; m + step <= end; m += step) {
    if (bs !== null && be !== null && be > bs && m < be && m + step > bs) continue;
    const at = new Date(base);
    at.setMinutes(m);
    if (at < earliest) continue;
    slots.push({
      value: at.toISOString(),
      label: at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      taken: takenSet.has(at.getTime()),
    });
  }
  return { slots, closedReason: slots.length ? null : "No slots left for this day" };
}
