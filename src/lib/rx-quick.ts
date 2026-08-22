import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { db, errorMessage, type Row } from "@/lib/api";
import type { NewRxItem } from "@/lib/prescriptions";

/** Frequency shorthand a doctor would scribble on paper, mapped to plain words. */
export const FREQUENCY_SHORTHAND: Record<string, string> = {
  qd: "Once daily",
  om: "Once daily (morning)",
  on: "Once daily (night)",
  hs: "At bedtime",
  bd: "Twice daily",
  bid: "Twice daily",
  tds: "Three times daily",
  tid: "Three times daily",
  qid: "Four times daily",
  qds: "Four times daily",
  "5t": "5 times daily",
  "6t": "6 times daily",
  q1h: "Hourly",
  q2h: "Every 2 hours",
  q3h: "Every 3 hours",
  q4h: "Every 4 hours",
  q6h: "Every 6 hours",
  q8h: "Every 8 hours",
  sos: "When required",
  stat: "Immediately (single dose)",
  ac: "Before food",
  pc: "After food",
};

const EYE_TOKENS: Record<string, string> = {
  od: "OD",
  os: "OS",
  ou: "OU",
  re: "OD",
  le: "OS",
  be: "OU",
  "r/e": "OD",
  "l/e": "OS",
  "b/e": "OU",
};

const ROUTE_TOKENS: Record<string, string> = {
  top: "Topical",
  topical: "Topical",
  po: "Oral",
  oral: "Oral",
  iv: "IV",
  im: "IM",
  sc: "Subcutaneous",
  oint: "Ointment",
  gel: "Gel",
};

/** e.g. 7d, 2w, 1m, x10d */
const DURATION_RE = /^x?(\d+)\s*(d|day|days|w|wk|week|weeks|m|mo|month|months)$/i;
/** e.g. 0.5%, 5mg, 250mg, 10ml */
const STRENGTH_RE = /^\d+(\.\d+)?\s*(%|mg|mcg|g|ml|iu)$/i;
/** e.g. 1drop, 2drops, 1tab, 1cap */
const DOSE_RE = /^(\d+(\.\d+)?)\s*(drop|drops|gtt|tab|tabs|cap|caps|ml|puff|puffs|unit|units)$/i;

function expandDuration(n: string, unit: string): string {
  const u = unit.toLowerCase();
  if (u.startsWith("w")) return `${n} week${Number(n) > 1 ? "s" : ""}`;
  if (u.startsWith("m")) return `${n} month${Number(n) > 1 ? "s" : ""}`;
  return `${n} day${Number(n) > 1 ? "s" : ""}`;
}

export interface ParsedRx extends NewRxItem {
  unparsed: string[];
}

/**
 * Parses one shorthand line the way a doctor writes it on paper:
 * `Moxifloxacin 0.5% 1drop qid 7d OD taper slowly`
 * Everything after the recognised tokens becomes instructions.
 */
export function parseRxLine(line: string): ParsedRx | null {
  const raw = line.trim().replace(/\s+/g, " ");
  if (!raw) return null;

  const tokens = raw.split(" ");
  const drugParts: string[] = [];
  const rest: string[] = [];
  let strength: string | null = null;
  let dosage: string | null = null;
  let frequency: string | null = null;
  let duration: string | null = null;
  let route: string | null = null;
  let eye: string | null = null;
  let drugDone = false;

  for (const tok of tokens) {
    const t = tok.replace(/[,;]+$/, "");
    const lower = t.toLowerCase();

    if (!strength && STRENGTH_RE.test(t)) {
      strength = t;
      drugDone = true;
      continue;
    }
    const dose = DOSE_RE.exec(t);
    if (!dosage && dose) {
      const unit = dose[3]!.toLowerCase();
      const word = unit === "gtt" ? "drop" : unit.replace(/s$/, "");
      dosage = `${dose[1]} ${word}${Number(dose[1]) > 1 ? "s" : ""}`;
      drugDone = true;
      continue;
    }
    if (!frequency && FREQUENCY_SHORTHAND[lower]) {
      frequency = FREQUENCY_SHORTHAND[lower]!;
      drugDone = true;
      continue;
    }
    if (!frequency && /^\d+(-\d+)+$/.test(lower)) {
      frequency = lower;
      drugDone = true;
      continue;
    }
    const dur = DURATION_RE.exec(lower);
    if (!duration && dur) {
      duration = expandDuration(dur[1]!, dur[2]!);
      drugDone = true;
      continue;
    }
    if (!eye && EYE_TOKENS[lower]) {
      eye = EYE_TOKENS[lower]!;
      drugDone = true;
      continue;
    }
    if (!route && ROUTE_TOKENS[lower]) {
      route = ROUTE_TOKENS[lower]!;
      drugDone = true;
      continue;
    }
    if (!drugDone) drugParts.push(t);
    else rest.push(t);
  }

  const drugName = drugParts.join(" ").trim();
  if (!drugName) return null;

  return {
    drug_name: drugName,
    strength,
    dosage,
    frequency,
    duration,
    route,
    eye: eye ?? "OU",
    instructions: rest.join(" ") || null,
    unparsed: rest,
  };
}

