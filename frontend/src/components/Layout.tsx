import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, Globe, Mail, MapPin, Menu, MessageCircle, Phone, Search, X } from "lucide-react";

import { useSettings } from "@/hooks/useSettings";
import { useI18n, type DictKey } from "@/lib/i18n";
import type { SiteSettings } from "@/lib/types";
import { SocialLinks } from "./Social";

const MAIN_NAV: { to: string; key: DictKey }[] = [
  { to: "/", key: "home" },
  { to: "/about", key: "about" },
  { to: "/courses", key: "navCourses" },
  { to: "/membership", key: "membership" },
  { to: "/programs", key: "navPrograms" },
  { to: "/services", key: "navServices" },
  { to: "/media", key: "navMedia" },
];

const MORE_NAV: { to: string; key: DictKey }[] = [
  { to: "/governance", key: "governance" },
  { to: "/impact", key: "impact" },
  { to: "/volunteer", key: "volunteer" },
  { to: "/partners", key: "partners" },
  { to: "/gallery", key: "gallery" },
  { to: "/certificates", key: "certificates" },
  { to: "/track", key: "track" },
  { to: "/faq", key: "faq" },
  { to: "/contact", key: "contact" },
];

function applyTheme(settings?: SiteSettings) {
  if (!settings) return;
  const root = document.documentElement;
  const hex = /^#[0-9a-f]{6}$/i;
  if (hex.test(settings.primary_color)) root.style.setProperty("--brand-primary", settings.primary_color);
  if (hex.test(settings.secondary_color)) root.style.setProperty("--brand-secondary", settings.secondary_color);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.primary_color);
}

function Logo({ settings, light = false }: { settings?: SiteSettings; light?: boolean }) {
  const { pick } = useI18n();
  const src = light ? settings?.logo_light || settings?.logo : settings?.logo;
  const name = pick(settings, "name");
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3" aria-label={name}>
      {src ? (
        <img src={src} alt="" className="size-11 shrink-0 rounded-full sm:size-14" />
      ) : (
        <span className={`flex size-11 items-center justify-center rounded-xl text-lg font-bold ${light ? "bg-white/15 text-white" : "bg-primary text-white"}`}>
          {name.trim().charAt(0)}
        </span>
      )}
      {/* Never taller than the header: the name stops at two lines and the tagline at one, in either language */}
      <span className="flex min-w-0 max-w-[10.5rem] flex-col leading-tight sm:max-w-[15rem]">
        <span className={`line-clamp-2 text-sm font-bold sm:text-base ${light ? "text-white" : "text-ink"}`}>{name}</span>
        {settings?.tagline && (
          <span className={`hidden truncate text-xs sm:block ${light ? "text-white/70" : "text-muted"}`}>{pick(settings, "tagline")}</span>
        )}
      </span>
    </Link>
  );
}

