import type { AppRole } from "@/hooks/use-auth";

/** Tables that carry their own branch_id and must be written into an authorised branch. */
export const BRANCH_SCOPED_TABLES = new Set([
  "patients",
  "appointments",
  "visits",
  "invoices",
  "surgeries",
  "optical_orders",
  "pharmacy_sales",
  "product_batches",
  "stock_movements",
  "iol_inventory",
  "ot_rooms",
  "equipment",
  "leads",
  "expenses",
  "purchase_orders",
  "goods_receipts",
]);

/**
 * Lightweight session mirror so non-React helpers (api writes) can stamp the
 * caller's branch. The database remains the source of truth — this only makes
 * the UI write valid rows in the first place.
 */
interface SessionContext {
  userId: string | null;
  roles: AppRole[];
  primaryBranchId: string | null;
  branchIds: string[];
  isSuperAdmin: boolean;
}

let current: SessionContext = {
  userId: null,
  roles: [],
  primaryBranchId: null,
  branchIds: [],
  isSuperAdmin: false,
};

export function setSessionContext(next: SessionContext) {
  current = next;
}

export function getSessionContext(): SessionContext {
  return current;
}

/** Branch to stamp on new records when the form did not choose one. */
export function defaultBranchId(): string | null {
  return current.primaryBranchId ?? (current.branchIds.length === 1 ? current.branchIds[0]! : null);
}

export function canAccessBranch(branchId: string | null | undefined): boolean {
  if (current.isSuperAdmin) return true;
  if (!branchId) return false;
  return current.branchIds.includes(branchId);
}
