import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { DiagnosticOrderPanel, statusVariant } from "@/components/diagnostic-order-panel";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Row } from "@/lib/api";
import { DIAG_STATUS_LABEL, useDiagnosticOrders, useUpdateDiagnosticOrder } from "@/lib/diagnostics";
import { fmtDateTime, titleize } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics Workspace — Vision Care HMS" },
      {
        name: "description",
        content: "Receive diagnostic orders, perform tests, record results, upload reports and complete investigations.",
      },
      { property: "og:title", content: "Diagnostics Workspace — Vision Care HMS" },
      {
        property: "og:description",
        content: "Pending, in-progress and completed diagnostic orders linked to live patient visits.",
      },
    ],
  }),
  component: DiagnosticsWorkspace,
  errorComponent: () => <EmptyState title="Could not load diagnostics" description="Please refresh and try again." />,
});

const TABS = [
  { value: "pending", label: "Pending", statuses: ["ordered", "sample_collected"] },
  { value: "in_progress", label: "In progress", statuses: ["in_progress"] },
  { value: "completed", label: "Completed", statuses: ["completed", "reviewed"] },
] as const;

function DiagnosticsWorkspace() {
  const [search, setSearch] = useState("");
  const all = useDiagnosticOrders({
    statuses: ["ordered", "sample_collected", "in_progress", "completed", "reviewed"],
    search,
  });
  const rows = all.data ?? [];
  const by = (statuses: string[]) => rows.filter((r) => statuses.includes(String(r["status"])));

  return (
    <div>
      <PageHeader
        title="Diagnostics workspace"
        description="Orders arrive here from doctor consultations and stay attached to the same visit."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Pending" value={by(["ordered", "sample_collected"]).length} />
        <StatCard label="In progress" value={by(["in_progress"]).length} />
        <StatCard label="Completed today" value={by(["completed", "reviewed"]).length} />
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search patient, MRN, phone or test…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {all.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} ({by([...t.statuses]).length})
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <OrderTable rows={by([...t.statuses])} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function OrderTable({ rows }: { rows: Row[] }) {
  const update = useUpdateDiagnosticOrder();

  if (!rows.length) {
    return <EmptyState title="Nothing here" description="No diagnostic orders in this stage right now." />;
  }

  return (
    <div className="surface-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>MRN</TableHead>
            <TableHead>Visit</TableHead>
            <TableHead>Doctor</TableHead>
            <TableHead>Test</TableHead>
            <TableHead>Eye</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const p = r["patients"] as Row | null;
            const t = r["diagnostic_tests"] as Row | null;
            const v = r["visits"] as Row | null;
            const doc = r["profiles"] as Row | null;
            const status = String(r["status"]);
            return (
              <TableRow key={String(r["id"])}>
                <TableCell className="font-medium">
                  {p ? (
                    <Link
                      to="/patient/$patientId"
                      params={{ patientId: String(p["id"]) }}
                      className="hover:underline"
                    >
                      {`${String(p["first_name"] ?? "")} ${String(p["last_name"] ?? "")}`.trim() || "—"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{p?.["mrn"] ? String(p["mrn"]) : "—"}</TableCell>
                <TableCell>
                  {v ? (
                    <Link to="/visit/$visitId" params={{ visitId: String(v["id"]) }} className="text-primary hover:underline">
                      #{String(v["token_no"] ?? "—")}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{doc?.["full_name"] ? String(doc["full_name"]) : "—"}</TableCell>
                <TableCell>{t?.["name"] ? String(t["name"]) : "—"}</TableCell>
                <TableCell>{String(r["eye"] ?? "OU")}</TableCell>
                <TableCell>{titleize(String(r["priority"] ?? "normal"))}</TableCell>
                <TableCell>{fmtDateTime(String(r["created_at"]))}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(status)}>{DIAG_STATUS_LABEL[status] ?? status}</Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {status === "ordered" || status === "sample_collected" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: String(r["id"]), patch: { status: "in_progress" } })}
                    >
                      Start
                    </Button>
                  ) : null}
                  <DiagnosticOrderPanel
                    order={r}
                    trigger={
                      <Button size="sm" variant={status === "in_progress" ? "default" : "ghost"}>
                        {status === "completed" || status === "reviewed" ? "View result" : "Open"}
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
