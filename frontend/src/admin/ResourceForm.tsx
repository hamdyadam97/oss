import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Save, Trash2 } from "lucide-react";

import { Loading } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "./auth";
import { FieldInput, type FileState } from "./FieldInput";
import { ChildManager } from "./ChildManager";
import { perm, resourceByKey, type FieldDef, type ResourceDef } from "./resources";
import { Forbidden } from "./common";

type Values = Record<string, unknown>;

/** Serialises dashboard values as multipart so uploads and data travel together. */
export function buildFormData(fields: FieldDef[], values: Values, files: Record<string, FileState>, extra: Values = {}) {
  const fd = new FormData();
  const names = fields.flatMap((f) => (f.en ? [f, { ...f, name: `${f.name}_en`, required: false }] : [f]));
  for (const f of names) {
    if (f.type === "image" || f.type === "file") {
      const state = files[f.name];
      if (state?.file) fd.append(f.name, state.file);
      else if (state?.clear) fd.append(`${f.name}__clear`, "1");
      continue;
    }
    if (!(f.name in values) && f.type !== "boolean") continue;
    const v = values[f.name];
    if (f.type === "password" && !v) continue;
    if (f.type === "m2m" || f.type === "roles") {
      const list = (v as unknown[]) ?? [];
      if (list.length) list.forEach((item) => fd.append(f.name, String(item)));
      else fd.append(f.name, "");
    } else if (f.type === "boolean") fd.append(f.name, v ? "true" : "false");
    else if (f.type === "json") fd.append(f.name, typeof v === "string" ? v : JSON.stringify(v ?? []));
    else fd.append(f.name, v === null || v === undefined ? "" : String(v));
  }
  Object.entries(extra).forEach(([k, v]) => fd.append(k, String(v)));
  return fd;
}

export function defaultsFor(fields: FieldDef[]): Values {
  const out: Values = {};
  fields.forEach((f) => {
    if (f.default !== undefined) out[f.name] = f.default;
    else if (f.type === "boolean") out[f.name] = false;
  });
  return out;
}

export function useResourceForm(resource: ResourceDef, endpoint: string, initial: Values | undefined, isNew: boolean) {
  const [values, setValues] = useState<Values>({});
  const [files, setFiles] = useState<Record<string, FileState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setValues(initial ?? defaultsFor(resource.fields));
    setFiles({});
    setErrors({});
  }, [initial, resource]);

  const save = async (extra: Values = {}) => {
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const body = buildFormData(resource.fields, values, files, extra);
      const saved = await api<Values>(endpoint, { method: isNew ? "POST" : "PATCH", body });
      setMessage({ ok: true, text: "تم الحفظ بنجاح" });
      return saved;
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setErrors(err.fieldErrors());
        setMessage({ ok: false, text: "يرجى تصحيح الأخطاء الموضحة" });
      } else if (err instanceof ApiError && err.status === 403) {
        setMessage({ ok: false, text: "ليست لديك صلاحية لهذا الإجراء" });
      } else {
        setMessage({ ok: false, text: err instanceof Error ? err.message : "خطأ غير متوقع" });
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    values, files, errors, saving, message,
    set: (name: string, v: unknown) => setValues((prev) => ({ ...prev, [name]: v })),
    setFile: (name: string, s: FileState) => setFiles((prev) => ({ ...prev, [name]: s })),
    save,
  };
}

