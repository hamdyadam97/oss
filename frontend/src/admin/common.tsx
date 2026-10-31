import { ShieldAlert } from "lucide-react";

import type { ColumnDef } from "./resources";

export function Forbidden() {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <ShieldAlert className="size-10 text-red-500" aria-hidden="true" />
      <h1 className="text-lg font-bold">لا تملك صلاحية الوصول</h1>
      <p className="text-sm text-muted">تواصل مع مدير النظام لمنحك الصلاحية المناسبة.</p>
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  new: "bg-sky-50 text-sky-700",
  under_review: "bg-amber-50 text-amber-700",
  interview: "bg-amber-50 text-amber-700",
  in_progress: "bg-amber-50 text-amber-700",
  needs_info: "bg-orange-50 text-orange-700",
  approved: "bg-emerald-50 text-emerald-700",
  accepted: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-700",
  rejected: "bg-red-50 text-red-700",
  declined: "bg-red-50 text-red-700",
};

export function Badge({ value, label }: { value: string; label: string }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONES[value] ?? "bg-sand text-ink"}`}>{label}</span>;
}

const dateFmt = new Intl.DateTimeFormat("ar-JO-u-nu-latn", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("ar-JO-u-nu-latn", { dateStyle: "medium", timeStyle: "short" });

export const fmtDate = (v: unknown, time = false) => {
  if (!v) return "—";
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? String(v) : (time ? dateTimeFmt : dateFmt).format(d);
};

export function Cell({ col, value }: { col: ColumnDef; value: unknown }) {
  switch (col.type) {
    case "image":
      return value ? <img src={String(value)} alt="" className="h-10 w-14 rounded-md object-cover" /> : <span className="block h-10 w-14 rounded-md bg-sand" />;
    case "boolean":
      return value ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">●</span>;
    case "date":
      return <>{fmtDate(value)}</>;
    case "datetime":
      return <>{fmtDate(value, true)}</>;
    case "choice": {
      const opt = col.options?.find((o) => o.value === value);
      return <Badge value={String(value)} label={opt?.label ?? String(value ?? "—")} />;
    }
    default:
      if (Array.isArray(value)) return <>{value.join("، ") || "—"}</>;
      return <>{value === null || value === undefined || value === "" ? "—" : String(value)}</>;
  }
}
