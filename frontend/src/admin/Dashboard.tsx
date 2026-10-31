import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, GraduationCap, Handshake, IdCard, Inbox, Mail, UserPlus, Users, type LucideIcon } from "lucide-react";

import { Loading } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "./auth";
import { fmtDate } from "./common";
import { RESOURCES, perm } from "./resources";

type Counter = { total: number; new: number };
type DashboardData = {
  service_requests?: Counter;
  volunteer_applications?: Counter;
  partnership_requests?: Counter;
  contact_messages?: Counter;
  course_registrations?: Counter;
  memberships?: Counter;
  members?: { active: number; expiring_30: number; expired: number };
  volunteer_hours?: number;
  recent_activity?: { id: number; username: string; action: string; model: string; object_repr: string; created_at: string }[];
};

const CARDS: { key: keyof DashboardData; label: string; to: string; Icon: LucideIcon }[] = [
  { key: "memberships", label: "طلبات العضوية", to: "/admin/r/memberships?status=pending", Icon: IdCard },
  { key: "course_registrations", label: "تسجيلات بانتظار التأكيد", to: "/admin/r/course-registrations?status=pending", Icon: GraduationCap },
  { key: "service_requests", label: "طلبات المستفيدين", to: "/admin/r/service-requests?status=new", Icon: Inbox },
  { key: "volunteer_applications", label: "طلبات التطوع", to: "/admin/r/volunteer-applications?status=new", Icon: UserPlus },
  { key: "partnership_requests", label: "طلبات الشراكة", to: "/admin/r/partnership-requests?status=new", Icon: Handshake },
  { key: "contact_messages", label: "رسائل التواصل", to: "/admin/r/contact-messages?status=new", Icon: Mail },
];

const ACTIONS: Record<string, string> = {
  create: "أضاف", update: "عدّل", delete: "حذف", download: "نزّل مرفقًا من", login: "سجّل الدخول", login_failed: "محاولة دخول فاشلة", logout: "سجّل الخروج",
};

export default function Dashboard() {
  const { me, can } = useAuth();
  const query = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => api<DashboardData>("/admin/dashboard/") });
  const shortcuts = RESOURCES.filter((r) => r.group && !r.submission && r.canCreate !== false && !r.singleton && can(perm(r, "add"))).slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">مرحبًا {me?.full_name || me?.username}</h1>
        <p className="mt-1 text-muted">نظرة عامة على نشاط الموقع والطلبات الواردة.</p>
      </div>
      {query.isLoading ? <Loading /> : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CARDS.filter((c) => query.data?.[c.key]).map(({ key, label, to, Icon }) => {
              const c = query.data![key] as Counter;
              return (
                <li key={key}>
                  <Link to={to} className="card flex items-center gap-4 p-5 transition hover:shadow-md">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="size-6" aria-hidden="true" /></span>
                    <div>
                      <p className="text-sm text-muted">{label}</p>
                      <p className="text-2xl font-bold">{c.new} <span className="text-sm font-normal text-muted">جديد من {c.total}</span></p>
                    </div>
                  </Link>
                </li>
              );
            })}
            {query.data?.members && (
              <li>
                <Link to="/admin/r/memberships?expiring=30" className="card flex items-center gap-4 p-5 transition hover:shadow-md">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-secondary-soft text-ink"><Users className="size-6" aria-hidden="true" /></span>
                  <div>
                    <p className="text-sm text-muted">الأعضاء الساريون</p>
                    <p className="text-2xl font-bold">{query.data.members.active}</p>
                    <p className="text-xs text-muted">
                      تنتهي خلال 30 يومًا: <strong className="text-amber-700">{query.data.members.expiring_30}</strong> · منتهية: <strong className="text-red-700">{query.data.members.expired}</strong>
                    </p>
                  </div>
                </Link>
              </li>
            )}
            {query.data?.volunteer_hours !== undefined && (
              <li className="card flex items-center gap-4 p-5">
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary-soft text-ink"><Clock className="size-6" aria-hidden="true" /></span>
                <div>
                  <p className="text-sm text-muted">ساعات التطوع المسجلة</p>
                  <p className="text-2xl font-bold">{Number(query.data.volunteer_hours).toLocaleString("en")}</p>
                </div>
              </li>
            )}
          </ul>

          {shortcuts.length > 0 && (
            <section>
              <h2 className="mb-3 font-bold">إضافة سريعة</h2>
              <div className="flex flex-wrap gap-2">
                {shortcuts.map((r) => <Link key={r.key} to={`/admin/r/${r.key}/new`} className="btn-outline bg-white">+ {r.singular}</Link>)}
              </div>
            </section>
          )}

          {query.data?.recent_activity && (
            <section className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold">آخر العمليات</h2>
                <Link to="/admin/audit" className="text-sm text-primary hover:underline">السجل الكامل</Link>
              </div>
              <ul className="divide-y divide-line text-sm">
                {query.data.recent_activity.map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                    <span><strong>{a.username || "—"}</strong> {ACTIONS[a.action] ?? a.action} {a.object_repr}</span>
                    <span className="text-muted">{fmtDate(a.created_at, true)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export { ACTIONS };
