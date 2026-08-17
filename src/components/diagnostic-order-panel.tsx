import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { errorMessage, type Row } from "@/lib/api";
import { DIAG_STATUS_LABEL, uploadDiagnosticReport, useUpdateDiagnosticOrder } from "@/lib/diagnostics";
import { fmtDateTime, titleize } from "@/lib/format";

export function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "completed" || status === "reviewed") return "secondary";
  if (status === "in_progress") return "default";
  return "outline";
}

/** Diagnostic staff workspace for a single order: perform → results → report → complete. */
export function DiagnosticOrderPanel({ order, trigger }: { order: Row; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const { profile } = useAuth();
  const update = useUpdateDiagnosticOrder();

  useEffect(() => {
    if (!open) return;
    setFindings(order["findings"] ? String(order["findings"]) : "");
    setImpression(order["impression"] ? String(order["impression"]) : "");
    setReportUrl(order["report_url"] ? String(order["report_url"]) : "");
  }, [open, order]);

  const id = String(order["id"]);
  const status = String(order["status"]);
  const test = order["diagnostic_tests"] as Row | null;
  const patient = order["patients"] as Row | null;
  const visit = order["visits"] as Row | null;

  const save = (patch: Row, close = false) =>
    update.mutate(
      {
        id,
        patch: {
          findings: findings || null,
          impression: impression || null,
          report_url: reportUrl || null,
          performed_by: order["performed_by"] ?? profile?.id ?? null,
          ...patch,
        },
      },
      { onSuccess: () => close && setOpen(false) },
    );

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadDiagnosticReport(id, file);
      setReportUrl(url);
      update.mutate({ id, patch: { report_url: url } });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {test?.["name"] ? String(test["name"]) : "Diagnostic test"} · {String(order["eye"] ?? "OU")}
          </DialogTitle>
          <DialogDescription>
            {patient ? `${String(patient["first_name"] ?? "")} ${String(patient["last_name"] ?? "")}`.trim() : "Patient"}
            {patient?.["mrn"] ? ` · ${String(patient["mrn"])}` : ""}
            {visit?.["token_no"] ? ` · token #${String(visit["token_no"])}` : ""} · ordered{" "}
            {fmtDateTime(String(order["created_at"]))}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(status)}>{DIAG_STATUS_LABEL[status] ?? status}</Badge>
            <Badge variant="outline">{titleize(String(order["priority"] ?? "normal"))}</Badge>
            {order["doctor_notes"] ? (
              <span className="text-sm text-muted-foreground">Doctor note: {String(order["doctor_notes"])}</span>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label>Results / findings</Label>
            <Textarea rows={4} value={findings} onChange={(e) => setFindings(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Impression</Label>
            <Textarea rows={2} value={impression} onChange={(e) => setImpression(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`report-${id}`}>Report file</Label>
            <Input
              id={`report-${id}`}
              type="file"
              accept="image/*,application/pdf"
              disabled={uploading}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            {reportUrl ? (
              <a href={reportUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                View uploaded report
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">PDF or image; stored privately.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {status === "ordered" || status === "sample_collected" ? (
            <Button variant="outline" onClick={() => save({ status: "in_progress" })} disabled={update.isPending}>
              Start test
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => save({})} disabled={update.isPending}>
            Save results
          </Button>
          {status !== "completed" && status !== "reviewed" ? (
            <Button onClick={() => save({ status: "completed" }, true)} disabled={update.isPending}>
              Mark completed
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