export function FieldsGrid({ fields, form }: { fields: FieldDef[]; form: ReturnType<typeof useResourceForm> }) {
  const sections = useMemo(() => {
    const map = new Map<string, FieldDef[]>();
    fields.forEach((f) => map.set(f.section ?? "", [...(map.get(f.section ?? "") ?? []), f]));
    return [...map.entries()];
  }, [fields]);
  const english = fields.filter((f) => f.en);

  const render = (f: FieldDef, en = false) => {
    const name = en ? `${f.name}_en` : f.name;
    return (
      <div key={name} className={f.full || f.type === "textarea" || f.type === "json" ? "sm:col-span-2" : ""}>
        <FieldInput
          field={en ? { ...f, required: false, help: undefined } : f}
          name={name}
          dir={en ? "ltr" : undefined}
          value={form.values[name]}
          onChange={(v) => form.set(name, v)}
          file={form.files[name]}
          onFile={(s) => form.setFile(name, s)}
          error={form.errors[name]}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {sections.map(([title, list]) => (
        <fieldset key={title || "main"} className="card p-5 sm:p-6">
          {title && <legend className="px-2 text-base font-bold">{title}</legend>}
          <div className="grid gap-5 sm:grid-cols-2">{list.map((f) => render(f))}</div>
        </fieldset>
      ))}
      {english.length > 0 && (
        <details className="card p-5 sm:p-6">
          <summary className="cursor-pointer font-bold">النسخة الإنجليزية (اختياري)</summary>
          <div className="mt-5 grid gap-5 sm:grid-cols-2" dir="ltr">{english.map((f) => render(f, true))}</div>
        </details>
      )}
    </div>
  );
}

export default function ResourceForm({ singletonKey }: { singletonKey?: string }) {
  const params = useParams();
  const resource = resourceByKey(singletonKey ?? params.resource ?? "");
  const id = params.id;
  const isNew = !singletonKey && id === "new";
  const navigate = useNavigate();
  const client = useQueryClient();
  const { can } = useAuth();

  const endpoint = resource?.singleton ? `/admin/${resource.key}/` : `/admin/${resource?.key}/${isNew ? "" : `${id}/`}`;
  const query = useQuery({
    queryKey: ["admin", resource?.key, id ?? "singleton"],
    queryFn: () => api<Values>(endpoint),
    enabled: !!resource && !isNew,
  });
  const form = useResourceForm(resource!, endpoint, isNew ? undefined : query.data, isNew);

  if (!resource) return <Forbidden />;
  const canSave = can(perm(resource, isNew ? "add" : "change"));
  if (!can(perm(resource, "view"))) return <Forbidden />;
  if (!isNew && query.isLoading) return <Loading />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const saved = await form.save();
    if (!saved) return;
    client.invalidateQueries({ queryKey: ["admin", resource.key] });
    client.invalidateQueries({ queryKey: ["public"] });
    if (isNew) navigate(`/admin/r/${resource.key}/${saved.id}`, { replace: true });
    else client.setQueryData(["admin", resource.key, id ?? "singleton"], saved);
  };

  const onDelete = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف هذا ${resource.singular}؟ لا يمكن التراجع.`)) return;
    try {
      await api(endpoint, { method: "DELETE" });
      client.invalidateQueries({ queryKey: ["admin", resource.key] });
      client.invalidateQueries({ queryKey: ["public"] });
      navigate(`/admin/r/${resource.key}`);
    } catch (err) {
      window.alert(err instanceof ApiError ? Object.values(err.fieldErrors()).join(" ") || err.message : "تعذر الحذف");
    }
  };

  const title = resource.singleton ? resource.title : isNew ? `إضافة ${resource.singular}` : `تعديل ${resource.singular}`;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!resource.singleton && (
            <Link to={`/admin/r/${resource.key}`} className="btn-ghost px-2!" aria-label="رجوع"><ArrowRight className="size-5" /></Link>
          )}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && !resource.singleton && can(perm(resource, "delete")) && (
            <button type="button" className="btn-outline border-red-300 text-red-600 hover:bg-red-50" onClick={onDelete}>
              <Trash2 className="size-4" aria-hidden="true" />حذف
            </button>
          )}
          {canSave && (
            <button type="submit" className="btn-primary" disabled={form.saving}>
              <Save className="size-4" aria-hidden="true" />{form.saving ? "جارٍ الحفظ…" : "حفظ"}
            </button>
          )}
        </div>
      </div>
      {form.message && (
        <p role={form.message.ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm ${form.message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {form.message.text}
          {!form.message.ok && form.errors.detail && ` — ${form.errors.detail}`}
        </p>
      )}
      <fieldset disabled={!canSave} className="contents">
        <FieldsGrid fields={resource.fields} form={form} />
      </fieldset>
      {!isNew && resource.children?.map((c) => (
        <ChildManager key={c.resource} childKey={c.resource} fk={c.fk} parentId={String(id)} title={c.title} />
      ))}
    </form>
  );
}
