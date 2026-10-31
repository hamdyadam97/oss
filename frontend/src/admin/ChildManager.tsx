import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { useAuth } from "./auth";
import { Cell } from "./common";
import { FieldsGrid, useResourceForm } from "./ResourceForm";
import { perm, resourceByKey } from "./resources";

/** Inline manager for child records (program images, album items). Not a <form>: it lives inside the parent form. */
export function ChildManager({ childKey, fk, parentId, title }: { childKey: string; fk: string; parentId: string; title: string }) {
  const resource = resourceByKey(childKey)!;
  const { can } = useAuth();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const list = useQuery({
    queryKey: ["admin", childKey, "of", parentId],
    queryFn: () => api<Paginated<Record<string, unknown>>>(`/admin/${childKey}/?${fk}=${parentId}&page_size=100&ordering=order`),
  });
  const form = useResourceForm(resource, `/admin/${childKey}/`, undefined, true);

  const add = async () => {
    const saved = await form.save({ [fk]: parentId });
    if (saved) {
      setAdding(false);
      client.invalidateQueries({ queryKey: ["admin", childKey] });
    }
  };

  const remove = async (id: unknown) => {
    if (!window.confirm("حذف هذا العنصر؟")) return;
    await api(`/admin/${childKey}/${id}/`, { method: "DELETE" });
    client.invalidateQueries({ queryKey: ["admin", childKey] });
  };

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        {can(perm(resource, "add")) && !adding && (
          <button type="button" className="btn-outline" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden="true" />إضافة</button>
        )}
      </div>
      {adding && (
        <div className="mb-5 space-y-4 rounded-xl bg-sand p-4">
          <FieldsGrid fields={resource.fields} form={form} />
          {form.message && !form.message.ok && <p role="alert" className="text-sm text-red-600">{form.message.text}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-primary" onClick={add} disabled={form.saving}>{form.saving ? "جارٍ الحفظ…" : "حفظ العنصر"}</button>
            <button type="button" className="btn-ghost" onClick={() => setAdding(false)}>إلغاء</button>
          </div>
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {list.data?.results.map((row) => (
          <li key={String(row.id)} className="relative rounded-xl border border-line p-2">
            <div className="flex flex-col gap-2 text-sm">
              {resource.columns.map((c) => <Cell key={c.name} col={c} value={row[c.name]} />)}
            </div>
            {can(perm(resource, "delete")) && (
              <button type="button" onClick={() => remove(row.id)} className="absolute end-2 top-2 rounded-full bg-white p-1.5 text-red-600 shadow" aria-label="حذف">
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {list.data?.results.length === 0 && !adding && <p className="text-sm text-muted">لا توجد عناصر بعد.</p>}
    </section>
  );
}
