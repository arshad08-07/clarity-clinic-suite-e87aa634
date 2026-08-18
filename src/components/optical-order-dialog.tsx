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
import { useAuth } from "@/hooks/use-auth";
import { type Row } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { rxSummary, useCreateOpticalOrder, useOpticalProducts } from "@/lib/optical";

const LENS_INDEXES = ["1.50", "1.56", "1.60", "1.67", "1.74"];
const COATINGS = ["Uncoated", "Anti-reflective", "Blue cut", "Photochromic", "Anti-reflective + Blue cut"];

function ProductPicker({
  label,
  category,
  value,
  onChange,
  qty,
}: {
  label: string;
  category: "frame" | "lens" | "contact_lens";
  value: Row | null;
  onChange: (p: Row | null) => void;
  qty: number;
}) {
  const products = useOpticalProducts(category);
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select
        value={value ? String(value["id"]) : "none"}
        onValueChange={(v) => onChange(v === "none" ? null : ((products.data ?? []).find((p) => String(p["id"]) === v) ?? null))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not required</SelectItem>
          {(products.data ?? []).map((p) => {
            const stock = Number(p["stock_qty"] ?? 0);
            return (
              <SelectItem key={String(p["id"])} value={String(p["id"])} disabled={stock < qty}>
                {String(p["name"])} · {fmtMoney(p["selling_price"])} · {stock} in stock
                {stock < qty ? " (unavailable)" : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Places an optical order directly from a patient's optical prescription. */
export function OpticalOrderDialog({
  rx,
  patientId,
  visitId,
  branchId,
  trigger,
}: {
  rx: Row;
  patientId: string;
  visitId?: string | null;
  branchId?: string | null;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState<Row | null>(null);
  const [lensOd, setLensOd] = useState<Row | null>(null);
  const [lensOs, setLensOs] = useState<Row | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [lensIndex, setLensIndex] = useState(LENS_INDEXES[1] ?? "1.56");
  const [coating, setCoating] = useState(String(rx["coating"] ?? COATINGS[1] ?? ""));
  const [discount, setDiscount] = useState("0");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const create = useCreateOpticalOrder();
  const { profile } = useAuth();

  const gross =
    (Number(frame?.["selling_price"] ?? 0) +
      Number(lensOd?.["selling_price"] ?? 0) +
      Number(lensOs?.["selling_price"] ?? 0)) *
    quantity;
  const net = Math.max(gross - Number(discount || 0), 0);
  const isContact = String(rx["type"] ?? "") === "contact_lens";
  const lensCategory = isContact ? "contact_lens" : "lens";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Create optical order</Button>}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New optical order</DialogTitle>
          <DialogDescription>{rxSummary(rx)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProductPicker label="Frame" category="frame" value={frame} onChange={setFrame} qty={quantity} />
          <div className="grid gap-1.5">
            <Label htmlFor="opt-qty">Quantity (pairs)</Label>
            <Input
              id="opt-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
            />
          </div>
          <ProductPicker
            label={isContact ? "Right contact lens (OD)" : "Right lens (OD)"}
            category={lensCategory}
            value={lensOd}
            onChange={setLensOd}
            qty={quantity}
          />
          <ProductPicker
            label={isContact ? "Left contact lens (OS)" : "Left lens (OS)"}
            category={lensCategory}
            value={lensOs}
            onChange={setLensOs}
            qty={quantity}
          />
          <div className="grid gap-1.5">
            <Label>Lens index</Label>
            <Select value={lensIndex} onValueChange={setLensIndex}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENS_INDEXES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Coating</Label>
            <Select value={coating} onValueChange={setCoating}>
              <SelectTrigger>
                <SelectValue placeholder="Select coating" />
              </SelectTrigger>
              <SelectContent>
                {COATINGS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="opt-disc">Discount (₹)</Label>
            <Input id="opt-disc" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="opt-del">Promised delivery</Label>
            <Input id="opt-del" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="opt-notes">Notes</Label>
          <Textarea id="opt-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <p className="text-sm">
          Order value <strong>{fmtMoney(net)}</strong>
          {Number(discount || 0) > 0 ? ` (gross ${fmtMoney(gross)})` : ""}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={create.isPending || (!frame && !lensOd && !lensOs)}
            onClick={() =>
              create.mutate(
                {
                  patient_id: patientId,
                  optical_prescription_id: String(rx["id"]),
                  visit_id: visitId ?? (rx["visit_id"] ? String(rx["visit_id"]) : null),
                  branch_id: branchId ?? null,
                  frame,
                  lens_od: lensOd,
                  lens_os: lensOs,
                  quantity,
                  brand: (frame?.["brand"] as string | null) ?? null,
                  lens_index: lensIndex,
                  coating,
                  discount: Number(discount || 0),
                  delivery_date: deliveryDate || null,
                  notes: notes || null,
                  created_by: profile?.id ?? null,
                },
                { onSuccess: () => setOpen(false) },
              )
            }
          >
            Place order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
