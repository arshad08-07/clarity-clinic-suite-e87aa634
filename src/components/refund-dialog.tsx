import { useState } from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Row } from "@/lib/api";
import {
  PAYMENT_METHODS,
  refundableOf,
  refundApprovalLimit,
  useRefundApprovers,
  useRefundPayment,
} from "@/lib/billing";
import { fmtDateTime, fmtMoney, titleize } from "@/lib/format";

/**
 * Reverses one specific payment. Every refund is linked to the original
 * payment; the database re-checks the refundable limit and approval rule.
 */
export function RefundDialog({ invoiceId, payment, payments }: { invoiceId: string; payment: Row; payments: Row[] }) {
  const [open, setOpen] = useState(false);
  const refundable = refundableOf(payment, payments);
  const limit = refundApprovalLimit();
  const refund = useRefundPayment(invoiceId);
  const approvers = useRefundApprovers();

  const [amount, setAmount] = useState(String(refundable));
  const [method, setMethod] = useState(String(payment["method"] ?? "cash"));
  const [reason, setReason] = useState("");
  const [approver, setApprover] = useState("");
  const [notes, setNotes] = useState("");

  const value = Number(amount || 0);
  const needsApproval = limit > 0 && value > limit;
  const invalid = value <= 0 || value > refundable || !reason.trim() || (needsApproval && !approver);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setAmount(String(refundable));
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={refundable <= 0}>
          Refund
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>
            Reversing {fmtMoney(payment["amount"])} collected by {titleize(String(payment["method"]))} on{" "}
            {fmtDateTime(String(payment["paid_at"]))}. Refundable remaining {fmtMoney(refundable)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Refund amount</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {value > refundable ? (
              <p className="text-xs text-destructive">Cannot exceed {fmtMoney(refundable)}.</p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {titleize(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this refunded?" />
          </div>
          {needsApproval ? (
            <div className="grid gap-1.5">
              <Label>Approver (required above {fmtMoney(limit)})</Label>
              <Select value={approver} onValueChange={setApprover}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an administrator" />
                </SelectTrigger>
                <SelectContent>
                  {(approvers.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={invalid || refund.isPending}
            onClick={() =>
              refund.mutate(
                {
                  original_payment_id: String(payment["id"]),
                  amount: value,
                  method,
                  reason: reason.trim(),
                  approved_by: needsApproval ? approver : null,
                  notes: notes.trim() || null,
                },
                {
                  onSuccess: () => {
                    setOpen(false);
                    setReason("");
                    setNotes("");
                    setApprover("");
                  },
                },
              )
            }
          >
            Record refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
