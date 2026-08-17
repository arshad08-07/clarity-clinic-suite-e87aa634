
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