/** Human summary of a parsed/stored item, for chips and preview rows. */
export function rxSummary(item: NewRxItem): string {
  return [item.strength, item.dosage, item.frequency, item.duration, item.route, item.eye]
    .filter(Boolean)
    .join(" · ");
}

export interface RxTemplate {
  label: string;
  line: string;
}

/** Everyday eye-clinic starters — one tap instead of six fields. */
export const RX_QUICK_PICKS: RxTemplate[] = [
  { label: "Moxifloxacin 0.5%", line: "Moxifloxacin 0.5% 1drop qid 7d OU top" },
  { label: "Prednisolone 1%", line: "Prednisolone acetate 1% 1drop qid 14d OU top" },
  { label: "Carboxymethylcellulose 0.5%", line: "Carboxymethylcellulose 0.5% 1drop qid 30d OU top" },
  { label: "Timolol 0.5%", line: "Timolol maleate 0.5% 1drop bd 30d OU top" },
  { label: "Latanoprost 0.005%", line: "Latanoprost 0.005% 1drop hs 30d OU top" },
  { label: "Olopatadine 0.1%", line: "Olopatadine 0.1% 1drop bd 14d OU top" },
  { label: "Homatropine 2%", line: "Homatropine 2% 1drop tds 5d OU top" },
  { label: "Nepafenac 0.1%", line: "Nepafenac 0.1% 1drop tds 14d OU top" },
  { label: "Tab Aceclofenac 100mg", line: "Aceclofenac 100mg 1tab bd 3d po" },
  { label: "Tab Acetazolamide 250mg", line: "Acetazolamide 250mg 1tab tds 3d po" },
];

/** Adds many medicines in one write so a full prescription is a single click. */
export function useAddPrescriptionItems(visit: Row) {
  const qc = useQueryClient();
  const visitId = String(visit["id"]);
  return useMutation({
    mutationFn: async ({ items, doctorId }: { items: NewRxItem[]; doctorId: string | null }) => {
      if (items.length === 0) return;
      const { data: existing, error: readErr } = await db
        .from("prescriptions")
        .select("id")
        .eq("visit_id", visitId)
        .limit(1);
      if (readErr) throw readErr;
      let rxId = (existing ?? [])[0]?.id as string | undefined;
      if (!rxId) {
        const { data: created, error: createErr } = await db
          .from("prescriptions")
          .insert({
            patient_id: visit["patient_id"],
            visit_id: visitId,
            doctor_id: (visit["doctor_id"] as string | null) ?? doctorId ?? null,
          })
          .select("id")
          .single();
        if (createErr) throw createErr;
        rxId = String(created.id);
      }
      const payload = items.map((item) => ({
        prescription_id: rxId,
        drug_name: item.drug_name.trim(),
        strength: item.strength?.trim() || null,
        dosage: item.dosage?.trim() || null,
        frequency: item.frequency?.trim() || null,
        duration: item.duration?.trim() || null,
        route: item.route?.trim() || null,
        instructions: item.instructions?.trim() || null,
        eye: item.eye && item.eye !== "NA" ? item.eye : null,
        diagnosis_id: item.diagnosis_id || null,
      }));
      const { error } = await db.from("prescription_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.items.length} medicine${vars.items.length === 1 ? "" : "s"} added`);
      void qc.invalidateQueries({ queryKey: ["visit-prescription", visitId] });
      void qc.invalidateQueries({ queryKey: ["patient-timeline"] });
      void qc.invalidateQueries({ queryKey: ["pharmacy-queue"] });
      void qc.invalidateQueries({ queryKey: ["list"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** Deletes a single line from the working prescription. */
export function useRemovePrescriptionItem(visitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("prescription_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Medicine removed");
      void qc.invalidateQueries({ queryKey: ["visit-prescription", visitId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}

/** This patient's previous prescription, so "same as last time" is one click. */
export function usePreviousPrescription(patientId: string, visitId: string) {
  return useQuery({
    queryKey: ["previous-prescription", patientId, visitId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("prescriptions")
        .select(
          "id, created_at, visit_id, prescription_items(drug_name, strength, dosage, frequency, duration, route, instructions, eye)",
        )
        .eq("patient_id", patientId)
        .neq("visit_id", visitId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as Row | null;
    },
  });
}
