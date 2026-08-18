import { Link } from "@tanstack/react-router";

import { OpticalOrderDialog } from "@/components/optical-order-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type Row } from "@/lib/api";
import { fmtDateTime, fmtMoney, titleize } from "@/lib/format";
import { opticalPatientName, orderTotal, rxSummary, useOpticalOrders, useOpticalPrescriptions } from "@/lib/optical";

/** Optical prescriptions from this encounter and the orders raised against them. */
export function VisitOpticalSection({ visit }: { visit: Row }) {
  const visitId = String(visit["id"]);
  const patientId = String(visit["patient_id"]);
  const branchId = (visit["branch_id"] as string | null) ?? null;
  const rx = useOpticalPrescriptions({ patientId });
  const orders = useOpticalOrders({ patientId });

  return (
    <div className="space-y-4">
      <section className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Optical prescriptions</h3>
        {rx.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : rx.data?.length ? (
          <ul className="space-y-2">
            {rx.data.map((r) => (
              <li key={String(r["id"])} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {titleize(String(r["type"] ?? "spectacles"))} · {String(r["created_at"]).slice(0, 10)}
                    {String(r["visit_id"] ?? "") === visitId ? " · this visit" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{rxSummary(r)}</p>
                </div>
                <OpticalOrderDialog rx={r} patientId={patientId} visitId={visitId} branchId={branchId} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No optical prescription yet. Record one in the Optical Prescriptions module for this patient.
          </p>
        )}
      </section>

      <section className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Optical orders</h3>
        {orders.data?.length ? (
          <ul className="space-y-2">
            {orders.data.map((o) => (
              <li key={String(o["id"])} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {opticalPatientName(o)} · {fmtMoney(orderTotal(o))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(String(o["created_at"]))}
                    {(o["invoices"] as Row | null) ? ` · ${String((o["invoices"] as Row)["invoice_no"])}` : " · not billed"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={["delivered", "cancelled"].includes(String(o["status"])) ? "secondary" : "default"}>
                    {titleize(String(o["status"]))}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/optical-order/$orderId" params={{ orderId: String(o["id"]) }}>
                      Open
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No optical order for this patient yet.</p>
        )}
      </section>
    </div>
  );
}
