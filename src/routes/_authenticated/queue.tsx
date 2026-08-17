import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Megaphone, PauseCircle, PlayCircle, Plus, SkipForward } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { WalkInDialog } from "@/components/walk-in-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Row } from "@/lib/api";
import { fmtTime } from "@/lib/format";
import { patientName, STAGE_LABEL, useQueue, useVisitUpdate, waitingMinutes } from "@/lib/queue";

export const Route = createFileRoute("/_authenticated/queue")({
  head: () => ({
    meta: [
      { title: "Live Queue — Vision Care HMS" },
      {
        name: "description",
        content:
          "Token-wise live patient queue driven by real check-ins: waiting, optometry, doctor, diagnostics, billing.",
      },
      { property: "og:title", content: "Live Queue — Vision Care HMS" },
      {
        property: "og:description",
        content: "Real-time clinic queue from check-in to completion.",
      },
    ],
  }),
  component: QueuePage,
  errorComponent: () => (
    <EmptyState title="Could not load the queue" description="Refresh the page to try again." />
  ),
});

const TABS = ["all", "waiting", "optometry", "with_doctor", "diagnostics", "billing", "completed"] as const;

function QueuePage() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQueue({ day });
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (tab !== "all" && String(r["status"]) !== tab) return false;
      if (!term) return true;
      const p = r["patients"] as { mrn?: string } | null;
      return (
        patientName(r).toLowerCase().includes(term) ||
        String(p?.mrn ?? "").toLowerCase().includes(term) ||
        String(r["token_no"] ?? "").includes(term)
      );
    });
  }, [data, tab, search]);

  const countOf = (s: string) => (data ?? []).filter((r) => String(r["status"]) === s).length;

  return (
    <div>
      <PageHeader
        title="Live Queue"
        description="Every token here comes from a real check-in or walk-in. Stages stay in sync with appointments and visits."
        actions={
          <>
            <Input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="h-9 w-[150px]"
            />
            <WalkInDialog
              trigger={
                <Button size="sm">
                  <Plus className="size-4" /> Walk-in
                </Button>
              }
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Waiting" value={countOf("waiting")} icon={Clock} tone="warning" loading={isLoading} />
        <StatCard label="Optometry" value={countOf("optometry")} icon={PlayCircle} tone="info" loading={isLoading} />
        <StatCard label="With doctor" value={countOf("with_doctor")} icon={PlayCircle} loading={isLoading} />
        <StatCard label="Billing" value={countOf("billing")} icon={PlayCircle} tone="info" loading={isLoading} />
        <StatCard label="Completed" value={countOf("completed")} icon={PlayCircle} tone="success" loading={isLoading} />
      </div>

      <div className="surface-card mt-6">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {t === "all" ? "All" : STAGE_LABEL[t]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search token, name or MRN"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 lg:w-72"
          />
        </div>

        {isLoading ? (
          <Skeleton className="m-4 h-64" />
        ) : rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No patients in the queue"
              description="Check in an appointment or add a walk-in — tokens appear here instantly."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Token</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Checked in</TableHead>
                  <TableHead>Waiting</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <QueueRow key={String(row["id"])} row={row} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function QueueRow({ row }: { row: Row }) {
  const navigate = useNavigate();
  const update = useVisitUpdate();
  const id = String(row["id"]);
  const status = String(row["status"]);
  const patient = row["patients"] as { id?: string; mrn?: string } | null;
  const doctor = row["profiles"] as { full_name?: string } | null;
  const appt = row["appointments"] as { scheduled_at?: string } | null;
  const mins = waitingMinutes(row);
  const openVisit = () => void navigate({ to: "/visit/$visitId", params: { visitId: id } });
  const move = (next: string) => update.mutate({ id, patch: { status: next } });

  return (
    <TableRow className="cursor-pointer" onClick={openVisit}>
      <TableCell className="font-semibold tabular-nums">#{String(row["token_no"] ?? "—")}</TableCell>
      <TableCell>
        <p className="font-medium">{patientName(row)}</p>
        <p className="text-xs text-muted-foreground">{patient?.mrn ?? "—"}</p>
      </TableCell>
      <TableCell className="text-sm">
        {appt?.scheduled_at ? fmtTime(appt.scheduled_at) : <span className="text-muted-foreground">Walk-in</span>}
      </TableCell>
      <TableCell className="text-sm">{doctor?.full_name ?? "—"}</TableCell>
      <TableCell className="text-sm">{String(row["department"] ?? "general").replace(/_/g, " ")}</TableCell>
      <TableCell>
        <Badge variant={status === "completed" ? "secondary" : "default"}>{STAGE_LABEL[status] ?? status}</Badge>
        {row["on_hold"] ? (
          <Badge variant="outline" className="ml-1">
            On hold
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="text-sm tabular-nums">{fmtTime(String(row["checked_in_at"]))}</TableCell>
      <TableCell className="text-sm tabular-nums">
        <span className={mins > 30 && status !== "completed" ? "font-semibold text-destructive" : ""}>{mins}m</span>
      </TableCell>
      <TableCell>
        <Badge variant={row["priority"] === "emergency" ? "destructive" : "outline"}>
          {String(row["priority"] ?? "normal")}
        </Badge>
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap justify-end gap-1">
          {status === "waiting" && (
            <>
              <Button size="sm" onClick={() => move("optometry")}>
                Start optometry
              </Button>
              <Button size="sm" variant="outline" onClick={() => move("with_doctor")}>
                Send to doctor
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Call patient"
                onClick={() => update.mutate({ id, patch: { called_at: new Date().toISOString() } })}
              >
                <Megaphone className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={row["on_hold"] ? "Resume" : "Hold"}
                onClick={() => update.mutate({ id, patch: { on_hold: !row["on_hold"] } })}
              >
                <PauseCircle className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Skip (push to end)"
                onClick={() =>
                  update.mutate({ id, patch: { stage_changed_at: new Date().toISOString(), on_hold: false } })
                }
              >
                <SkipForward className="size-4" />
              </Button>
            </>
          )}
          {status === "optometry" && (
            <>
              <Button size="sm" variant="outline" onClick={openVisit}>
                Open optometry
              </Button>
              <Button size="sm" onClick={() => move("with_doctor")}>
                Send to doctor
              </Button>
            </>
          )}
          {status === "with_doctor" && (
            <>
              <Button size="sm" variant="outline" onClick={openVisit}>
                Open consultation
              </Button>
              <Button size="sm" variant="outline" onClick={() => move("diagnostics")}>
                Diagnostics
              </Button>
              <Button size="sm" onClick={() => move("billing")}>
                Billing
              </Button>
              <Button size="sm" variant="ghost" onClick={() => move("completed")}>
                Complete
              </Button>
            </>
          )}
          {status === "diagnostics" && (
            <>
              <Button size="sm" variant="outline" asChild>
                <Link to="/diagnostics">Open tests</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => move("with_doctor")}>
                Back to doctor
              </Button>
              <Button size="sm" onClick={() => move("billing")}>
                Billing
              </Button>
            </>
          )}
          {status === "billing" && (
            <>
              <Button size="sm" variant="outline" asChild>
                <Link to="/billing">Open bill</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/payments">Payment</Link>
              </Button>
              <Button size="sm" onClick={() => move("completed")}>
                Complete
              </Button>
            </>
          )}
          {status === "completed" && (
            <>
              <Button size="sm" variant="outline" onClick={openVisit}>
                View visit
              </Button>
              {patient?.id ? (
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/patient/$patientId" params={{ patientId: String(patient.id) }}>
                    View patient
                  </Link>
                </Button>
              ) : null}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
