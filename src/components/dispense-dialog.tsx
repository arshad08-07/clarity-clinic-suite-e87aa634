import { type ReactNode, useEffect, useMemo, useState } from "react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { type Row } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/format";
import { isExpired, useDispenseMedicine, useMedicines, useProductBatches } from "@/lib/pharmacy";

/**
 * Pharmacist workflow: prescribed drug -> catalog medicine -> batch -> quantity.
 * Expired batches and short stock are blocked here and again in the database.
 */
export function DispenseDialog({
  trigger,
  patientId,
  visitId,
  branchId,
  prescriptionId,
  prescriptionItem,
  onDone,
}: {
  trigger: ReactNode;
  patientId: string;
  visitId?: string | null;
  branchId?: string | null;
  prescriptionId?: string | null;
  prescriptionItem?: Row | null;
  onDone?: (invoiceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  const { profile } = useAuth();
  const medicines = useMedicines(open);
  const batches = useProductBatches(productId);
  const dispense = useDispenseMedicine();

  const drugName = String(prescriptionItem?.["drug_name"] ?? "");

  // Pre-select the catalog medicine that matches the prescribed drug name.
  useEffect(() => {
    if (!open || productId || !drugName) return;
    const list = medicines.data ?? [];
    const term = drugName.toLowerCase();
    const hit =
      list.find((m) => String(m["name"]).toLowerCase() === term) ??
      list.find((m) => String(m["name"]).toLowerCase().includes(term.split(" ")[0] ?? term));
    if (hit) setProductId(String(hit["id"]));
  }, [open, drugName, medicines.data, productId]);

  const product = useMemo(
    () => (medicines.data ?? []).find((m) => String(m["id"]) === productId) ?? null,
    [medicines.data, productId],
  );
  const batch = useMemo(
    () => (batches.data ?? []).find((b) => String(b["id"]) === batchId) ?? null,
    [batches.data, batchId],
  );

  useEffect(() => {
    if (product) setPrice(String(product["selling_price"] ?? ""));
    setBatchId("");
  }, [product]);

  const quantity = Number(qty || 0);
  const unitPrice = Number(price || 0);
  const taxPercent = Number(product?.["tax_percent"] ?? 0);
  const total = quantity * unitPrice * (1 + taxPercent / 100);

  let blocker: string | null = null;
  if (!product) blocker = "Select a medicine";
  else if (!batch) blocker = "Select a batch";
  else if (isExpired(batch)) blocker = "This batch is expired — pick another batch";
  else if (Number(batch["quantity"] ?? 0) < quantity) blocker = "Not enough quantity in this batch";
  else if (Number(product["stock_qty"] ?? 0) < quantity) blocker = "Not enough stock for this medicine";
  else if (!quantity || quantity <= 0) blocker = "Enter a quantity";

  const submit = () => {
    if (blocker || !product || !batch) return;
    dispense.mutate(
      {
        patient_id: patientId,
        visit_id: visitId ?? null,
        branch_id: branchId ?? profile?.branch_id ?? null,
        prescription_id: prescriptionId ?? null,
        prescription_item_id: prescriptionItem ? String(prescriptionItem["id"]) : null,
        product,
        batch,
        quantity,
        unit_price: unitPrice,
        tax_percent: taxPercent,
        dispensed_by: profile?.id ?? null,
        notes: notes || null,
      },
      {
        onSuccess: ({ invoice }) => {
          setOpen(false);
          setNotes("");
          setQty("1");
          onDone?.(String(invoice["id"]));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dispense medicine</DialogTitle>
          <DialogDescription>
            {drugName ? `Prescribed: ${drugName}` : "Over-the-counter sale"} · stock and billing update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Medicine</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select from pharmacy catalog" />
              </SelectTrigger>
              <SelectContent>
                {(medicines.data ?? []).map((m) => (
                  <SelectItem key={String(m["id"])} value={String(m["id"])}>
                    {String(m["name"])} · {String(m["sku"])} · stock {String(m["stock_qty"])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Batch</Label>
            <Select value={batchId} onValueChange={setBatchId} disabled={!productId}>
              <SelectTrigger>
                <SelectValue placeholder={productId ? "Select batch" : "Select a medicine first"} />
              </SelectTrigger>
              <SelectContent>
                {(batches.data ?? []).map((b) => {
                  const expired = isExpired(b);
                  return (
                    <SelectItem key={String(b["id"])} value={String(b["id"])} disabled={expired}>
                      {String(b["batch_no"])} · qty {String(b["quantity"])} ·{" "}
                      {b["expiry_date"] ? `exp ${fmtDate(String(b["expiry_date"]))}` : "no expiry"}
                      {expired ? " · EXPIRED" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {productId && batches.data?.length === 0 && (
              <p className="text-xs text-destructive">No batches recorded for this medicine.</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Quantity</Label>
              <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Unit price</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Tax</Label>
              <Input value={`${taxPercent}%`} readOnly />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3 text-sm">
            <span className="text-muted-foreground">Line total</span>
            <span className="font-medium">{fmtMoney(total)}</span>
          </div>

          {blocker && <Badge variant="secondary">{blocker}</Badge>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!!blocker || dispense.isPending}>
            {dispense.isPending ? "Dispensing…" : "Dispense & bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