function TopBar({ settings }: { settings: SiteSettings }) {
  const { lang, setLang } = useI18n();
  const hasSocial = [settings.x_url, settings.instagram_url, settings.snapchat_url, settings.tiktok_url,
    settings.youtube_url, settings.linkedin_url, settings.facebook_url].some(Boolean);
  if (!settings.phone && !settings.email && !hasSocial && !settings.english_enabled) return null;
  return (
    <div className="hidden bg-primary-dark text-sm text-white/90 md:block print:hidden">
      <div className="container-x flex h-10 items-center justify-between">
        <div className="flex items-center gap-5">
          {settings.phone && (
            <a href={`tel:${settings.phone}`} className="flex items-center gap-1.5 hover:text-white" dir="ltr">
              <Phone className="size-3.5" aria-hidden="true" /> {settings.phone}
            </a>
          )}
          {settings.email && (
            <a href={`mailto:${settings.email}`} className="flex items-center gap-1.5 hover:text-white">
              <Mail className="size-3.5" aria-hidden="true" /> {settings.email}
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SocialLinks settings={settings} iconClass="size-3.5" />
          {settings.english_enabled && (
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="flex items-center gap-1.5 rounded-full px-3 py-1 hover:bg-white/10">
              <Globe className="size-3.5" aria-hidden="true" /> {lang === "ar" ? "English" : "العربية"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-lg px-2.5 py-2 text-[15px] font-medium transition-colors ${isActive ? "text-primary bg-primary-soft" : "text-ink hover:text-primary"}`;

function Header({ settings }: { settings?: SiteSettings }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOpen(false), setMoreOpen(false));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cta = settings?.has_membership
    ? { to: "/membership", label: t("joinMembership") }
    : settings?.donations_enabled
      ? { to: "/partners#donate", label: t("supportUs") }
      : { to: "/volunteer", label: t("volunteerNow") };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur print:hidden">
      <div className="container-x flex h-20 items-center justify-between gap-4">
        <Logo settings={settings} />
        <nav aria-label="main" className="hidden items-center gap-0.5 xl:flex">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navClass}>
              {t(item.key)}
            </NavLink>
          ))}
          <div className="relative">
            <button
              className="flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-[15px] font-medium text-ink hover:text-primary"
              aria-expanded={moreOpen}
              aria-haspopup="true"
              onClick={() => setMoreOpen((v) => !v)}
            >
              {t("more")} <ChevronDown className="size-4" aria-hidden="true" />
            </button>
            {moreOpen && (
              <ul className="card absolute end-0 top-full mt-2 w-56 p-2 animate-fade-up">
                {MORE_NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-primary-soft text-primary" : "hover:bg-sand"}`}>
                      {t(item.key)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/search" className="btn-ghost px-2.5!" aria-label={t("search")}>
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <Link to={cta.to} className="btn-primary hidden sm:inline-flex">{cta.label}</Link>
          <button className="btn-ghost px-2.5! xl:hidden" aria-label={t("menu")} aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label={t("menu")}>
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[85%] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo settings={settings} />
              <button className="btn-ghost px-2!" aria-label={t("close")} onClick={() => setOpen(false)}>
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="mobile" className="flex flex-col gap-1">
              {[...MAIN_NAV, ...MORE_NAV].map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navClass}>
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>
            <Link to={cta.to} className="btn-primary mt-6">{cta.label}</Link>
            {settings?.english_enabled && (
              <button className="btn-outline mt-3" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
                <Globe className="size-4" aria-hidden="true" /> {lang === "ar" ? "English" : "العربية"}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer({ settings }: { settings?: SiteSettings }) {
  const { t, pick } = useI18n();
  const year = new Date().getFullYear();
  return (
    <footer className="pattern-bg text-white/85 print:hidden">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Logo settings={settings} light />
          {settings?.about_short && <p className="mt-4 line-clamp-4 text-sm leading-7">{pick(settings, "about_short")}</p>}
          {settings && <SocialLinks settings={settings} className="mt-4 -ms-2" />}
        </div>
        <div>
          <h2 className="mb-4 font-bold text-white">{t("quickLinks")}</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {[...MAIN_NAV.slice(1), ...MORE_NAV].map((item) => (
              <li key={item.to}><Link to={item.to} className="hover:text-white hover:underline">{t(item.key)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          {(settings?.address || settings?.phone || settings?.email) && <h2 className="mb-4 font-bold text-white">{t("contactInfo")}</h2>}
          <ul className="space-y-3 text-sm">
            {settings?.address && (
              <li className="flex gap-2"><MapPin className="mt-1 size-4 shrink-0 text-secondary" aria-hidden="true" />{pick(settings, "address")}</li>
            )}
            {settings?.phone && (
              <li className="flex gap-2"><Phone className="mt-1 size-4 shrink-0 text-secondary" aria-hidden="true" /><a href={`tel:${settings.phone}`} dir="ltr">{settings.phone}</a></li>
            )}
            {settings?.email && (
              <li className="flex gap-2"><Mail className="mt-1 size-4 shrink-0 text-secondary" aria-hidden="true" /><a href={`mailto:${settings.email}`}>{settings.email}</a></li>
            )}
          </ul>
        </div>
        <div>
          {settings?.working_hours && (
            <>
              <h2 className="mb-4 font-bold text-white">{t("workingHours")}</h2>
              <p className="text-sm">{pick(settings, "working_hours")}</p>
            </>
          )}
          {settings?.license_number && (
            <div className="mt-6 rounded-xl bg-white/10 p-4 text-sm">
              <p>{t("licensed")} <strong className="text-white">{settings.license_number}</strong></p>
              {settings.supervisor && <p className="mt-1">{t("supervisedBy")} {pick(settings, "supervisor")}</p>}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs sm:flex-row">
          <p>© {year} {pick(settings, "name")} — {t("rights")}</p>
          <ul className="flex gap-4">
            {settings?.footer_pages.map((p) => (
              <li key={p.slug}><Link to={`/p/${p.slug}`} className="hover:text-white">{pick(p, "title")}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppButton({ number }: { number: string }) {
  // wa.me needs the international form: 07XXXXXXXX -> 9627XXXXXXXX
  const digits = number.replace(/\D/g, "").replace(/^00/, "").replace(/^0/, "962");
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-5 end-5 z-30 flex size-14 print:hidden items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="size-7" aria-hidden="true" />
    </a>
  );
}

export function Layout() {
  const { data: settings } = useSettings();
  const { t, lang, setLang } = useI18n();
  const { pathname } = useLocation();

  useEffect(() => {
    applyTheme(settings);
  }, [settings]);
  useEffect(() => {
    if (settings && !settings.english_enabled && lang === "en") setLang("ar");
  }, [settings, lang, setLang]);
  // Block body: in recent Chromium scrollTo() returns a Promise, which React rejects as an effect cleanup.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t("skipToContent")}
      </a>
      {settings && <TopBar settings={settings} />}
      <Header settings={settings} />
      <main id="main" className="flex-1" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer settings={settings} />
      {settings?.whatsapp && <WhatsAppButton number={settings.whatsapp} />}
      {settings && <OrganizationJsonLd settings={settings} />}
    </div>
  );
}

function OrganizationJsonLd({ settings }: { settings: SiteSettings }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: settings.name,
    alternateName: settings.name_en || undefined,
    url: window.location.origin,
    logo: settings.logo || undefined,
    email: settings.email || undefined,
    telephone: settings.phone || undefined,
    address: settings.address || undefined,
    foundingDate: settings.registered_on || (settings.founded_year ? String(settings.founded_year) : undefined),
    sameAs: [settings.x_url, settings.instagram_url, settings.linkedin_url, settings.youtube_url, settings.facebook_url].filter(Boolean),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
