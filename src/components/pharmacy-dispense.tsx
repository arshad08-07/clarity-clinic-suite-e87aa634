import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { DispenseDialog } from "@/components/dispense-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type Row } from "@/lib/api";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { usePharmacySales, usePrescriptions, useReturnDispense } from "@/lib/pharmacy";

function patientOf(r: Row) {
  const p = r["patients"] as Row | null;
  if (!p) return "—";
  return `${String(p["first_name"] ?? "")} ${String(p["last_name"] ?? "")}`.trim() || "—";
}

/** Prescription-driven dispensing counter. */
export function PharmacyDispense({ patientId, visitId }: { patientId?: string; visitId?: string } = {}) {
  const [search, setSearch] = useState("");
  const rx = usePrescriptions({
    ...(patientId ? { patientId } : {}),
    ...(visitId ? { visitId } : {}),
    search,
  });
  const sales = usePharmacySales({ ...(patientId ? { patientId } : {}), ...(visitId ? { visitId } : {}) });
  const dispensedItemIds = new Set(
    (sales.data ?? [])
      .filter((s) => String(s["status"]) === "dispensed" && s["prescription_item_id"])
      .map((s) => String(s["prescription_item_id"])),
  );

  return (
    <div className="space-y-4">
      {!patientId && !visitId && (
        <Input
          placeholder="Search prescriptions by patient, MRN or drug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      )}

      {rx.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : rx.data?.length ? (
        <div className="space-y-3">
          {rx.data.map((p) => {
            const items = (p["prescription_items"] ?? []) as Row[];
            const doctor = p["profiles"] as Row | null;
            const pat = p["patients"] as Row | null;
            return (
              <section key={String(p["id"])} className="surface-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {patientOf(p)}{" "}
                      <span className="text-xs text-muted-foreground">
                        {String(pat?.["mrn"] ?? "")} · {fmtDateTime(String(p["created_at"]))}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Prescribed by {String(doctor?.["full_name"] ?? "—")}
                      {p["notes"] ? ` · ${String(p["notes"])}` : ""}
                    </p>
                  </div>
                  {pat ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/patient/$patientId" params={{ patientId: String(pat["id"]) }}>
                        Patient record
                      </Link>
                    </Button>
                  ) : null}
                </div>

                {items.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Drug</TableHead>
                        <TableHead>Dose / frequency</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((i) => {
                        const done = dispensedItemIds.has(String(i["id"]));
                        return (
                          <TableRow key={String(i["id"])}>
                            <TableCell className="font-medium">
                              {String(i["drug_name"])}
                              {i["strength"] ? ` ${String(i["strength"])}` : ""}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {[i["dosage"], i["frequency"], i["route"], i["eye"]].filter(Boolean).join(" · ") || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {String(i["duration"] ?? "—")}
                            </TableCell>
                            <TableCell className="text-right">
                              {done ? (
                                <Badge variant="secondary">Dispensed</Badge>
                              ) : (
                                <DispenseDialog
                                  trigger={<Button size="sm">Dispense</Button>}
                                  patientId={String(p["patient_id"])}
                                  visitId={(p["visit_id"] as string) ?? null}
                                  prescriptionId={String(p["id"])}
                                  prescriptionItem={i}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No drugs on this prescription.</p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No prescriptions to dispense"
          description="Prescriptions written by doctors appear here for the pharmacy counter."
        />
      )}

      <PharmacySalesTable {...(patientId ? { patientId } : {})} {...(visitId ? { visitId } : {})} />
    </div>
  );
}

/** Dispensing ledger with returns that restore stock and update the invoice. */
export function PharmacySalesTable({ patientId, visitId }: { patientId?: string; visitId?: string }) {
  const sales = usePharmacySales({ ...(patientId ? { patientId } : {}), ...(visitId ? { visitId } : {}) });
  const ret = useReturnDispense();

  if (sales.isLoading) return <Skeleton className="h-32 w-full" />;
  if (!sales.data?.length)
    return (
      <EmptyState title="Nothing dispensed yet" description="Dispensed medicines and their bills will appear here." />
    );

  return (
    <div className="surface-card p-4">
      <h3 className="mb-3 font-display text-base font-semibold">Dispensing history</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Patient</TableHead>
            <TableHead>Medicine</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Return</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.data.map((s) => {
            const prod = s["products"] as Row | null;
            const batch = s["product_batches"] as Row | null;
            const inv = s["invoices"] as Row | null;
            const remaining = Number(s["quantity"] ?? 0) - Number(s["returned_qty"] ?? 0);
            return (
              <TableRow key={String(s["id"])}>
                <TableCell className="text-sm">{fmtDateTime(String(s["created_at"]))}</TableCell>
                <TableCell className="text-sm">{patientOf(s)}</TableCell>
                <TableCell className="text-sm font-medium">{String(prod?.["name"] ?? "—")}</TableCell>
                <TableCell className="text-sm">{String(batch?.["batch_no"] ?? "—")}</TableCell>
                <TableCell className="text-right text-sm">
                  {String(s["quantity"])}
                  {Number(s["returned_qty"] ?? 0) > 0 ? ` (−${String(s["returned_qty"])})` : ""}
                </TableCell>
                <TableCell className="text-right text-sm">{fmtMoney(s["amount"])}</TableCell>
                <TableCell className="text-sm">
                  {inv ? (
                    <Link
                      to="/invoice/$invoiceId"
                      params={{ invoiceId: String(inv["id"]) }}
                      className="text-primary hover:underline"
                    >
                      {String(inv["invoice_no"])}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {remaining > 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ret.isPending}
                      onClick={() => ret.mutate({ sale: s, quantity: remaining })}
                    >
                      Return {remaining}
                    </Button>
                  ) : (
                    <Badge variant="secondary">Returned</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
