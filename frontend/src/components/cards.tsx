import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, Clock, MapPin, Users } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { CourseSummary, Opportunity, PostSummary, ProgramSummary, Service } from "@/lib/types";
import { Icon } from "./Icon";
import { Img } from "./ui";

export function Arrow({ className = "size-4" }: { className?: string }) {
  const { dir } = useI18n();
  const Cmp = dir === "rtl" ? ArrowLeft : ArrowRight;
  return <Cmp className={className} aria-hidden="true" />;
}

const statusStyle = {
  ongoing: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  upcoming: "bg-amber-50 text-amber-700",
} as const;

export function ProgramCard({ program }: { program: ProgramSummary }) {
  const { t, pick, formatNumber } = useI18n();
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Img src={program.cover} alt="" className="size-full transition-transform duration-500 group-hover:scale-105" />
        {!program.cover && (
          <span className="absolute inset-0 flex items-center justify-center text-primary/60">
            <Icon name={program.icon} className="size-14" />
          </span>
        )}
        <span className={`absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[program.status]}`}>
          {t(program.status)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold text-secondary-ink">{t(program.kind)}</p>
        <h3 className="mt-1 text-lg font-bold">
          <Link to={`/programs/${program.slug}`} className="after:absolute after:inset-0 hover:text-primary">
            {pick(program, "title")}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{pick(program, "summary")}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          {program.beneficiaries_count ? (
            <span className="flex items-center gap-1.5 text-primary">
              <Users className="size-4" aria-hidden="true" /> {formatNumber(program.beneficiaries_count)} {t("beneficiaries")}
            </span>
          ) : <span />}
          <span className="flex items-center gap-1 font-semibold text-primary">{t("learnMore")} <Arrow /></span>
        </div>
      </div>
    </article>
  );
}

export function PostCard({ post }: { post: PostSummary }) {
  const { t, pick, formatDate } = useI18n();
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="aspect-[16/10] overflow-hidden">
        <Img src={post.cover} alt="" className="size-full transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-semibold text-primary">{t(post.kind)}</span>
          <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        </div>
        <h3 className="mt-3 line-clamp-2 text-lg font-bold">
          <Link to={`/media/${post.slug}`} className="after:absolute after:inset-0 hover:text-primary">{pick(post, "title")}</Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{pick(post, "excerpt")}</p>}
        {post.kind === "event" && post.event_date && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-primary">
            <Calendar className="size-4" aria-hidden="true" /> {formatDate(post.event_date, true)}
          </p>
        )}
      </div>
    </article>
  );
}

export function OpportunityCard({ opp, onApply }: { opp: Opportunity; onApply?: (slug: string) => void }) {
  const { t, pick, formatDate } = useI18n();
  return (
    <article className="card flex h-full flex-col p-6">
      <h3 className="text-lg font-bold">{pick(opp, "title")}</h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{pick(opp, "description")}</p>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink/80">
        {(opp.location || opp.is_remote) && (
          <li className="flex items-center gap-1.5"><MapPin className="size-4 text-secondary" aria-hidden="true" />{opp.is_remote ? t("remote") : opp.location}</li>
        )}
        {opp.start_date && (
          <li className="flex items-center gap-1.5"><Calendar className="size-4 text-secondary" aria-hidden="true" />{formatDate(opp.start_date)}</li>
        )}
        {opp.hours && <li className="flex items-center gap-1.5"><Clock className="size-4 text-secondary" aria-hidden="true" />{opp.hours} {t("hours")}</li>}
        {opp.seats && <li className="flex items-center gap-1.5"><Users className="size-4 text-secondary" aria-hidden="true" />{opp.seats} {t("seats")}</li>}
      </ul>
      {onApply ? (
        <button className="btn-primary mt-5" onClick={() => onApply(opp.slug)}>{t("apply")}</button>
      ) : (
        <Link to={`/volunteer?opportunity=${encodeURIComponent(opp.slug)}#apply`} className="btn-outline mt-5">{t("apply")}</Link>
      )}
    </article>
  );
}

export function CourseCard({ course }: { course: CourseSummary }) {
  const { t, pick, formatDate } = useI18n();
  const start = new Date(course.start_datetime);
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] overflow-hidden">
        <Img src={course.cover} alt="" className="size-full transition-transform duration-500 group-hover:scale-105" />
        <time dateTime={course.start_datetime} className="absolute start-3 top-3 flex flex-col items-center rounded-xl bg-white/95 px-3 py-1.5 text-center leading-tight shadow">
          <span className="text-xl font-bold text-primary">{start.getDate()}</span>
          <span className="text-xs text-muted">{formatDate(course.start_datetime).split(" ").slice(1, 2).join(" ")}</span>
        </time>
        {course.cme_hours && (
          <span className="absolute end-3 top-3 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-ink">
            {Number(course.cme_hours)} {t("cmeHours")}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold text-secondary-ink">{t(course.kind)}</p>
        <h3 className="mt-1 text-lg font-bold">
          <Link to={`/courses/${course.slug}`} className="after:absolute after:inset-0 hover:text-primary">{pick(course, "title")}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{pick(course, "summary")}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-ink/80">
          <li className="flex items-center gap-1.5"><Calendar className="size-4 text-secondary-ink" aria-hidden="true" />{formatDate(course.start_datetime, true)}</li>
          <li className="flex items-center gap-1.5"><MapPin className="size-4 text-secondary-ink" aria-hidden="true" />{course.is_online ? t("online") : course.location || "—"}</li>
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
          <span className="font-semibold text-primary">{course.fee && Number(course.fee) > 0 ? `${Number(course.fee)} ${t("currency")}` : t("free")}</span>
          {!course.is_registration_open ? (
            <span className="text-muted">{t("registrationClosed")}</span>
          ) : course.seats_remaining === 0 ? (
            <span className="text-amber-700">{t("full")}</span>
          ) : course.seats_remaining !== null ? (
            <span className="text-emerald-700">{course.seats_remaining} {t("seatsLeft")}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  const { t, pick } = useI18n();
  return (
    <article className="card group relative flex h-full flex-col p-6 transition-shadow hover:shadow-md">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon name={service.icon} fallback="clipboard" />
      </span>
      <h3 className="mt-4 text-lg font-bold">
        <Link to={`/services/${service.slug}`} className="after:absolute after:inset-0 hover:text-primary">{pick(service, "title")}</Link>
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{pick(service, "summary")}</p>
      <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">{t("applyService")} <Arrow /></span>
    </article>
  );
}
