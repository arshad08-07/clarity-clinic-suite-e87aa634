import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmFunnel } from "@/lib/crm";
import { fmtMoney, titleize } from "@/lib/format";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

/** Lead → Appointment → Patient/Visit → Surgery → Revenue attribution by source. */
export function CrmFunnel() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const funnel = useCrmFunnel(from, to);
  const rows = funnel.data ?? [];

  const totals = rows.reduce(
    (acc, r) => ({
      leads: acc.leads + Number(r.leads),
      contacted: acc.contacted + Number(r.contacted),
      appointments: acc.appointments + Number(r.appointments),
      patients: acc.patients + Number(r.patients),
      visits: acc.visits + Number(r.visits),
      surgeries: acc.surgeries + Number(r.surgeries),
      revenue: acc.revenue + Number(r.revenue),
    }),
    { leads: 0, contacted: 0, appointments: 0, patients: 0, visits: 0, surgeries: 0, revenue: 0 },
  );

  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Conversion funnel</h2>
          <p className="text-sm text-muted-foreground">
            Enquiries through to attributed revenue, grouped by source and campaign.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      {funnel.isLoading ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Source</th>
                <th>Campaign</th>
                <th className="text-right">Leads</th>
                <th className="text-right">Contacted</th>
                <th className="text-right">Appointments</th>
                <th className="text-right">Patients</th>
                <th className="text-right">Visits</th>
                <th className="text-right">Surgeries</th>
                <th className="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={`${r.source}-${r.campaign}`} className="border-t">
                    <td className="py-2">{titleize(String(r.source))}</td>
                    <td>{String(r.campaign)}</td>
                    <td className="text-right tabular-nums">{Number(r.leads)}</td>
                    <td className="text-right tabular-nums">{Number(r.contacted)}</td>
                    <td className="text-right tabular-nums">{Number(r.appointments)}</td>
                    <td className="text-right tabular-nums">{Number(r.patients)}</td>
                    <td className="text-right tabular-nums">{Number(r.visits)}</td>
                    <td className="text-right tabular-nums">{Number(r.surgeries)}</td>
                    <td className="text-right tabular-nums">{fmtMoney(Number(r.revenue))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
                    No leads in this period.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length ? (
              <tfoot>
                <tr className="border-t font-medium">
                  <td className="py-2" colSpan={2}>
                    Total
                  </td>
                  <td className="text-right tabular-nums">{totals.leads}</td>
                  <td className="text-right tabular-nums">{totals.contacted}</td>
                  <td className="text-right tabular-nums">{totals.appointments}</td>
                  <td className="text-right tabular-nums">{totals.patients}</td>
                  <td className="text-right tabular-nums">{totals.visits}</td>
                  <td className="text-right tabular-nums">{totals.surgeries}</td>
                  <td className="text-right tabular-nums">{fmtMoney(totals.revenue)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </section>
  );
}
