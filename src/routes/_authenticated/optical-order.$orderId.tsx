import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { type Row } from "@/lib/api";
import { balanceOf } from "@/lib/billing";
import { fmtDateTime, fmtMoney, titleize } from "@/lib/format";
import {
  NEXT_LABEL,
  NEXT_STATUS,
  opticalPatientName,
  orderTotal,
  rxSummary,
  useAdvanceOpticalOrder,
  useCancelOpticalOrder,
  useOpticalOrder,
  useRaiseOpticalInvoice,
} from "@/lib/optical";

export const Route = createFileRoute("/_authenticated/optical-order/$orderId")({
  head: () => ({
    meta: [
      { title: "Optical Order — Vision Care HMS" },
      {
        name: "description",
        content: "Optical order fulfilment: frame and lens selection, invoicing, production status and delivery.",
      },
      { property: "og:title", content: "Optical Order — Vision Care HMS" },
      {
        property: "og:description",
        content: "Track an optical order from prescription to delivery with billing and stock in sync.",
      },
    ],
  }),
  component: OpticalOrderWorkspace,
  errorComponent: () => (
    <EmptyState title="Could not load this optical order" description="Please refresh or go back to the optical shop." />
  ),
  notFoundComponent: () => <EmptyState title="Order not found" description="This optical order no longer exists." />,
});

function Line({ label, product, price, qty }: { label: string; product: Row | null; price: number; qty: number }) {
  if (!product) return null;
  return (
    <li className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
      <div>
        <p className="font-medium">
          {label} · {String(product["name"])}
        </p>
        <p className="text-xs text-muted-foreground">
          {String(product["sku"])} · {qty} × {fmtMoney(price)}
        </p>
      </div>
      <span className="font-medium">{fmtMoney(price * qty)}</span>
    </li>
  );
}

function OpticalOrderWorkspace() {
  const { orderId } = useParams({ from: "/_authenticated/optical-order/$orderId" });
  const order = useOpticalOrder(orderId);
  const raise = useRaiseOpticalInvoice(orderId);
  const advance = useAdvanceOpticalOrder(orderId);
  const cancel = useCancelOpticalOrder(orderId);
  const [reason, setReason] = useState("");

  if (order.isLoading) return <Skeleton className="h-64 w-full" />;
  const o = order.data;
  if (!o) return <EmptyState title="Order not found" description="This optical order no longer exists." />;

  const status = String(o["status"]);
  const qty = Number(o["quantity"] ?? 1);
  const invoice = o["invoices"] as Row | null;
  const rx = o["optical_prescriptions"] as Row | null;
  const next = NEXT_STATUS[status] ?? null;
  const closed = status === "delivered" || status === "cancelled";
  const unpaid = invoice ? balanceOf(invoice) > 0 : true;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Optical order · ${opticalPatientName(o)}`}
        description={`Placed ${fmtDateTime(String(o["created_at"]))} · ${titleize(status)}${
          o["delivery_date"] ? ` · promised ${String(o["delivery_date"])}` : ""
        }`}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/patient/$patientId" params={{ patientId: String(o["patient_id"]) }}>
                Patient record
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/optical-shop">Back to optical shop</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="surface-card space-y-3 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Order items</h2>
            <Badge variant={closed ? "secondary" : "default"}>{titleize(status)}</Badge>
          </div>
          <ul>
            <Line label="Frame" product={o["frame"] as Row | null} price={Number(o["frame_price"] ?? 0)} qty={qty} />
            <Line
              label="Right lens (OD)"
              product={o["lens_od"] as Row | null}
              price={Number(o["lens_od_price"] ?? 0)}
              qty={qty}
            />
            <Line
              label="Left lens (OS)"
              product={o["lens_os"] as Row | null}
              price={Number(o["lens_os_price"] ?? 0)}
              qty={qty}
            />
          </ul>
          <div className="flex justify-between border-t pt-2 text-sm">
            <span>Discount</span>
            <span>-{fmtMoney(o["discount"] ?? 0)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Order value</span>
            <span>{fmtMoney(orderTotal(o))}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Index {String(o["lens_index"] ?? "—")} · Coating {String(o["coating"] ?? "—")}
            {o["notes"] ? ` · ${String(o["notes"])}` : ""}
          </p>
          {o["stock_applied"] ? (
            <p className="text-xs text-muted-foreground">Stock reserved from inventory for this order.</p>
          ) : (
            <p className="text-xs text-muted-foreground">No stock is currently held for this order.</p>
          )}
        </section>

        <section className="surface-card space-y-3 p-5 text-sm">
          <h2 className="font-display text-base font-semibold">Prescription</h2>
          {rx ? (
            <>
              <p>{rxSummary(rx)}</p>
              <p className="text-xs text-muted-foreground">
                {titleize(String(rx["type"] ?? "spectacles"))} · {String(rx["created_at"]).slice(0, 10)}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">No prescription linked.</p>
          )}
          <div className="border-t pt-3">
            <h3 className="mb-1 font-medium">Billing</h3>
            {invoice ? (
              <div className="space-y-1">
                <p>
                  {String(invoice["invoice_no"])} · {fmtMoney(invoice["total"])} · paid {fmtMoney(invoice["paid_amount"])}
                </p>
                <p className="text-xs text-muted-foreground">
                  Balance {fmtMoney(balanceOf(invoice))} · {titleize(String(invoice["status"]))}
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/invoice/$invoiceId" params={{ invoiceId: String(invoice["id"]) }}>
                    Open invoice & collect payment
                  </Link>
                </Button>
              </div>
            ) : (
              <Button size="sm" disabled={raise.isPending || status === "cancelled"} onClick={() => raise.mutate(o)}>
                Raise optical invoice
              </Button>
            )}
          </div>
        </section>
      </div>

      <section className="surface-card space-y-3 p-5">
        <h2 className="font-display text-base font-semibold">Fulfilment</h2>
        <div className="flex flex-wrap items-center gap-2">
          {next ? (
            <Button
              disabled={advance.isPending || (next === "delivered" && unpaid)}
              onClick={() => advance.mutate(next)}
            >
              {NEXT_LABEL[status] ?? `Mark ${next}`}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              This order is {titleize(status)}
              {o["delivered_at"] ? ` · ${fmtDateTime(String(o["delivered_at"]))}` : ""}.
            </p>
          )}
          {next === "delivered" && unpaid ? (
            <span className="text-xs text-destructive">Collect the outstanding balance before delivery.</span>
          ) : null}
        </div>

        {!closed ? (
          <div className="grid gap-2 border-t pt-3 sm:max-w-md">
            <Label htmlFor="opt-cancel">Cancel / return reason</Label>
            <Input id="opt-cancel" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button
              variant="destructive"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate({ order: o, reason })}
            >
              Cancel order (restore stock & reverse billing)
            </Button>
          </div>
        ) : null}
        {o["cancel_reason"] ? (
          <p className="text-xs text-muted-foreground">Cancellation reason: {String(o["cancel_reason"])}</p>
        ) : null}
      </section>
    </div>
  );
}
