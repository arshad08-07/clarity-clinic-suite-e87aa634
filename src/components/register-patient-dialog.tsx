import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { differenceInYears, isAfter, isValid, parse } from "date-fns";
import { AlertTriangle, Check, Copy, Plus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DobInput } from "@/components/dob-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { db, errorMessage, useLookup, type Row } from "@/lib/api";
import { fmtDate } from "@/lib/format";

/** Indian mobile: 10 digits starting 6-9, optional +91 / 0 prefix. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

interface FormState {
  first_name: string;
  last_name: string;
  phone: string;
  gender: string;
  date_of_birth: string | null;
  city: string;
  address: string;
  branch_id: string;
}

const EMPTY: FormState = {
  first_name: "",
  last_name: "",
  phone: "",
  gender: "",
  date_of_birth: null,
  city: "",
  address: "",
  branch_id: "",
};

/**
 * Fast front-desk registration: only the fields needed to create a patient.
 * MRN, branch, and registration time are derived automatically; everything
 * else (medical history, insurance, emergency contacts) is filled later on the
 * patient record.
 */
export function RegisterPatientDialog() {
  const { branchIds, primaryBranchId, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Row | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);

  const allBranches = useLookup("branches", "id, name", { orderBy: "name", enabled: open });

  const branchOptions = useMemo(() => {
    const rows = (allBranches.data ?? []).map((b) => ({ id: String(b["id"]), name: String(b["name"]) }));
    return isSuperAdmin ? rows : rows.filter((b) => branchIds.includes(b.id));
  }, [isSuperAdmin, allBranches.data, branchIds]);

  /* Single allowed branch => auto-selected; picker only appears for multi-branch users. */
  const autoBranch =
    primaryBranchId ??
    (branchIds.length === 1 ? branchIds[0]! : null) ??
    (branchOptions.length === 1 ? branchOptions[0]!.id : null);
  const needsBranchPicker = !autoBranch && branchOptions.length > 1;
  const branchId = form.branch_id || autoBranch || "";

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const dirty = useMemo(
    () => JSON.stringify({ ...form, branch_id: "" }) !== JSON.stringify({ ...EMPTY, branch_id: "" }),
    [form],
  );

  const phoneDigits = normalisePhone(form.phone);

  /* Likely-duplicate lookup: same phone, or same name + same DOB. */
  const dupes = useQuery({
    queryKey: ["patient-dupes", phoneDigits, form.first_name.trim().toLowerCase(), form.date_of_birth],
    enabled: open && !created && (!!phoneDigits || (!!form.first_name.trim() && !!form.date_of_birth)),
    queryFn: async () => {
      const or: string[] = [];
      if (phoneDigits) or.push(`phone.ilike.%${phoneDigits}%`);
      let q = db
        .from("patients")
        .select("id, mrn, first_name, last_name, phone, date_of_birth, created_at")
        .limit(5);
      if (or.length) q = q.or(or.join(","));
      const byPhone = or.length ? await q : { data: [], error: null };
      if (byPhone.error) throw byPhone.error;

      let byName: { data: Row[] | null; error: unknown } = { data: [], error: null };
      if (form.first_name.trim() && form.date_of_birth) {
        byName = await db
          .from("patients")
          .select("id, mrn, first_name, last_name, phone, date_of_birth, created_at")
          .ilike("first_name", form.first_name.trim())
          .eq("date_of_birth", form.date_of_birth)
          .limit(5);
      }
      if (byName.error) throw byName.error;
      const merged = new Map<string, Row>();
      for (const r of [...((byPhone.data ?? []) as Row[]), ...((byName.data ?? []) as Row[])]) {
        merged.set(String(r["id"]), r);
      }
      return [...merged.values()];
    },
  });

  const duplicates = dupes.data ?? [];

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.first_name.trim()) next["first_name"] = "First name is required";
    if (!form.phone.trim()) next["phone"] = "Phone is required";
    else if (!phoneDigits) next["phone"] = "Enter a valid 10-digit Indian mobile number (starts with 6-9)";
    if (form.date_of_birth) {
      const d = parse(form.date_of_birth, "yyyy-MM-dd", new Date());
      if (!isValid(d)) next["date_of_birth"] = "Enter a valid date as DD/MM/YYYY";
      else if (isAfter(d, new Date())) next["date_of_birth"] = "Date of birth cannot be in the future";
      else if (differenceInYears(new Date(), d) > 120) next["date_of_birth"] = "Date of birth looks incorrect";
    }
    if (needsBranchPicker && !branchId) next["branch_id"] = "Select a branch";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    if (duplicates.length && !forceCreate) {
      setForceCreate(true);
      toast.warning("Possible existing patient found — review below, then save again to create a new record.");
      return;
    }
    setSaving(true);
    try {
      const payload: Row = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        phone: phoneDigits,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        branch_id: branchId || null,
      };
      const { data, error } = await db.from("patients").insert(payload).select().single();
      if (error) throw error;
      setCreated(data as Row);
      toast.success(`Patient registered · ${String((data as Row)["mrn"])}`);
      void qc.invalidateQueries();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setForm(EMPTY);
    setErrors({});
    setCreated(null);
    setForceCreate(false);
    setConfirmClose(false);
  }

  function requestClose() {
    if (created || !dirty) {
      setOpen(false);
      reset();
      return;
    }
    setConfirmClose(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setOpen(true);
          reset();
        } else {
          requestClose();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" /> Register Patient
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Patient registered</DialogTitle>
              <DialogDescription>
                The medical record number was generated automatically and cannot be edited.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">MRN</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-2xl font-semibold">{String(created["mrn"])}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Copy MRN"
                    onClick={() => void navigator.clipboard?.writeText(String(created["mrn"]))}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {`${created["first_name"] ?? ""} ${created["last_name"] ?? ""}`.trim()} · {String(created["phone"])}
                  {created["date_of_birth"] ? ` · DOB ${fmtDate(String(created["date_of_birth"]))}` : ""}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                <Plus className="size-4" /> Register another
              </Button>
              <Button
                onClick={() => {
                  const id = String(created["id"]);
                  setOpen(false);
                  reset();
                  void navigate({ to: "/patient/$patientId", params: { patientId: id } });
                }}
              >
                <Check className="size-4" /> Open patient record
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Register new patient</DialogTitle>
              <DialogDescription>
                MRN, branch and registration time are filled in automatically. Medical history,
                insurance and emergency contacts can be added later on the patient record.
              </DialogDescription>
            </DialogHeader>

            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div>
                <Label htmlFor="first_name" className="mb-1.5 block">
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="first_name"
                  autoFocus
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
                {errors["first_name"] ? (
                  <p className="mt-1 text-xs text-destructive">{errors["first_name"]}</p>
                ) : null}
              </div>

              <div>
                <Label htmlFor="last_name" className="mb-1.5 block">
                  Last name
                </Label>
                <Input id="last_name" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
              </div>

              <div>
                <Label htmlFor="phone" className="mb-1.5 block">
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
                {errors["phone"] ? <p className="mt-1 text-xs text-destructive">{errors["phone"]}</p> : null}
              </div>

              <div>
                <Label htmlFor="gender" className="mb-1.5 block">
                  Gender
                </Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date_of_birth" className="mb-1.5 block">
                  Date of birth
                </Label>
                <DobInput value={form.date_of_birth} onChange={(v) => set("date_of_birth", v)} />
                {errors["date_of_birth"] ? (
                  <p className="mt-1 text-xs text-destructive">{errors["date_of_birth"]}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Type as DD/MM/YYYY or use the calendar.</p>
                )}
              </div>

              <div>
                <Label htmlFor="city" className="mb-1.5 block">
                  City
                </Label>
                <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="address" className="mb-1.5 block">
                  Address
                </Label>
                <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>

              {needsBranchPicker ? (
                <div className="sm:col-span-2">
                  <Label htmlFor="branch_id" className="mb-1.5 block">
                    Branch <span className="text-destructive">*</span>
                  </Label>
                  <Select value={branchId} onValueChange={(v) => set("branch_id", v)}>
                    <SelectTrigger id="branch_id">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors["branch_id"] ? (
                    <p className="mt-1 text-xs text-destructive">{errors["branch_id"]}</p>
                  ) : null}
                </div>
              ) : null}

              <button type="submit" className="hidden" aria-hidden />
            </form>

            {duplicates.length ? (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="size-4" /> Possible existing patient found
                </p>
                <div className="mt-2 space-y-2">
                  {duplicates.map((d) => (
                    <div key={String(d["id"])} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {`${d["first_name"] ?? ""} ${d["last_name"] ?? ""}`.trim()} · {String(d["mrn"])} ·{" "}
                        {String(d["phone"] ?? "—")}
                        {d["date_of_birth"] ? ` · ${fmtDate(String(d["date_of_birth"]))}` : ""}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const id = String(d["id"]);
                          setOpen(false);
                          reset();
                          void navigate({ to: "/patient/$patientId", params: { patientId: id } });
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Family members can share a phone number — save again to register this person as a new patient.
                </p>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={requestClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? "Saving…" : duplicates.length && !forceCreate ? "Check & save" : "Save patient"}
              </Button>
            </DialogFooter>

            {confirmClose ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p>Discard the details you have entered?</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmClose(false)}>
                    Keep editing
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
