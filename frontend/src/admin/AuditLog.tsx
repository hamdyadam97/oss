import { Fragment, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Loading, Pagination } from "@/components/ui";
import { api, qs } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { useAuth } from "./auth";
import { Badge, Forbidden, fmtDate } from "./common";
import { ACTIONS } from "./Dashboard";

type Entry = {
  id: number; username: string; action: string; action_display: string; model: string; object_id: string;
  object_repr: string; changes: Record<string, unknown>; ip_address: string | null; created_at: string;
};

export default function AuditLog() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["admin", "audit", page, action, search],
    queryFn: () => api<Paginated<Entry>>(`/admin/audit-logs/${qs({ page, action, search, page_size: 30 })}`),
    placeholderData: keepPreviousData,
  });
  if (!can("common.view_auditlog")) return <Forbidden />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">سجل العمليات</h1>
      <div className="card flex flex-wrap gap-3 p-3">
        <input className="input min-w-56 flex-1" placeholder="بحث باسم المستخدم أو السجل…" aria-label="بحث"
          onKeyDown={(e) => { if (e.key === "Enter") { setSearch(e.currentTarget.value); setPage(1); } }} />
        <select className="input w-auto" aria-label="نوع العملية" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">كل العمليات</option>
          {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {query.isLoading ? <Loading /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-sand/60 text-xs text-muted">
              <tr>{["الوقت", "المستخدم", "العملية", "السجل", "IP", ""].map((h) => <th key={h} scope="col" className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {query.data?.results.map((e) => (
                <Fragment key={e.id}>
                  <tr className="border-b border-line">
                    <td className="whitespace-nowrap px-4 py-3">{fmtDate(e.created_at, true)}</td>
                    <td className="px-4 py-3 font-semibold">{e.username || "—"}</td>
                    <td className="px-4 py-3"><Badge value={e.action === "delete" || e.action === "login_failed" ? "rejected" : e.action === "create" ? "approved" : "under_review"} label={e.action_display} /></td>
                    <td className="px-4 py-3">{e.object_repr} <span className="text-xs text-muted" dir="ltr">{e.model}</span></td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">{e.ip_address}</td>
                    <td className="px-4 py-3">
                      {Object.keys(e.changes).length > 0 && (
                        <button className="text-primary hover:underline" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>التفاصيل</button>
                      )}
                    </td>
                  </tr>
                  {open === e.id && (
                    <tr className="border-b border-line bg-sand/40">
                      <td colSpan={6} className="px-4 py-3">
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs" dir="ltr">{JSON.stringify(e.changes, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.data && <Pagination page={page} count={query.data.count} pageSize={30} onChange={setPage} />}
    </div>
  );
}
