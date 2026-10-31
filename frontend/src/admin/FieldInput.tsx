import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { ROLE_LABELS } from "./AdminLayout";
import { ICON_OPTIONS, type FieldDef } from "./resources";

export type FileState = { file?: File; clear?: boolean };

type Props = {
  field: FieldDef;
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
  file?: FileState;
  onFile: (state: FileState) => void;
  error?: string;
  dir?: "ltr" | "rtl";
};

function useOptions(resource?: string, labelKey = "title") {
  return useQuery({
    queryKey: ["admin", "options", resource],
    queryFn: () => api<Paginated<Record<string, unknown>>>(`/admin/${resource}/?page_size=100`),
    enabled: !!resource,
    select: (d) => d.results.map((r) => ({ value: String(r.id), label: String(r[labelKey] ?? r.id) })),
    staleTime: 60_000,
  });
}

function toLocalInput(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FieldInput({ field, name, value, onChange, file, onFile, error, dir }: Props) {
  const id = `f-${name}`;
  const options = useOptions(field.type === "fk" || field.type === "m2m" ? field.resource : undefined, field.optionLabel);
  const roles = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => api<{ value: string; label: string }[]>("/admin/roles/"),
    enabled: field.type === "roles",
  });
  const describedBy = error ? `${id}-error` : field.help ? `${id}-help` : undefined;
  const common = { id, name, "aria-invalid": !!error, "aria-describedby": describedBy, className: "input", dir };

  let input: ReactNode;
  switch (field.type) {
    case "textarea":
      input = <textarea {...common} rows={field.full ? 8 : 4} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} required={field.required} />;
      break;
    case "number":
      input = <input {...common} type="number" step="any" value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)} required={field.required} dir="ltr" />;
      break;
    case "boolean":
      return (
        <label className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--brand-primary)]" />
          {field.label}
        </label>
      );
    case "date":
      input = <input {...common} type="date" value={String(value ?? "").slice(0, 10)} onChange={(e) => onChange(e.target.value || null)} required={field.required} />;
      break;
    case "datetime":
      input = <input {...common} type="datetime-local" value={toLocalInput(value)} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} required={field.required} />;
      break;
    case "select":
      input = (
        <select {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} required={field.required}>
          <option value="">—</option>
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case "icon":
      input = (
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={String(value ?? "")} /></span>
          <select {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      );
      break;
    case "fk":
      input = (
        <select {...common} value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value || null)} required={field.required}>
          <option value="">—</option>
          {options.data?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case "m2m":
    case "roles": {
      const list = (field.type === "roles" ? roles.data : options.data) ?? [];
      const selected = new Set(((value as unknown[]) ?? []).map(String));
      input = (
        <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-white p-3">
          {list.length === 0 && <span className="text-sm text-muted">—</span>}
          {list.map((o) => (
            <label key={o.value} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${selected.has(o.value) ? "border-primary bg-primary-soft text-primary" : "border-line"}`}>
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.has(o.value)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(o.value);
                  else next.delete(o.value);
                  onChange([...next]);
                }}
              />
              {field.type === "roles" ? ROLE_LABELS[o.value] ?? o.label : o.label}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "image":
    case "file": {
      const current = typeof value === "string" && value && !file?.clear ? value : null;
      input = (
        <div className="space-y-2 rounded-xl border border-line bg-white p-3">
          {current && (
            <div className="flex items-center gap-3">
              {field.type === "image" ? (
                <img src={current} alt="" className="h-16 w-24 rounded-lg object-cover" />
              ) : (
                <a href={current} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">الملف الحالي</a>
              )}
              {!field.required && (
                <button type="button" className="text-sm text-red-600 hover:underline" onClick={() => onFile({ clear: true })}>إزالة</button>
              )}
            </div>
          )}
          {file?.file && field.type === "image" && (
            <img src={URL.createObjectURL(file.file)} alt="" className="h-16 w-24 rounded-lg object-cover" />
          )}
          <input
            id={id}
            type="file"
            accept={field.type === "image" ? ".jpg,.jpeg,.png,.webp" : ".pdf,.docx,.xlsx,.pptx"}
            onChange={(e) => onFile({ file: e.target.files?.[0] })}
            className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-primary"
          />
        </div>
      );
      break;
    }
    case "json":
      input = (
        <textarea
          {...common}
          dir="ltr"
          rows={6}
          className="input font-mono text-xs"
          value={typeof value === "string" ? value : JSON.stringify(value ?? [], null, 2)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "color":
      input = (
        <div className="flex items-center gap-3">
          <input type="color" value={String(value || "#000000")} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 cursor-pointer rounded-lg border border-line" aria-label={field.label} />
          <input {...common} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} dir="ltr" pattern="^#[0-9a-fA-F]{6}$" />
        </div>
      );
      break;
    case "password":
      input = <input {...common} type="password" autoComplete="new-password" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
      break;
    default: {
      const type = field.type === "url" ? "url" : field.type === "email" ? "email" : "text";
      const ltr = ["url", "email", "slug"].includes(field.type);
      input = <input {...common} type={type} dir={ltr ? "ltr" : dir} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    }
  }

  return (
    <div>
      <label htmlFor={id} className="label">
        {field.label}{dir === "ltr" && field.type !== "url" ? " (English)" : ""} {field.required && dir !== "ltr" && <span className="text-red-600">*</span>}
      </label>
      {input}
      {field.help && !error && <p id={`${id}-help`} className="mt-1 text-xs text-muted">{field.help}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
