import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3, ClipboardList, ExternalLink, FileText, GraduationCap, HandHeart, IdCard, Handshake, HelpCircle, History, Image, Images,
  Inbox, LayoutDashboard, Layers, LogOut, Mail, Menu, Newspaper, Settings, Shield, Target, Users, X, type LucideIcon,
} from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "./auth";
import { RESOURCES, perm } from "./resources";

const ICONS: Record<string, LucideIcon> = {
  settings: Settings, image: Image, file: FileText, target: Target, users: Users, help: HelpCircle, layers: Layers,
  chart: BarChart3, handshake: Handshake, newspaper: Newspaper, images: Images, clipboard: ClipboardList,
  inbox: Inbox, heart: HandHeart, mail: Mail, shield: Shield, graduation: GraduationCap, idcard: IdCard,
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  content_editor: "محرر المحتوى",
  services_officer: "مسؤول الخدمات",
  volunteer_coordinator: "منسق التطوع",
  partnerships_officer: "مسؤول الشراكات والتواصل",
  training_coordinator: "منسق التدريب والفعاليات",
  membership_officer: "مسؤول العضويات",
  viewer: "مراجع",
};

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-white/15 font-semibold text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`;
  const groups = new Map<string, typeof RESOURCES>();
  RESOURCES.filter((r) => r.group && can(perm(r, "view"))).forEach((r) => {
    groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  });

  return (
    <nav aria-label="لوحة التحكم" className="flex flex-col gap-6 p-4" onClick={onNavigate}>
      <NavLink to="/admin" end className={link}><LayoutDashboard className="size-4" aria-hidden="true" />الرئيسية</NavLink>
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          <p className="mb-2 px-3 text-xs font-semibold text-white/50">{group}</p>
          <ul className="space-y-0.5">
            {items.map((r) => {
              const Icon = ICONS[r.icon] ?? FileText;
              return (
                <li key={r.key}>
                  <NavLink to={r.singleton ? `/admin/${r.key}` : `/admin/r/${r.key}`} className={link}>
                    <Icon className="size-4" aria-hidden="true" />{r.title}
                  </NavLink>
                </li>
              );
            })}
            {group === "النظام" && can("common.view_auditlog") && (
              <li><NavLink to="/admin/audit" className={link}><History className="size-4" aria-hidden="true" />سجل العمليات</NavLink></li>
            )}
          </ul>
        </div>
      ))}
      {!groups.has("النظام") && can("common.view_auditlog") && (
        <NavLink to="/admin/audit" className={link}><History className="size-4" aria-hidden="true" />سجل العمليات</NavLink>
      )}
    </nav>
  );
}

export function AdminLayout() {
  const { me, logout } = useAuth();
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-sand" dir="rtl" lang="ar">
      <title>لوحة التحكم</title>
      <meta name="robots" content="noindex, nofollow" />
      <aside className="pattern-bg sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto lg:block">
        <div className="border-b border-white/10 p-5 font-bold text-white">{settings?.name ?? "لوحة التحكم"}</div>
        <Sidebar />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="pattern-bg absolute inset-y-0 start-0 w-72 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 p-4 text-white">
              <span className="font-bold">{settings?.name}</span>
              <button onClick={() => setOpen(false)} aria-label="إغلاق"><X className="size-5" /></button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:px-6">
          <button className="btn-ghost px-2! lg:hidden" onClick={() => setOpen(true)} aria-label="القائمة"><Menu className="size-5" /></button>
          <div className="flex-1" />
          <Link to="/" target="_blank" className="btn-ghost hidden sm:inline-flex"><ExternalLink className="size-4" aria-hidden="true" />عرض الموقع</Link>
          <div className="text-end text-sm leading-tight">
            <p className="font-semibold">{me?.full_name || me?.username}</p>
            <p className="text-xs text-muted">{me?.is_superuser ? "مدير عام" : me?.roles.map((r) => ROLE_LABELS[r] ?? r).join("، ")}</p>
          </div>
          <button className="btn-ghost px-2!" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج"><LogOut className="size-5" /></button>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
