import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck, Calendar, Eye, FileSearch, GraduationCap, Handshake, IdCard, MapPin, MessageSquare, Rocket, Search,
  ShieldCheck, Star, UserPlus,
} from "lucide-react";

import { Arrow, CourseCard, OpportunityCard, PostCard, ProgramCard, ServiceCard } from "@/components/cards";
import { Icon } from "@/components/Icon";
import { Seo } from "@/components/Seo";
import { Async, Counter, Img, Reveal, SectionHeading } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";
import type { Banner, HomeData, Partner, SiteSettings, Statistic } from "@/lib/types";

function Hero({ banners, settings }: { banners: Banner[]; settings?: SiteSettings }) {
  const { t, pick } = useI18n();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % banners.length), 7000);
    return () => window.clearInterval(id);
  }, [banners.length]);

  // No banners yet: the association's brand slide built from its own settings.
  if (!banners.length) {
    return (
      <section className="relative isolate overflow-hidden text-white">
        <BrandSlide settings={settings} title={pick(settings, "name")} subtitle={pick(settings, "tagline")} heading="h1"
          action={<Link to="/about" className="btn-secondary">{t("learnMore")} <Arrow /></Link>} />
      </section>
    );
  }

  return (
    <section className="relative isolate overflow-hidden bg-ink text-white" aria-roledescription="carousel" aria-label={t("home")}>
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`transition-opacity duration-700 ${i === index ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0"}`}
          aria-hidden={i !== index}
          role="group"
          aria-roledescription="slide"
        >
          {b.layout === "brand" ? (
            <BrandSlide settings={settings} title={pick(b, "title")} subtitle={pick(b, "subtitle")} image={b.image}
              heading={i === 0 ? "h1" : "h2"} action={<BannerButton banner={b} active={i === index} />} />
          ) : b.layout === "artwork" ? (
            <ArtworkSlide banner={b} heading={i === 0 ? "h1" : "h2"} active={i === index} priority={i === 0} />
          ) : (
            <div className={`${SLIDE_FRAME} relative isolate flex items-center`}>
              {b.image && <img src={b.image} alt="" className="absolute inset-0 -z-10 size-full object-cover" fetchPriority={i === 0 ? "high" : "low"} />}
              <div className="absolute inset-0 -z-10 bg-gradient-to-l from-black/75 via-black/50 to-black/20 rtl:bg-gradient-to-r" />
              {/* On phones the text spans the full width, so darken the whole image for legibility */}
              <div className="absolute inset-0 -z-10 bg-black/40 sm:hidden" />
              <div className="container-x flex flex-col justify-center py-20">
                {i === 0 ? (
                  <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{pick(b, "title")}</h1>
                ) : (
                  <h2 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">{pick(b, "title")}</h2>
                )}
                {b.subtitle && <p className="mt-5 max-w-2xl text-lg text-white/90">{pick(b, "subtitle")}</p>}
                <div className="mt-8"><BannerButton banner={b} active={i === index} /></div>
              </div>
            </div>
          )}
        </div>
      ))}
      {banners.length > 1 && (
        <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
          {banners.map((b, i) => (
            <button
              key={b.id}
              aria-label={`${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-8 bg-secondary" : "w-2.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Every slide shares this frame so the carousel never changes height between slides:
 * the ready-made designs' 1672×941 ratio on large screens, a fixed minimum on phones.
 */
// A compact hero on large screens: full width, about a third of the width tall (shorter than a 16:9
// design), never taller than the screen below the header (7.75rem = top bar + header).
const SLIDE_FRAME = "w-full min-h-[520px] lg:h-[clamp(480px,36vw,calc(100svh-7.75rem))]";

/**
 * A finished design whose text is part of the image. Large screens show it untouched
 * (never cropped) and the whole slide is the link; phones also get the text as real
 * HTML underneath, because the lettering inside a 16:9 image is too small to read there.
 * Title/subtitle double as alt text for screen readers and search engines.
 */
function ArtworkSlide({ banner, heading, active, priority }: { banner: Banner; heading: "h1" | "h2"; active: boolean; priority: boolean }) {
  const { pick } = useI18n();
  const Heading = heading;
  const title = pick(banner, "title");
  const subtitle = pick(banner, "subtitle");
  const link = banner.button_link;
  // lg+ "cover" fills the width and trims the design's top/bottom; "contain" keeps it whole and
  // fills the sides with a blurred, stretched copy (each side continues the design's own edge).
  const contain = banner.fit === "contain";
  const picture = (
    <picture className="block size-full">
      {banner.image_mobile && <source media="(max-width: 1023px)" srcSet={banner.image_mobile} />}
      <img src={banner.image ?? ""} alt={subtitle ? `${title} — ${subtitle}` : title}
        className={`mx-auto h-auto w-full object-contain lg:size-full ${contain ? "" : "lg:object-cover"}`} fetchPriority={priority ? "high" : "low"} />
    </picture>
  );
  return (
    <div className={`${SLIDE_FRAME} relative isolate flex flex-col overflow-hidden bg-[#0d1626] lg:block`}>
      {contain && banner.image && (
        <img src={banner.image} alt="" aria-hidden="true"
          className="absolute inset-0 -z-10 hidden size-full scale-110 object-fill blur-3xl brightness-75 lg:block" />
      )}
      {/* lg+: the design itself is the whole slide and a single link */}
      {link ? (
        link.startsWith("/") ? (
          <Link to={link} tabIndex={active ? 0 : -1} aria-label={title} className="block lg:size-full">{picture}</Link>
        ) : (
          <a href={link} target="_blank" rel="noopener noreferrer" tabIndex={active ? 0 : -1} aria-label={title} className="block lg:size-full">{picture}</a>
        )
      ) : picture}
      {/* lg+: heading for screen readers only (the visible text is inside the image) */}
      <Heading className="sr-only max-lg:hidden">{title}</Heading>
      {/* Phones/tablets: readable caption below the artwork (display:none on lg, so never duplicated) */}
      <div className="container-x flex flex-1 flex-col items-center justify-center gap-3 pt-6 pb-14 text-center lg:hidden">
        <Heading className="text-2xl font-bold">{title}</Heading>
        {subtitle && <p className="text-white/85">{subtitle}</p>}
        <BannerButton banner={banner} active={active} />
      </div>
    </div>
  );
}

function BannerButton({ banner, active }: { banner: Banner; active: boolean }) {
  const { pick } = useI18n();
  if (!banner.button_text || !banner.button_link) return null;
  const tab = active ? 0 : -1;
  return banner.button_link.startsWith("/") ? (
    <Link to={banner.button_link} className="btn-secondary" tabIndex={tab}>{pick(banner, "button_text")} <Arrow /></Link>
  ) : (
    <a href={banner.button_link} className="btn-secondary" target="_blank" rel="noopener noreferrer" tabIndex={tab}>{pick(banner, "button_text")} <Arrow /></a>
  );
}

function GoldDivider({ wide = false }: { wide?: boolean }) {
  return (
    <span className="flex items-center justify-center gap-3 text-secondary" aria-hidden="true">
      <span className={`h-px bg-secondary/70 ${wide ? "w-24 sm:w-40" : "w-12 sm:w-20"}`} />
      <Star className="size-3.5 fill-current" />
      <span className={`h-px bg-secondary/70 ${wide ? "w-24 sm:w-40" : "w-12 sm:w-20"}`} />
    </span>
  );
}

/**
 * Recreates the association's launch design in HTML: logo, bilingual name,
 * gold divider and a headline whose last word is gold ("انطلقنا لنُمكّن").
 */
function BrandSlide({ settings, title, subtitle, image, heading, action }: {
  settings?: SiteSettings; title: string; subtitle?: string; image?: string | null; heading: "h1" | "h2"; action?: ReactNode;
}) {
  const words = title.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;
  const Heading = heading;
  const logo = settings?.logo_light || settings?.logo;
  return (
    <div className={`${SLIDE_FRAME} relative isolate flex bg-[#0d1626]`}>
      {image && <img src={image} alt="" className="absolute inset-0 -z-10 size-full object-cover opacity-25" />}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--brand-primary)_70%,transparent),transparent_70%)]" />
      {/* Decorative heartbeat and wave lines, as in the launch post */}
      <svg className="absolute inset-x-0 bottom-10 -z-10 h-40 w-full text-white/10" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 110 H420 l20 -70 l25 120 l22 -90 l18 40 H760 l18 -50 l22 85 l20 -35 H1200" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M0 140 C300 60 600 160 1200 70" fill="none" stroke="var(--brand-secondary)" strokeOpacity=".25" strokeWidth="1.5" />
        <path d="M0 150 C350 90 700 170 1200 95" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      {/* lg+ is compact to fit the shorter hero; xl gets back some breathing room */}
      <div className="container-x flex flex-col items-center justify-center gap-5 py-14 text-center sm:gap-6 lg:gap-3 lg:py-8 xl:gap-4">
        {logo && (
          <img src={logo} alt="" className="size-28 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,.06),0_20px_50px_rgba(0,0,0,.45)] lg:size-20 xl:size-28" fetchPriority="high" />
        )}
        {settings && (
          <div className="space-y-2">
            <p className="text-lg font-bold sm:text-2xl">{settings.name}</p>
            <GoldDivider wide />
            {settings.name_en && <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary sm:text-xs sm:tracking-[0.12em]" dir="ltr">{settings.name_en}</p>}
          </div>
        )}
        <Heading className="mt-4 text-5xl font-bold leading-tight sm:mt-6 sm:text-6xl lg:mt-2 lg:text-5xl xl:text-6xl">
          {words.join(" ")}{last && <> <span className="text-secondary">{last}</span></>}
        </Heading>
        {subtitle && (
          <div className="space-y-3">
            <p className="text-lg text-white/90 sm:text-2xl lg:text-xl xl:text-2xl">{subtitle}</p>
            <GoldDivider />
          </div>
        )}
        {action && <div className="mt-2 lg:mt-0 lg:mb-6">{action}</div>}
      </div>
    </div>
  );
}

function TrustBar({ settings }: { settings: SiteSettings }) {
  const { t, pick } = useI18n();
  if (!settings.license_number && !settings.supervisor) return null;
  return (
    <div className="border-b border-line bg-sand">
      <div className="container-x flex flex-col items-center justify-between gap-3 py-4 text-sm sm:flex-row">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
          <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
          {settings.license_number && <>{t("licensed")} <strong>{settings.license_number}</strong></>}
          {settings.supervisor && <span className="text-muted">— {t("supervisedBy")} {pick(settings, "supervisor")}</span>}
        </p>
        <Link to="/governance" className="flex items-center gap-1 font-semibold text-primary hover:underline">{t("governance")} <Arrow /></Link>
      </div>
    </div>
  );
}

function AboutBlock({ settings }: { settings: SiteSettings }) {
  const { t, pick } = useI18n();
  if (!settings.about_short && !settings.vision && !settings.mission) return null;
  return (
    <section className="section">
      <div className="container-x grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <p className="eyebrow">{t("aboutUs")}</p>
          <h2 className="section-title mt-1">{pick(settings, "name")}</h2>
          {settings.about_short && <p className="prose-text mt-5 text-muted">{pick(settings, "about_short")}</p>}
          <Link to="/about" className="btn-outline mt-6">{t("learnMore")} <Arrow /></Link>
        </Reveal>
        <Reveal className="grid gap-4 sm:grid-cols-2">
          {settings.about_image && (
            <Img src={settings.about_image} alt="" className="aspect-[4/3] w-full rounded-2xl sm:col-span-2" />
          )}
          {settings.vision && (
            <div className="card p-6">
              <Eye className="size-7 text-secondary" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{t("vision")}</h3>
              <p className="mt-2 text-sm text-muted">{pick(settings, "vision")}</p>
            </div>
          )}
          {settings.mission && (
            <div className="card p-6">
              <Rocket className="size-7 text-secondary" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{t("mission")}</h3>
              <p className="mt-2 text-sm text-muted">{pick(settings, "mission")}</p>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

export function StatsGrid({ stats, dark = true }: { stats: Statistic[]; dark?: boolean }) {
  const { pick, formatNumber, formatDate, t } = useI18n();
  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <li key={s.id} className={`rounded-2xl p-6 text-center ${dark ? "bg-white/10" : "card"}`}>
          <span className={`mx-auto flex size-12 items-center justify-center rounded-full ${dark ? "bg-white/10 text-secondary" : "bg-primary-soft text-primary"}`}>
            <Icon name={s.icon} />
          </span>
          <p className={`mt-4 text-3xl font-bold sm:text-4xl ${dark ? "text-white" : "text-primary"}`} dir="ltr">
            {s.prefix}<Counter value={s.value} format={formatNumber} />{pick(s, "suffix")}
          </p>
          <p className={`mt-2 font-medium ${dark ? "text-white/85" : "text-ink"}`}>{pick(s, "label")}</p>
          {s.description && <p className={`mt-1 text-xs ${dark ? "text-white/65" : "text-muted"}`}>{pick(s, "description")}</p>}
          {s.as_of && <p className={`mt-1 text-xs ${dark ? "text-white/55" : "text-muted"}`}>{t("asOf")} {formatDate(s.as_of)}</p>}
        </li>
      ))}
    </ul>
  );
}

const QUICK_LINKS = [
  { to: "/membership", key: "joinMembership", Icon: IdCard },
  { to: "/courses", key: "courses", Icon: GraduationCap },
  { to: "/certificates", key: "certificates", Icon: ShieldCheck },
  { to: "/track", key: "track", Icon: Search },
  { to: "/services", key: "services", Icon: FileSearch },
  { to: "/volunteer", key: "volunteer", Icon: UserPlus },
  { to: "/partners#request", key: "becomePartner", Icon: Handshake },
  { to: "/contact", key: "contact", Icon: MessageSquare },
] as const;

export function PartnerLogos({ partners }: { partners: Partner[] }) {
  const { pick } = useI18n();
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {partners.map((p) => {
        const logo = <img src={p.logo} alt={pick(p, "name")} loading="lazy" className="max-h-16 w-auto object-contain grayscale transition hover:grayscale-0" />;
        return (
          <li key={p.id} className="card flex h-28 items-center justify-center p-4">
            {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" title={pick(p, "name")}>{logo}</a> : logo}
          </li>
        );
      })}
    </ul>
  );
}

export default function Home() {
  const { t, pick, formatDate } = useI18n();
  const { data: settings } = useSettings();
  const home = usePublic<HomeData>("/home/");

  return (
    <>
      <Seo />
      <Async query={home}>
        {(data) => (
          <>
            <Hero banners={data.banners} settings={settings} />
            {settings && <TrustBar settings={settings} />}
            {settings && <AboutBlock settings={settings} />}

            {data.statistics.length > 0 && (
              <section className="section pattern-bg" aria-labelledby="impact-title">
                <div className="container-x">
                  <div className="mb-10 text-center">
                    <p className="eyebrow">{t("impact")}</p>
                    <h2 id="impact-title" className="section-title mt-1 text-white!">{t("ourImpact")}</h2>
                  </div>
                  <StatsGrid stats={data.statistics} />
                  <div className="mt-8 text-center">
                    <Link to="/impact" className="btn border border-white/40 text-white hover:bg-white/10">{t("viewAll")} <Arrow /></Link>
                  </div>
                </div>
              </section>
            )}

            {data.courses.length > 0 && (
              <section className="section">
                <div className="container-x">
                  <SectionHeading eyebrow={t("courses")} title={t("upcomingCourses")} action={<Link to="/courses" className="btn-outline">{t("viewAll")} <Arrow /></Link>} />
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.courses.map((c) => <Reveal as="li" key={c.id}><CourseCard course={c} /></Reveal>)}
                  </ul>
                </div>
              </section>
            )}

            {data.programs.length > 0 && (
              <section className={`section ${data.courses.length ? "bg-sand" : ""}`}>
                <div className="container-x">
                  <SectionHeading eyebrow={t("programs")} title={t("ourPrograms")} action={<Link to="/programs" className="btn-outline">{t("viewAll")} <Arrow /></Link>} />
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.programs.map((p) => <Reveal as="li" key={p.id}><ProgramCard program={p} /></Reveal>)}
                  </ul>
                </div>
              </section>
            )}

            <section className="section pattern-soft">
              <div className="container-x">
                <SectionHeading eyebrow={t("services")} title={t("quickServices")} />
                {data.services.length > 0 && (
                  <ul className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.services.map((s) => <li key={s.id}><ServiceCard service={s} /></li>)}
                  </ul>
                )}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {QUICK_LINKS.map(({ to, key, Icon: I }) => (
                    <li key={to}>
                      <Link to={to} className="card flex h-full flex-col items-center gap-3 p-5 text-center font-semibold transition hover:-translate-y-0.5 hover:border-primary hover:text-primary">
                        <I className="size-7 text-primary" aria-hidden="true" />
                        {t(key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {(data.posts.length > 0 || data.upcoming_event) && (
              <section className="section">
                <div className="container-x">
                  <SectionHeading eyebrow={t("media")} title={t("latestNews")} action={<Link to="/media" className="btn-outline">{t("viewAll")} <Arrow /></Link>} />
                  {data.upcoming_event && (
                    <Link to={`/media/${data.upcoming_event.slug}`} className="mb-8 flex flex-col gap-4 rounded-2xl bg-secondary-soft p-6 transition hover:shadow-md sm:flex-row sm:items-center">
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-ink">
                        <Calendar className="size-7" aria-hidden="true" />
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-ink/70">{t("upcomingEvent")}</p>
                        <p className="text-lg font-bold">{pick(data.upcoming_event, "title")}</p>
                        <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-ink/75">
                          <span>{formatDate(data.upcoming_event.event_date, true)}</span>
                          {data.upcoming_event.event_location && (
                            <span className="flex items-center gap-1"><MapPin className="size-4" aria-hidden="true" />{data.upcoming_event.event_location}</span>
                          )}
                        </p>
                      </div>
                      <Arrow className="hidden size-5 sm:block" />
                    </Link>
                  )}
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.posts.map((p) => <Reveal as="li" key={p.id}><PostCard post={p} /></Reveal>)}
                  </ul>
                </div>
              </section>
            )}

            {data.opportunities.length > 0 && (
              <section className="section bg-sand">
                <div className="container-x">
                  <SectionHeading eyebrow={t("volunteer")} title={t("volunteerOpps")} action={<Link to="/volunteer" className="btn-outline">{t("viewAll")} <Arrow /></Link>} />
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.opportunities.map((o) => <li key={o.id}><OpportunityCard opp={o} /></li>)}
                  </ul>
                </div>
              </section>
            )}

            {data.partners.length > 0 && (
              <section className="section">
                <div className="container-x">
                  <SectionHeading eyebrow={t("partners")} title={t("ourPartners")} action={<Link to="/partners#request" className="btn-outline">{t("becomePartner")} <Arrow /></Link>} />
                  <PartnerLogos partners={data.partners} />
                </div>
              </section>
            )}

            <section className="pb-16 sm:pb-20">
              <div className="container-x">
                <div className="pattern-bg flex flex-col items-center gap-6 rounded-3xl px-6 py-14 text-center text-white sm:px-12">
                  <h2 className="text-2xl font-bold sm:text-3xl">{t("ctaTitle")}</h2>
                  <p className="max-w-2xl text-white/85">{t("ctaText")}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/volunteer" className="btn-secondary">{t("volunteerNow")}</Link>
                    <Link to="/partners#request" className="btn border border-white/40 text-white hover:bg-white/10">{t("becomePartner")}</Link>
                  </div>
                  {settings?.name && <span className="sr-only">{pick(settings, "name")}</span>}
                </div>
              </div>
            </section>
          </>
        )}
      </Async>
    </>
  );
}
