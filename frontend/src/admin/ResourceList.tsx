import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Plus, Search } from "lucide-react";

import { Loading, Pagination } from "@/components/ui";
import { api, ApiError, qs } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { useAuth } from "./auth";
import { Cell, Forbidden } from "./common";
import { perm, resourceByKey, type ResourceDef } from "./resources";

type Filter = NonNullable<ResourceDef["filters"]>[number];

function FilterSelect({ filter, value, onChange }: { filter: Filter; value: string; onChange: (v: string) => void }) {
  const remote = useQuery({
    queryKey: ["admin", "options", filter.resource],
    queryFn: () => api<Paginated<Record<string, unknown>>>(`/admin/${filter.resource}/?page_size=100`),
    enabled: !!filter.resource,
    select: (d) => d.results.map((r) => ({ value: String(r.id), label: String(r[filter.optionLabel ?? "title"]) })),
  });
  const options = filter.resource ? remote.data ?? [] : filter.options;
  return (
    <select aria-label={filter.label} value={value} onChange={(e) => onChange(e.target.value)} className="input w-auto max-w-64">
      <option value="">{filter.label}: الكل</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function ResourceList() {
  const { resource: key = "" } = useParams();
  const resource = resourceByKey(key);
  const { can } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page") ?? 1);
  const search = params.get("search") ?? "";
  const [input, setInput] = useState(search);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  useEffect(() => {
    setInput(search);
  }, [search, key]);
  useEffect(() => {
    setSelected(new Set());
  }, [key, params]);

  const filterValues = Object.fromEntries((resource?.filters ?? []).map((f) => [f.name, params.get(f.name) ?? ""]));
  const query = useQuery({
    queryKey: ["admin", key, "list", page, search, filterValues],
    queryFn: () => api<Paginated<Record<string, unknown>>>(`/admin/${key}/${qs({ page, search, page_size: 20, ...filterValues })}`),
    enabled: !!resource,
    placeholderData: keepPreviousData,
  });

  if (!resource || !can(perm(resource, "view"))) return <Forbidden />;

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const canCreate = resource.canCreate !== false && can(perm(resource, "add"));
  const canBulk = !!resource.bulkStatuses?.length && can(perm(resource, "change"));
  const rows = query.data?.results ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(String(r.id)));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const applyBulk = async () => {
    if (!bulkStatus || !selected.size) return;
    const label = resource.bulkStatuses?.find((o) => o.value === bulkStatus)?.label;
    if (!window.confirm(`تغيير حالة ${selected.size} سجل إلى «${label}»؟`)) return;
    try {
      const res = await api<{ updated: number }>(`/admin/${key}/bulk/`, {
        method: "POST",
        body: { ids: [...selected].map(Number), status: bulkStatus },
      });
      setBulkMsg(`تم تحديث ${res.updated} سجل`);
      setSelected(new Set());
      client.invalidateQueries({ queryKey: ["admin", key] });
      client.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    } catch (err) {
      setBulkMsg(err instanceof ApiError ? err.message : "تعذر التحديث");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{resource.title}</h1>
        <div className="flex gap-2">
          {resource.exportable && (
            <a href={`/api/admin/${key}/export/${qs({ search, ...filterValues })}`} className="btn-outline bg-white">
              <Download className="size-4" aria-hidden="true" />تصدير Excel (CSV)
            </a>
          )}
          {canCreate && (
            <Link to={`/admin/r/${key}/new`} className="btn-primary"><Plus className="size-4" aria-hidden="true" />إضافة {resource.singular}</Link>
          )}
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-3">
        <form role="search" className="relative min-w-56 flex-1" onSubmit={(e) => { e.preventDefault(); update({ search: input.trim() }); }}>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="بحث…" aria-label="بحث" className="input ps-9" />
        </form>
        {resource.filters?.map((f) => (
          <FilterSelect key={f.name} filter={f} value={filterValues[f.name]} onChange={(v) => update({ [f.name]: v })} />
        ))}
      </div>

      {canBulk && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-primary-soft p-3 text-sm">
          <strong>{selected.size} محدد</strong>
          <select aria-label="الحالة الجديدة" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="input w-auto">
            <option value="">تغيير الحالة إلى…</option>
            {resource.bulkStatuses!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="btn-primary" onClick={applyBulk} disabled={!bulkStatus}>تطبيق</button>
          <button className="btn-ghost" onClick={() => setSelected(new Set())}>إلغاء التحديد</button>
        </div>
      )}
      {bulkMsg && <p role="status" className="text-sm text-emerald-700">{bulkMsg}</p>}

      {query.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-line bg-sand/60 text-start text-xs text-muted">
              <tr>
                {canBulk && (
                  <th scope="col" className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="تحديد الكل" checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => String(r.id))))} />
                  </th>
                )}
                {resource.columns.map((c) => <th key={c.name} scope="col" className="px-4 py-3 text-start font-semibold">{c.label}</th>)}
                <th scope="col" className="px-4 py-3"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                // The whole row opens the record; checkboxes and links inside it keep their own behaviour
                <tr key={String(row.id)}
                  onClick={(e) => { if (!(e.target as HTMLElement).closest("a, button, input, label")) navigate(`/admin/r/${key}/${row.id}`); }}
                  className={`cursor-pointer border-b border-line last:border-0 hover:bg-sand/40 ${selected.has(String(row.id)) ? "bg-primary-soft/50" : ""}`}>
                  {canBulk && (
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label="تحديد" checked={selected.has(String(row.id))} onChange={() => toggle(String(row.id))} />
                    </td>
                  )}
                  {resource.columns.map((c, i) => (
                    <td key={c.name} className="px-4 py-3 align-middle">
                      {i === resource.columns.findIndex((col) => col.type !== "image") ? (
                        <Link to={`/admin/r/${key}/${row.id}`} className="font-semibold text-primary hover:underline">
                          <Cell col={c} value={row[c.name] ?? (c.name === "member_number" ? row.tracking_code : undefined)} />
                        </Link>
                      ) : <Cell col={c} value={row[c.name]} />}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-end">
                    <Link to={`/admin/r/${key}/${row.id}`} className="btn-ghost px-3! py-1.5! text-sm">
                      {resource.submission
                        ? <><Eye className="size-4" aria-hidden="true" />عرض</>
                        : <><Pencil className="size-4" aria-hidden="true" />تعديل</>}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-10 text-center text-muted">لا توجد سجلات.</p>}
        </div>
      )}
      {query.data && (
        <>
          <p className="text-sm text-muted">إجمالي السجلات: {query.data.count}</p>
          <Pagination page={page} count={query.data.count} pageSize={20} onChange={(p) => update({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
