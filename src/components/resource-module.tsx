import { useQueries } from "@tanstack/react-query";
import {
  Download,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { db, errorMessage, useDeleteRow, useList, useSaveRow, type Row } from "@/lib/api";
import { downloadCsv, fmtDate, fmtDateTime, fmtMoney, titleize, toCsv } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "select"
  | "boolean"
  | "ref";

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  refTable?: string;
  refSelect?: string;
  refLabel?: (row: Row) => string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  section?: string;
  full?: boolean;
  inTable?: boolean;
  inForm?: boolean;
  defaultValue?: unknown;
  render?: (row: Row) => ReactNode;
}

export interface ResourceConfig {
  table: string;
  title: string;
  singular: string;
  description?: string;
  searchFields?: string[];
  fields: FieldDef[];
  orderBy?: string;
  ascending?: boolean;
  filters?: FieldDef[];
  dateField?: string;
  pageSize?: number;
  readOnly?: boolean;
  rowActions?: (row: Row) => ReactNode;
  extraHeaderActions?: ReactNode;
  /** Replaces the generic "New <singular>" button with a purpose-built flow. */
  createAction?: ReactNode;
  beforeSave?: (values: Row) => Row | Promise<Row>;
}

function useRefOptions(fields: FieldDef[]) {
  const refFields = fields.filter((f) => f.type === "ref" && f.refTable);
  const results = useQueries({
    queries: refFields.map((f) => ({
      queryKey: ["refopts", f.refTable, f.refSelect],
      staleTime: 60_000,
      queryFn: async () => {
        const { data, error } = await db
          .from(f.refTable!)
          .select(f.refSelect ?? "id, name")
          .limit(500);
        if (error) throw error;
        return (data ?? []) as Row[];
      },
    })),
  });

  return useMemo(() => {
    const map: Record<string, { value: string; label: string }[]> = {};
    refFields.forEach((f, i) => {
      const rows = (results[i]?.data ?? []) as Row[];
      map[f.name] = rows.map((r) => ({
        value: String(r["id"]),
        label: f.refLabel ? f.refLabel(r) : String(r["name"] ?? r["title"] ?? r["id"]),
      }));
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(results.map((r) => r.data?.length)), fields]);
}

export function formatCell(field: FieldDef, row: Row, refOptions: Record<string, { value: string; label: string }[]>) {
  if (field.render) return field.render(row);
  const value = row[field.name];
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  switch (field.type) {
    case "money":
      return fmtMoney(value as number);
    case "date":
      return fmtDate(value as string);
    case "datetime":
      return fmtDateTime(value as string);
    case "boolean":
      return (
        <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
      );
    case "select":
      return <Badge variant="secondary">{titleize(String(value))}</Badge>;
    case "ref": {
      const opt = refOptions[field.name]?.find((o) => o.value === String(value));
      return opt?.label ?? <span className="text-muted-foreground">—</span>;
    }
    default:
      return String(value);
  }
}

export function ResourceModule({ config }: { config: ResourceConfig }) {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const pageSize = config.pageSize ?? 15;
  const tableFields = config.fields.filter((f) => f.inTable !== false);
  const formFields = config.fields.filter((f) => f.inForm !== false);
  const refOptions = useRefOptions([...config.fields, ...(config.filters ?? [])]);

  const query = useList({
    table: config.table,
    searchFields: config.searchFields ?? [],
    search,
    filters: filterValues,
    dateField: config.dateField,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    orderBy: config.orderBy ?? "created_at",
    ascending: config.ascending ?? false,
    page,
    pageSize,
  });

  const save = useSaveRow(config.table, config.singular);
  const remove = useDeleteRow(config.table, config.singular);

  const rows = query.data?.rows ?? [];
  const total = query.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const hasActiveFilters =
    !!search || !!dateFrom || !!dateTo || Object.values(filterValues).some((v) => v && v !== "all");

  function resetFilters() {
    setSearch("");
    setFilterValues({});
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function exportCsv() {
    const columns = tableFields.map((f) => ({ key: f.name, label: f.label }));
    downloadCsv(`${config.table}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows, columns));
  }

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <>
            {config.extraHeaderActions}
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="size-4" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            {!config.readOnly ? (
              <Button size="sm" onClick={() => setEditing({})}>
                <Plus className="size-4" /> New {config.singular}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="surface-card print-area">
        <div className="flex flex-col gap-3 border-b p-4 no-print lg:flex-row lg:flex-wrap lg:items-center">
          {config.searchFields?.length ? (
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                placeholder={`Search ${config.title.toLowerCase()}…`}
                className="pl-9"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          ) : null}

          {(config.filters ?? []).map((f) => (
            <Select
              key={f.name}
              value={filterValues[f.name] ?? "all"}
              onValueChange={(v) => {
                setFilterValues((prev) => ({ ...prev, [f.name]: v }));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {f.label}</SelectItem>
                {(f.type === "ref" ? (refOptions[f.name] ?? []) : (f.options ?? [])).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {config.dateField ? (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                className="w-[150px]"
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                className="w-[150px]"
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          ) : null}

          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="size-4" /> Clear
            </Button>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {tableFields.map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                <TableHead className="w-[280px] text-right no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {tableFields.map((f) => (
                      <TableCell key={f.name}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))}
                    <TableCell />
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={tableFields.length + 1} className="py-10 text-center text-destructive">
                    {errorMessage(query.error)}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={tableFields.length + 1}>
                    <EmptyState
                      title={hasActiveFilters ? "No matching records" : `No ${config.title.toLowerCase()} yet`}
                      description={
                        hasActiveFilters
                          ? "Try adjusting your search or filters."
                          : `Create your first ${config.singular.toLowerCase()} to get started.`
                      }
                      action={
                        !config.readOnly && !hasActiveFilters ? (
                          <Button size="sm" onClick={() => setEditing({})}>
                            <Plus className="size-4" /> New {config.singular}
                          </Button>
                        ) : null
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={String(row["id"])}>
                    {tableFields.map((f) => (
                      <TableCell key={f.name} className="align-top">
                        {formatCell(f, row, refOptions)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right no-print">
                      <div className="flex justify-end gap-1">
                        {config.rowActions?.(row)}
                        {!config.readOnly ? (
                          <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
                            <Pencil className="size-4" />
                          </Button>
                        ) : null}
                        {!config.readOnly && isAdmin ? (
                          <Button variant="ghost" size="icon" onClick={() => setDeleting(row)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t p-4 text-sm sm:flex-row no-print">
          <p className="text-muted-foreground">
            {total === 0 ? "0 records" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <RecordDialog
        open={!!editing}
        config={config}
        fields={formFields}
        refOptions={refOptions}
        record={editing}
        saving={save.isPending}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          const payload = config.beforeSave ? await config.beforeSave(values) : values;
          await save.mutateAsync(payload);
          setEditing(null);
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {config.singular.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the record and any linked child records. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove.mutate(String(deleting["id"]));
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function RecordDialog({
  open,
  config,
  fields,
  refOptions,
  record,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  config: ResourceConfig;
  fields: FieldDef[];
  refOptions: Record<string, { value: string; label: string }[]>;
  record: Row | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: Row) => Promise<void>;
}) {
  const [values, setValues] = useState<Row>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialised, setInitialised] = useState<Row | null>(null);

  if (open && initialised !== record) {
    const base: Row = {};
    for (const f of fields) {
      const existing = record?.[f.name];
      base[f.name] =
        existing ?? (record && Object.keys(record).length ? null : (f.defaultValue ?? null));
      if (f.type === "datetime" && typeof base[f.name] === "string") {
        base[f.name] = String(base[f.name]).slice(0, 16);
      }
    }
    if (record?.["id"]) base["id"] = record["id"];
    setValues(base);
    setErrors({});
    setInitialised(record);
  }

  const sections = useMemo(() => {
    const grouped = new Map<string, FieldDef[]>();
    for (const f of fields) {
      const key = f.section ?? "";
      grouped.set(key, [...(grouped.get(key) ?? []), f]);
    }
    return [...grouped.entries()];
  }, [fields]);

  function setValue(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    for (const f of fields) {
      if (f.required) {
        const v = values[f.name];
        if (v === null || v === undefined || v === "") nextErrors[f.name] = `${f.label} is required`;
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const payload: Row = { ...values };
    for (const f of fields) {
      if (f.type === "datetime" && payload[f.name]) {
        payload[f.name] = new Date(String(payload[f.name])).toISOString();
      }
      if ((f.type === "number" || f.type === "money") && payload[f.name] !== null && payload[f.name] !== "") {
        payload[f.name] = Number(payload[f.name]);
      }
    }
    await onSubmit(payload);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setInitialised(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {record?.["id"] ? `Edit ${config.singular}` : `New ${config.singular}`}
          </DialogTitle>
          <DialogDescription>
            All fields marked required must be completed before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {sections.map(([section, sectionFields]) => (
            <div key={section}>
              {section ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {sectionFields.map((f) => (
                  <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Label htmlFor={f.name} className="mb-1.5 block">
                      {f.label}
                      {f.required ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    <FieldInput
                      field={f}
                      value={values[f.name]}
                      options={f.type === "ref" ? (refOptions[f.name] ?? []) : (f.options ?? [])}
                      onChange={(v) => setValue(f.name, v)}
                    />
                    {f.help ? <p className="mt-1 text-xs text-muted-foreground">{f.help}</p> : null}
                    {errors[f.name] ? (
                      <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? "Saving…" : `Save ${config.singular}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FieldInput({
  field,
  value,
  options,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  options: { value: string; label: string }[];
  onChange: (value: unknown) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <Textarea
          id={field.name}
          rows={3}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "boolean":
      return (
        <div className="flex h-9 items-center gap-2">
          <Checkbox
            id={field.name}
            checked={!!value}
            onCheckedChange={(c) => onChange(c === true)}
          />
          <span className="text-sm text-muted-foreground">{field.placeholder ?? "Enabled"}</span>
        </div>
      );
    case "select":
    case "ref":
      return (
        <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={field.name}>
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "number":
    case "money":
      return (
        <Input
          id={field.name}
          type="number"
          step="any"
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        />
      );
    case "date":
      return (
        <Input
          id={field.name}
          type="date"
          value={value ? String(value).slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "datetime":
      return (
        <Input
          id={field.name}
          type="datetime-local"
          value={value ? String(value).slice(0, 16) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    default:
      return (
        <Input
          id={field.name}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
