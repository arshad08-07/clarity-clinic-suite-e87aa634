import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { BRANCH_SCOPED_TABLES, defaultBranchId } from "@/lib/access";


/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

/** Untyped table accessor: the app addresses tables dynamically by name. */
export const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Row) => any;
};

export interface ListParams {
  table: string;
  select?: string;
  search?: string;
  searchFields?: string[];
  filters?: Record<string, unknown>;
  dateField?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  orderBy?: string | undefined;
  ascending?: boolean;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}

export function listKey(p: ListParams) {
  return [
    "list",
    p.table,
    p.select,
    p.search,
    p.filters,
    p.dateFrom,
    p.dateTo,
    p.orderBy,
    p.ascending,
    p.page,
    p.pageSize,
  ];
}

export async function fetchList(p: ListParams): Promise<{ rows: Row[]; count: number }> {
  const page = p.page ?? 1;
  const pageSize = p.pageSize ?? 20;
  let q = db.from(p.table).select(p.select ?? "*", { count: "exact" });

  if (p.search && p.searchFields?.length) {
    const term = p.search.replace(/[,%]/g, " ").trim();
    if (term) q = q.or(p.searchFields.map((f) => `${f}.ilike.%${term}%`).join(","));
  }
  for (const [k, v] of Object.entries(p.filters ?? {})) {
    if (v === undefined || v === null || v === "" || v === "all") continue;
    q = q.eq(k, v);
  }
  if (p.dateField && p.dateFrom) q = q.gte(p.dateField, p.dateFrom);
  if (p.dateField && p.dateTo) q = q.lte(p.dateField, p.dateTo);

  q = q.order(p.orderBy ?? "created_at", { ascending: p.ascending ?? false });
  q = q.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as Row[], count: count ?? 0 };
}

export function useList(p: ListParams) {
  return useQuery({
    queryKey: listKey(p),
    queryFn: () => fetchList(p),
    enabled: p.enabled ?? true,
  });
}

/** Small lookup fetch used for reference selects and dashboard widgets. */
export function useLookup(
  table: string,
  select = "*",
  opts: { filters?: Record<string, unknown>; orderBy?: string; limit?: number; enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["lookup", table, select, opts.filters, opts.orderBy, opts.limit],
    enabled: opts.enabled ?? true,
    queryFn: async () => {
      let q = db.from(table).select(select);
      for (const [k, v] of Object.entries(opts.filters ?? {})) {
        if (v === undefined || v === null || v === "") continue;
        q = q.eq(k, v);
      }
      if (opts.orderBy) q = q.order(opts.orderBy, { ascending: true });
      q = q.limit(opts.limit ?? 500);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useCount(
  table: string,
  opts: { filters?: Record<string, unknown>; gte?: [string, string]; lte?: [string, string] } = {},
) {
  return useQuery({
    queryKey: ["count", table, opts],
    queryFn: async () => {
      let q = db.from(table).select("id", { count: "exact", head: true });
      for (const [k, v] of Object.entries(opts.filters ?? {})) q = q.eq(k, v);
      if (opts.gte) q = q.gte(opts.gte[0], opts.gte[1]);
      if (opts.lte) q = q.lte(opts.lte[0], opts.lte[1]);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/**
 * Audit trail is written by database triggers (audit_row_change) on every
 * sensitive table, so it cannot be bypassed by skipping the UI. No client-side
 * audit write happens here — that would only duplicate rows.
 */


export function useSaveRow(table: string, label = "Record") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { id, ...rest } = values;
      const payload = Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, v === "" ? null : v]),
      );
      if (id) {
        const { data, error } = await db.from(table).update(payload).eq("id", id).select().single();
        if (error) throw error;
        return data as Row;
      }
      if (BRANCH_SCOPED_TABLES.has(table) && !payload["branch_id"]) {
        const branch = defaultBranchId();
        if (branch) payload["branch_id"] = branch;
      }
      const { data, error } = await db.from(table).insert(payload).select().single();

      if (error) throw error;
      return data as Row;
    },
    onSuccess: () => {
      toast.success(`${label} saved`);
      void qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
}

export function useDeleteRow(table: string, label = "Record") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${label} deleted`);
      void qc.invalidateQueries();
    },
    onError: (e: unknown) => toast.error(errorMessage(e)),
  });
}

export function errorMessage(e: unknown): string {
  if (typeof e === "object" && e !== null) {
    const err = e as { message?: string; details?: string; hint?: string };
    return err.message ?? err.details ?? err.hint ?? "Something went wrong";
  }
  return "Something went wrong";
}
