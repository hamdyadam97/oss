import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Award, Download, Lock, RefreshCw, Save, Trash2 } from "lucide-react";

import { Loading } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "./auth";
import { Badge, Forbidden, fmtDate } from "./common";
import { PROFESSION, perm, resourceByKey } from "./resources";

const LABELS: Record<string, string> = {
  tracking_code: "رقم الطلب", service_title: "الخدمة", opportunity_title: "الفرصة", full_name: "الاسم الكامل",
  national_id: "الرقم الوطني / الرقم الشخصي", phone: "الهاتف المحمول", email: "البريد الإلكتروني", city: "المدينة", district: "الحي",
  family_size: "عدد أفراد الأسرة", details: "تفاصيل الطلب", gender: "الجنس", birth_date: "تاريخ الميلاد",
  education: "المؤهل العلمي", occupation: "المهنة", skills: "المهارات", availability: "أوقات التفرغ",
  motivation: "سبب الرغبة في التطوع", organization: "الجهة", contact_name: "اسم المسؤول", position: "المنصب",
  kind: "نوع الطلب", message: "الرسالة", name: "الاسم", subject: "الموضوع", created_at: "تاريخ التقديم",
  updated_at: "آخر تحديث", consented_at: "وقت الموافقة على سياسة الخصوصية",
  course_title: "الدورة", membership_type_title: "فئة العضوية", member_number: "رقم العضوية", start_date: "بداية العضوية",
  expiry_date: "انتهاء العضوية", full_name_en: "الاسم بالإنجليزية", profession: "المهنة", specialty: "التخصص",
  license_number: "رقم ترخيص مزاولة المهنة", workplace: "جهة العمل", nationality: "الجنسية", qualification: "المؤهل العلمي",
  years_experience: "سنوات الخبرة", certificate_code: "رمز الشهادة", certificate_issued_at: "تاريخ إصدار الشهادة",
};
const HIDDEN = new Set(["id", "status", "status_display", "admin_notes", "public_note", "assigned_to", "files", "extra_data",
  "hours_completed", "service", "opportunity", "program", "course", "membership_type", "certificate_url", "is_expired"]);
const FILE_LABELS: Record<string, string> = {
  attachment_1: "المرفق 1", attachment_2: "المرفق 2", attachment_3: "المرفق 3", cv: "السيرة الذاتية", attachment: "المرفق",
  license_card: "صورة ترخيص مزاولة المهنة",
};
const GENDER: Record<string, string> = { male: "ذكر", female: "أنثى" };

type Row = Record<string, unknown> & { files: { field: string; url: string }[]; extra_data?: Record<string, { label: string; value: string }> };

