import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useLookup, type Row } from "@/lib/api";
import { fmtDateTime, fmtMoney, titleize } from "@/lib/format";
import { useRecommendSurgery, useVisitSurgeries } from "@/lib/surgery";

const PROCEDURES = [
  "Cataract Surgery (Phaco + IOL)",
  "YAG Capsulotomy",
  "Trabeculectomy",
  "Pterygium Excision",
  "Vitrectomy",
  "Squint Correction",
  "Oculoplasty / Lid Surgery",
  "Intravitreal Injection",
];

/** Doctor raises a surgery from the current encounter and tracks it inline. */
export function VisitSurgerySection({ visit }: { visit: Row }) {
  const visitId = String(visit["id"]);
  const list = useVisitSurgeries(visitId);
  const recommend = useRecommendSurgery();
  const { profile } = useAuth();
  const surgeons = useLookup("profiles", "id, full_name", { filters: { is_active: true }, orderBy: "full_name" });
  const tests = useLookup("diagnostic_tests", "id, name, price", { filters: { is_active: true }, orderBy: "name" });

  const [procedure, setProcedure] = useState(PROCEDURES[0] ?? "");
  const [eye, setEye] = useState("OD");
  const [surgeonId, setSurgeonId] = useState(visit["doctor_id"] ? String(visit["doctor_id"]) : "");
  const [estimate, setEstimate] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <section className="surface-card p-5">
        <h3 className="font-display text-base font-semibold">Recommend surgery</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Creates a planned surgery linked to this visit. Scheduling, consent and billing continue in the surgery workspace.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Procedure</Label>
            <Select value={procedure} onValueChange={setProcedure}>
              <SelectTrigger>
                <SelectValue placeholder="Select procedure" />
              </SelectTrigger>
              <SelectContent>
                {PROCEDURES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Eye</Label>
            <Select value={eye} onValueChange={setEye}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["OD", "OS", "OU"].map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Surgeon</Label>
            <Select value={surgeonId} onValueChange={setSurgeonId}>
              <SelectTrigger>
                <SelectValue placeholder="Select surgeon" />
              </SelectTrigger>
              <SelectContent>
                {(surgeons.data ?? []).map((s: Row) => (
                  <SelectItem key={String(s["id"])} value={String(s["id"])}>
                    {String(s["full_name"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="surg-est">Estimate (₹)</Label>
            <Input id="surg-est" type="number" value={estimate} onChange={(e) => setEstimate(e.target.value)} />
            <Select
              onValueChange={(v) => {
                const t = (tests.data ?? []).find((x: Row) => String(x["id"]) === v);
                if (t) setEstimate(String(Number(estimate || 0) + Number(t["price"] ?? 0)));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add catalog price" />
              </SelectTrigger>
              <SelectContent>
                {(tests.data ?? []).map((t: Row) => (
                  <SelectItem key={String(t["id"])} value={String(t["id"])}>
                    {String(t["name"])} · {fmtMoney(t["price"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3 grid gap-1.5">
          <Label htmlFor="surg-notes">Indication / notes</Label>
          <Textarea id="surg-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button
          className="mt-3"
          disabled={!procedure || recommend.isPending}
          onClick={() =>
            recommend.mutate(
              {
                patient_id: String(visit["patient_id"]),
                visit_id: visitId,
                branch_id: (visit["branch_id"] as string | null) ?? null,
                procedure,
                eye,
                surgeon_id: surgeonId || null,
                recommended_by: profile?.id ?? null,
                recommendation_notes: notes || null,
                estimate_amount: estimate === "" ? null : Number(estimate),
              },
              { onSuccess: () => setNotes("") },
            )
          }
        >
          Recommend surgery
        </Button>
      </section>

      <section className="surface-card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">Surgeries from this visit</h3>
        {list.data?.length ? (
          <ul className="space-y-2">
            {list.data.map((s: Row) => (
              <li key={String(s["id"])} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {String(s["procedure"])} · {String(s["eye"])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s["scheduled_at"] ? fmtDateTime(String(s["scheduled_at"])) : "Not scheduled"} ·{" "}
                    {fmtMoney(s["estimate_amount"] ?? 0)} · consent {titleize(String(s["consent_status"] ?? "pending"))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={String(s["status"]) === "completed" ? "secondary" : "default"}>
                    {titleize(String(s["status"]))}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/surgery/$surgeryId" params={{ surgeryId: String(s["id"]) }}>
                      Open
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No surgery planned from this encounter yet.</p>
        )}
      </section>
    </div>
  );
}
