import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ResourceModule } from "@/components/resource-module";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLookup, type Row } from "@/lib/api";
import { procurementConfig } from "@/lib/module-configs";
import { useCreatePurchaseOrder } from "@/lib/procurement";

export const Route = createFileRoute("/_authenticated/procurement")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — Vision Care HMS" },
      {
        name: "description",
        content: "Raise purchase orders, receive goods with batch and expiry, and track supplier payables.",
      },
      { property: "og:title", content: "Purchase Orders — Vision Care HMS" },
      {
        property: "og:description",
        content: "Raise purchase orders, receive goods with batch and expiry, and track supplier payables.",
      },
    ],
  }),
  component: ProcurementPage,
});

function NewPurchaseOrderDialog() {
  const navigate = useNavigate();
  const create = useCreatePurchaseOrder();
  const suppliers = useLookup("suppliers", "id, name", { filters: { is_active: true }, orderBy: "name" });
  const branches = useLookup("branches", "id, name", { orderBy: "name" });
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>New purchase order</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
            <DialogDescription>The PO number is generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers.data ?? []).map((s: Row) => (
                    <SelectItem key={String(s["id"])} value={String(s["id"])}>
                      {String(s["name"])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {(branches.data ?? []).map((b: Row) => (
                    <SelectItem key={String(b["id"])} value={String(b["id"])}>
                      {String(b["name"])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expected date</Label>
              <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!supplierId || create.isPending}
              onClick={() =>
                create.mutate(
                  {
                    supplier_id: supplierId,
                    branch_id: branchId || null,
                    expected_date: expected || null,
                    notes: notes || null,
                  },
                  {
                    onSuccess: (po) => {
                      setOpen(false);
                      void navigate({ to: "/purchase-order/$poId", params: { poId: String(po["id"]) } });
                    },
                  },
                )
              }
            >
              Create & add items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProcurementPage() {
  return (
    <ResourceModule
      config={{
        ...procurementConfig,
        readOnly: true,
        extraHeaderActions: <NewPurchaseOrderDialog />,
        rowActions: (row: Row) => (
          <Button size="sm" variant="outline" asChild>
            <Link to="/purchase-order/$poId" params={{ poId: String(row["id"]) }}>
              Open
            </Link>
          </Button>
        ),
      }}
    />
  );
}