export default function SubmissionDetail() {
  const { resource: key = "", id = "" } = useParams();
  const resource = resourceByKey(key);
  const { can } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const endpoint = `/admin/${key}/${id}/`;
  const query = useQuery({ queryKey: ["admin", key, id], queryFn: () => api<Row>(endpoint), enabled: !!resource });
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    const d = query.data;
    const extra = Object.fromEntries((resource?.fields ?? []).map((f) => [f.name, d[f.name] == null ? "" : String(d[f.name])]));
    setForm({ ...extra, public_note: String(d.public_note ?? ""), admin_notes: String(d.admin_notes ?? "") });
  }, [query.data, resource]);

  if (!resource || !can(perm(resource, "view"))) return <Forbidden />;
  if (query.isLoading || !query.data) return <Loading />;
  const row = query.data;
  const canEdit = can(perm(resource, "change"));
  const statusOptions = resource.fields.find((f) => f.name === "status")?.options ?? [];
  const workflowFields = resource.fields.filter((f) => f.name !== "status");

  const runAction = async (action: string, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    try {
      const updated = await api<Row>(`${endpoint}${action}/`, { method: "POST" });
      client.setQueryData(["admin", key, id], updated);
      client.invalidateQueries({ queryKey: ["admin", key, "list"] });
      setMsg({ ok: true, text: "تم تنفيذ الإجراء" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : "تعذر التنفيذ" });
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      // Empty optional values (e.g. a cleared date) are sent as null.
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" && k !== "public_note" && k !== "admin_notes" ? null : v]));
      const updated = await api<Row>(endpoint, { method: "PATCH", body });
      client.setQueryData(["admin", key, id], updated);
      client.invalidateQueries({ queryKey: ["admin", key, "list"] });
      client.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      setMsg({ ok: true, text: "تم تحديث الطلب" });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? Object.values(err.fieldErrors()).join(" ") : "تعذر الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("حذف الطلب نهائيًا مع مرفقاته؟")) return;
    await api(endpoint, { method: "DELETE" });
    client.invalidateQueries({ queryKey: ["admin", key] });
    navigate(`/admin/r/${key}`);
  };

  const entries = Object.entries(row).filter(([k, v]) => !HIDDEN.has(k) && v !== "" && v !== null && v !== undefined);
  const display = (k: string, v: unknown) => {
    if (k.endsWith("_at")) return fmtDate(v, true);
    if (k === "birth_date") return fmtDate(v);
    if (k === "gender") return GENDER[String(v)] ?? String(v);
    if (k === "start_date" || k === "expiry_date") return fmtDate(v);
    if (k === "profession") return PROFESSION.find((o) => o.value === v)?.label ?? String(v);
    if (k === "kind") return resource.filters?.find((f) => f.name === "kind")?.options.find((o) => o.value === v)?.label ?? String(v);
    return String(v);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/admin/r/${key}`} className="btn-ghost px-2!" aria-label="رجوع"><ArrowRight className="size-5" /></Link>
          <h1 className="text-2xl font-bold">{resource.singular} <span className="font-mono text-lg text-muted" dir="ltr">{String(row.tracking_code)}</span></h1>
          <Badge value={String(row.status)} label={String(row.status_display)} />
        </div>
        {can(perm(resource, "delete")) && (
          <button className="btn-outline border-red-300 text-red-600 hover:bg-red-50" onClick={remove}><Trash2 className="size-4" aria-hidden="true" />حذف</button>
        )}
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        <Lock className="size-4 shrink-0" aria-hidden="true" />
        بيانات شخصية محمية: لا تشاركها خارج نطاق العمل. يتم تسجيل الاطلاع على المرفقات وتنزيلها في سجل العمليات.
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold">بيانات مقدم الطلب</h2>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {entries.map(([k, v]) => (
              <div key={k} className={["details", "message", "motivation", "skills"].includes(k) ? "sm:col-span-2" : ""}>
                <dt className="text-xs text-muted">{LABELS[k] ?? k}</dt>
                <dd className="whitespace-pre-line font-medium" dir={["phone", "email", "national_id"].includes(k) ? "ltr" : undefined}>{display(k, v)}</dd>
              </div>
            ))}
            {row.extra_data && Object.values(row.extra_data).map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-muted">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
          {row.files.length > 0 && (
            <div className="mt-6 border-t border-line pt-5">
              <h3 className="mb-3 text-sm font-bold">المرفقات</h3>
              <div className="flex flex-wrap gap-2">
                {row.files.map((f) => (
                  <a key={f.field} href={f.url} className="btn-outline"><Download className="size-4" aria-hidden="true" />{FILE_LABELS[f.field] ?? f.field}</a>
                ))}
              </div>
            </div>
          )}
        </section>

        <form onSubmit={save} className="card space-y-4 p-6">
          <h2 className="font-bold">معالجة الطلب</h2>
          <fieldset disabled={!canEdit} className="space-y-4">
            <div>
              <label htmlFor="status" className="label">الحالة</label>
              <select id="status" className="input" value={form.status ?? ""} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {workflowFields.map((f) => (
              <div key={f.name}>
                <label htmlFor={`wf-${f.name}`} className="label">{f.label}</label>
                <input
                  id={`wf-${f.name}`}
                  type={f.type === "date" ? "date" : "number"}
                  step={f.type === "number" ? "0.5" : undefined}
                  min={f.type === "number" ? "0" : undefined}
                  className="input"
                  value={(form[f.name] ?? "").slice(0, f.type === "date" ? 10 : undefined)}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              </div>
            ))}
            {key !== "contact-messages" && (
              <div>
                <label htmlFor="public_note" className="label">ملاحظة تظهر لمقدم الطلب عند التتبع</label>
                <textarea id="public_note" rows={3} className="input" value={form.public_note ?? ""} onChange={(e) => setForm({ ...form, public_note: e.target.value })} />
              </div>
            )}
            <div>
              <label htmlFor="admin_notes" className="label">ملاحظات داخلية (لا تظهر للعامة)</label>
              <textarea id="admin_notes" rows={4} className="input" value={form.admin_notes ?? ""} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
            </div>
            {canEdit && <button className="btn-primary w-full" disabled={saving}><Save className="size-4" aria-hidden="true" />{saving ? "جارٍ الحفظ…" : "حفظ"}</button>}
          </fieldset>
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
          {canEdit && resource.detailActions?.map((a) => (
            <button key={a.action} type="button" className="btn-outline w-full" onClick={() => runAction(a.action, a.confirm)}>
              <RefreshCw className="size-4" aria-hidden="true" />{a.label}
            </button>
          ))}
          {typeof row.certificate_url === "string" && (
            <a href={row.certificate_url} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">
              <Award className="size-4" aria-hidden="true" />عرض شهادة الحضور
            </a>
          )}
          {row.is_expired === true && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">العضوية منتهية — استخدم زر التجديد عند سداد الرسوم.</p>}
        </form>
      </div>
    </div>
  );
}
