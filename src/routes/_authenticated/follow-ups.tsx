import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, CheckCircle2, Download, RefreshCw, Search, Send, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLookup, type Row } from "@/lib/api";
import { downloadCsv, fmtDate, fmtDateTime, titleize, toCsv } from "@/lib/format";
import {
  STATE_LABELS,
  STATE_TONE,
  followUpPatientName,
  followUpState,
  useDispatchReminders,
  useFollowUpReminders,
  useFollowUps,
  useUpdateFollowUp,
  type FollowUpState,
} from "@/lib/follow-ups";
import { cn } from "@/lib/utils";

const TABS: { key: string; label: string }[] = [
  { key: "due", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "closed", label: "Cancelled / No-show" },
  { key: "all", label: "All" },
];

export const Route = createFileRoute("/_authenticated/follow-ups")({
  head: () => ({
    meta: [
      { title: "Follow-ups & Recalls — Vision Care HMS" },
      {
        name: "description",
        content: "Track due, upcoming and overdue patient recalls with automated reminder delivery.",
      },
      { property: "og:title", content: "Follow-ups & Recalls — Vision Care HMS" },
      {
        property: "og:description",
        content: "Track due, upcoming and overdue patient recalls with automated reminder delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FollowUpBoard,
});

function FollowUpBoard() {
  const list = useFollowUps();
  const dispatch = useDispatchReminders();
  const doctors = useLookup("profiles", "id, full_name", { filters: { is_active: true }, orderBy: "full_name" });

  const [tab, setTab] = useState("due");
  const [search, setSearch] = useState("");
  const [doctor, setDoctor] = useState("all");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [active, setActive] = useState<Row | null>(null);

  const rows = list.data ?? [];

  const counts = useMemo(() => {
    const c: Record<string, number> = { due: 0, upcoming: 0, overdue: 0, completed: 0, closed: 0, all: rows.length };
    for (const r of rows) {
      const s = followUpState(r);
      if (s === "cancelled" || s === "no_show") c["closed"] = (c["closed"] ?? 0) + 1;
      else c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const state = followUpState(r);
      if (tab === "closed" ? !(state === "cancelled" || state === "no_show") : tab !== "all" && state !== tab)
        return false;
      if (doctor !== "all" && String((r["doctor"] as Row | null)?.["id"] ?? "") !== doctor) return false;
      if (type !== "all" && String(r["type"] ?? "") !== type) return false;
      const due = String(r["due_date"] ?? "");
      if (from && due < from) return false;
      if (to && due > to) return false;
      if (term) {
        const p = r["patients"] as Row | null;
        const hay = [
          followUpPatientName(r),
          p?.["mrn"],
          p?.["phone"],
          r["reason"],
          r["notes"],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, tab, doctor, type, from, to, search]);

  const types = Array.from(new Set(rows.map((r) => String(r["type"] ?? "")).filter(Boolean)));

  function exportCsv() {
    const csv = toCsv(
      filtered.map((r) => ({
        due_date: r["due_date"],
        state: STATE_LABELS[followUpState(r)],
        patient: followUpPatientName(r),
        mrn: (r["patients"] as Row | null)?.["mrn"],
        phone: (r["patients"] as Row | null)?.["phone"],
        doctor: (r["doctor"] as Row | null)?.["full_name"],
        branch: (r["branches"] as Row | null)?.["name"],
        type: r["type"],
        priority: r["priority"],
        reason: r["reason"],
      })),
      [
        { key: "due_date", label: "Due date" },
        { key: "state", label: "Status" },
        { key: "patient", label: "Patient" },
        { key: "mrn", label: "MRN" },
        { key: "phone", label: "Phone" },
        { key: "doctor", label: "Doctor" },
        { key: "branch", label: "Branch" },
        { key: "type", label: "Type" },
        { key: "priority", label: "Priority" },
        { key: "reason", label: "Reason" },
      ],
    );
    downloadCsv("follow-ups.csv", csv);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Follow-ups &amp; recalls</h1>
          <p className="text-sm text-muted-foreground">
            Every recall raised from a consultation, surgery or discharge, with its reminder trail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => list.refetch()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="size-4" /> Export
          </Button>
          <Button onClick={() => dispatch.mutate()} disabled={dispatch.isPending}>
            <Send className="size-4" /> Send due reminders
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["due", "upcoming", "overdue", "completed"] as FollowUpState[]).map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={cn(
              "surface-card p-4 text-left transition",
              tab === s ? "ring-2 ring-primary" : "hover:bg-muted/40",
            )}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{STATE_LABELS[s]}</p>
            <p className="font-display text-2xl font-semibold">{counts[s] ?? 0}</p>
          </button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label} ({counts[t.key] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="surface-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Patient, MRN, phone, reason"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={doctor} onValueChange={setDoctor}>
            <SelectTrigger>
              <SelectValue placeholder="Doctor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All doctors</SelectItem>
              {(doctors.data ?? []).map((d) => (
                <SelectItem key={String(d["id"])} value={String(d["id"])}>
                  {String(d["full_name"])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {titleize(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="surface-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Loading follow-ups…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Nothing in this view.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const state = followUpState(r);
                const patient = r["patients"] as Row | null;
                return (
                  <tr key={String(r["id"])} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{fmtDate(r["due_date"])}</td>
                    <td className="px-4 py-3">
                      {patient ? (
                        <Link
                          to="/patient/$patientId"
                          params={{ patientId: String(patient["id"]) }}
                          className="text-primary hover:underline"
                        >
                          {followUpPatientName(r)}
                        </Link>
                      ) : (
                        followUpPatientName(r)
                      )}
                      <div className="text-xs text-muted-foreground">
                        {String(patient?.["mrn"] ?? "")} · {String(patient?.["phone"] ?? "")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {titleize(String(r["type"] ?? ""))}
                      {r["reason"] ? <div className="text-xs text-muted-foreground">{String(r["reason"])}</div> : null}
                    </td>
                    <td className="px-4 py-3">{String((r["doctor"] as Row | null)?.["full_name"] ?? "—")}</td>
                    <td className="px-4 py-3">{String((r["branches"] as Row | null)?.["name"] ?? "—")}</td>
                    <td className="px-4 py-3">{titleize(String(r["priority"] ?? "normal"))}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn("border-0", STATE_TONE[state])}>{STATE_LABELS[state]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setActive(r)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ManageDialog row={active} onClose={() => setActive(null)} />
    </div>
  );
}

function ManageDialog({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const update = useUpdateFollowUp();
  const reminders = useFollowUpReminders(row ? String(row["id"]) : null);
  const [outcome, setOutcome] = useState("");
  const [reschedule, setReschedule] = useState("");

  if (!row) return null;
  const id = String(row["id"]);
  const state = followUpState(row);
  const closed = state === "completed" || state === "cancelled" || state === "no_show";

  const act = (values: Record<string, unknown>) =>
    update.mutate({ id, values }, { onSuccess: onClose });

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {followUpPatientName(row)} · {fmtDate(row["due_date"])}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("border-0", STATE_TONE[state])}>{STATE_LABELS[state]}</Badge>
            <span className="text-muted-foreground">
              {titleize(String(row["type"] ?? ""))}
              {row["reason"] ? ` · ${String(row["reason"])}` : ""}
            </span>
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <BellRing className="size-3.5" /> Reminder trail
            </p>
            {(reminders.data ?? []).length === 0 ? (
              <p className="text-muted-foreground">No reminders queued.</p>
            ) : (
              <ul className="space-y-1">
                {(reminders.data ?? []).map((c) => (
                  <li key={String(c["id"])} className="rounded border border-border/60 px-2 py-1 text-xs">
                    <span className="font-medium">{titleize(String(c["channel"]))}</span> ·{" "}
                    {titleize(String(c["status"]))}
                    {c["sent_at"] ? ` · sent ${fmtDateTime(c["sent_at"])}` : ""}
                    {c["scheduled_at"] && !c["sent_at"] ? ` · due ${fmtDateTime(c["scheduled_at"])}` : ""}
                    {c["failure_reason"] ? (
                      <span className="block text-muted-foreground">{String(c["failure_reason"])}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!closed ? (
            <>
              <div className="grid gap-1.5">
                <Label>Outcome / cancellation note</Label>
                <Textarea rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Reschedule to</Label>
                <Input type="date" value={reschedule} onChange={(e) => setReschedule(e.target.value)} />
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              This follow-up is closed{row["outcome_notes"] ? `: ${String(row["outcome_notes"])}` : "."}
            </p>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {!closed ? (
            <>
              {reschedule ? (
                <Button variant="outline" onClick={() => act({ due_date: reschedule })} disabled={update.isPending}>
                  Reschedule
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => act({ status: "no_show" })}
                disabled={update.isPending}
              >
                <X className="size-4" /> No-show
              </Button>
              <Button
                variant="outline"
                onClick={() => act({ status: "cancelled", cancel_reason: outcome || "Cancelled by staff" })}
                disabled={update.isPending}
              >
                Cancel recall
              </Button>
              <Button
                onClick={() => act({ status: "completed", outcome_notes: outcome || null })}
                disabled={update.isPending}
              >
                <CheckCircle2 className="size-4" /> Mark completed
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
