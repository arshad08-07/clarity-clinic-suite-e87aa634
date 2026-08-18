import { format, parseISO } from "date-fns";

export function fmtDate(value?: string | null) {
  if (!value) return "—";
  try {
    return format(typeof value === "string" ? parseISO(value) : value, "dd MMM yyyy");
  } catch {
    return String(value);
  }
}

export function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy, h:mm a");
  } catch {
    return String(value);
  }
}

export function fmtTime(value?: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "h:mm a");
  } catch {
    return String(value);
  }
}

let moneyCurrency = "INR";
let moneyLocale = "en-IN";

/** Set from clinic billing settings so every amount uses the configured currency. */
export function setMoneyFormat(currency?: string | null, locale?: string | null) {
  moneyCurrency = currency?.trim() || "INR";
  moneyLocale = locale?.trim() || "en-IN";
}

export function fmtMoney(value?: number | string | null) {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat(moneyLocale, {
      style: "currency",
      currency: moneyCurrency,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `${moneyCurrency} ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
  }
}


export function titleize(value?: string | null) {
  if (!value) return "—";
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function age(dob?: string | null) {
  if (!dob) return "—";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  return `${Math.floor(diff / 31557600000)} yrs`;
}

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
