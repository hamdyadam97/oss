import { useState } from "react";
import { useParams } from "react-router-dom";
import { Award, BadgeCheck, Calendar, Clock, MapPin, Mic, Target, Users } from "lucide-react";

import { CourseCard } from "@/components/cards";
import {
  ConsentField, FormError, SelectField, SubmitButton, SuccessBox, TextField, usePublicForm,
} from "@/components/forms";
import { Seo } from "@/components/Seo";
import { Async, BulletList, Empty, Img, PageHeader, Pagination, SectionHeading, Tabs } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { isNotFound, qs } from "@/lib/api";
import { lines, useI18n, type DictKey } from "@/lib/i18n";
import type { Course, CourseKind, CourseSummary, Paginated } from "@/lib/types";
import NotFound from "./NotFound";

export const PROFESSIONS: { value: string; key: DictKey }[] = [
  { value: "physician", key: "physician" },
  { value: "dentist", key: "dentist" },
  { value: "nurse", key: "nurse" },
  { value: "midwife", key: "midwife" },
  { value: "pharmacist", key: "pharmacist" },
  { value: "allied", key: "allied" },
  { value: "admin", key: "healthAdmin" },
  { value: "student", key: "student" },
  { value: "other", key: "other" },
];

export function useProfessionOptions() {
  const { t } = useI18n();
  return PROFESSIONS.map((p) => ({ value: p.value, label: t(p.key) }));
}

export function CoursesList() {
  const { t } = useI18n();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [kind, setKind] = useState<CourseKind | "">("");
  const [page, setPage] = useState(1);
  const query = usePublic<Paginated<CourseSummary>>(`/courses/${qs({ when, kind, page })}`);

  return (
    <>
      <Seo title={t("courses")} />
      <PageHeader title={t("courses")} crumbs={[{ label: t("courses") }]} />
      <section className="section">
        <div className="container-x">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Tabs label={t("date")} value={when} onChange={(v) => { setWhen(v); setPage(1); }}
              options={[{ value: "upcoming", label: t("upcomingCourses") }, { value: "past", label: t("pastCourses") }]} />
            <select aria-label={t("category")} value={kind} onChange={(e) => { setKind(e.target.value as CourseKind | ""); setPage(1); }} className="input w-auto">
              <option value="">{t("all")}</option>
              {(["course", "workshop", "conference", "symposium", "webinar"] as const).map((k) => <option key={k} value={k}>{t(k)}</option>)}
            </select>
          </div>
          <Async query={query}>
            {(data) =>
              data.results.length ? (
                <>
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.results.map((c) => <li key={c.id}><CourseCard course={c} /></li>)}
                  </ul>
                  <Pagination page={page} count={data.count} onChange={setPage} />
                </>
              ) : <Empty text={when === "upcoming" ? t("noCourses") : undefined} />
            }
          </Async>
        </div>
      </section>
    </>
  );
}

function RegistrationForm({ course }: { course: Course }) {
  const { t } = useI18n();
  const professions = useProfessionOptions();
  const form = usePublicForm("course-registration", (fd) => fd.set("course", course.slug));
  const e = form.errors;

  if (form.code) {
    return (
      <div className="space-y-4">
        {form.result.status_display && (
          <p className={`rounded-xl p-4 text-center ${form.result.status === "waitlisted" ? "bg-amber-50 text-amber-800" : "bg-primary-soft"}`}>
            {t("registrationStatus")}: <strong>{form.result.status_display}</strong>
          </p>
        )}
        <SuccessBox code={form.code} />
      </div>
    );
  }
  if (!course.is_registration_open) {
    return <p className="card p-6 text-center font-semibold text-muted">{t("registrationClosed")}</p>;
  }

  return (
    <form onSubmit={form.onSubmit} className="card space-y-5 p-6 sm:p-8">
      <h2 className="text-xl font-bold">{t("registerTitle")}</h2>
      {course.seats_remaining === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("full")}</p>}
      <FormError message={form.formError || e.course || null} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="full_name" label={t("nameOnCertificate")} required errors={e} autoComplete="name" />
        <TextField name="full_name_en" label={t("nameEn")} errors={e} dir="ltr" />
        <TextField name="national_id" label={t("nationalId")} required errors={e} dir="ltr" />
        <TextField name="phone" label={t("phone")} type="tel" required errors={e} dir="ltr" hint={t("phoneHint")} />
        <TextField name="email" label={t("email")} type="email" required errors={e} dir="ltr" autoComplete="email" />
        <SelectField name="profession" label={t("profession")} required errors={e} placeholder="—" options={professions} />
        <TextField name="specialty" label={t("specialty")} errors={e} />
        <TextField name="license_number" label={t("licenseNumber")} errors={e} dir="ltr" />
        <TextField name="workplace" label={t("workplace")} errors={e} />
        <TextField name="city" label={t("city")} required errors={e} />
      </div>
      <ConsentField errors={e} />
      <SubmitButton pending={form.pending} />
    </form>
  );
}

export function CourseDetail() {
  const { slug = "" } = useParams();
  const { t, pick, formatDate } = useI18n();
  const query = usePublic<Course>(`/courses/${encodeURIComponent(slug)}/`);
  if (isNotFound(query.error)) return <NotFound />;

  return (
    <Async query={query}>
      {(c) => {
        const objectives = lines(pick(c, "objectives"));
        const audience = lines(pick(c, "target_audience"));
        const speakers = lines(c.speakers);
        const money = (v: string | null) => (v && Number(v) > 0 ? `${Number(v)} ${t("currency")}` : t("free"));
        return (
          <>
            <Seo title={pick(c, "title")} description={pick(c, "summary")} image={c.cover} />
            <PageHeader title={pick(c, "title")} intro={pick(c, "summary")} crumbs={[{ label: t("courses"), to: "/courses" }, { label: t(c.kind) }]} />
            <section className="section">
              <div className="container-x grid gap-10 lg:grid-cols-3">
                <div className="space-y-10 lg:col-span-2">
                  {c.cover && <Img src={c.cover} alt={pick(c, "title")} className="aspect-[16/9] w-full rounded-2xl" />}
                  {c.description && <p className="prose-text">{pick(c, "description")}</p>}
                  {objectives.length > 0 && (
                    <div>
                      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Target className="size-6 text-secondary-ink" aria-hidden="true" />{t("objectives")}</h2>
                      <BulletList items={objectives} />
                    </div>
                  )}
                  {speakers.length > 0 && (
                    <div>
                      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Mic className="size-6 text-secondary-ink" aria-hidden="true" />{t("speakers")}</h2>
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {speakers.map((sp) => {
                          const [name, role] = sp.split(/\s+[—-]\s+/);
                          return (
                            <li key={sp} className="card p-4">
                              <p className="font-bold">{name}</p>
                              {role && <p className="text-sm text-muted">{role}</p>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  <div id="register" className="scroll-mt-24"><RegistrationForm course={c} /></div>
                </div>

                <aside className="space-y-6">
                  <div className="card space-y-4 p-6 lg:sticky lg:top-24">
                    <p className="flex items-start gap-3"><Calendar className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{formatDate(c.start_datetime, true)}<br /><span className="text-sm text-muted">← {formatDate(c.end_datetime, true)}</span></span></p>
                    <p className="flex items-center gap-3"><MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />{c.is_online ? t("online") : c.location || "—"}</p>
                    {c.cme_hours && <p className="flex items-center gap-3"><Award className="size-5 shrink-0 text-primary" aria-hidden="true" /><strong>{Number(c.cme_hours)}</strong> {t("cmeHours")}</p>}
                    {c.accreditation && <p className="flex items-center gap-3"><BadgeCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />{t("accreditation")}: {c.accreditation}</p>}
                    {c.seats !== null && (
                      <p className="flex items-center gap-3"><Users className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        {c.seats_remaining === 0 ? t("full") : `${c.seats_remaining} / ${c.seats} ${t("seatsLeft")}`}</p>
                    )}
                    {c.registration_deadline && <p className="flex items-center gap-3"><Clock className="size-5 shrink-0 text-primary" aria-hidden="true" />{t("deadline")}: {formatDate(c.registration_deadline)}</p>}
                    <div className="rounded-xl bg-sand p-4 text-sm">
                      <p className="flex justify-between"><span>{t("fee")}</span><strong>{money(c.fee)}</strong></p>
                      {c.members_fee !== null && <p className="mt-1 flex justify-between"><span>{t("membersFee")}</span><strong>{money(c.members_fee)}</strong></p>}
                    </div>
                    {c.is_registration_open && <a href="#register" className="btn-primary w-full">{t("register")}</a>}
                  </div>
                  {audience.length > 0 && (
                    <div className="card p-6">
                      <h2 className="mb-3 font-bold">{t("audience")}</h2>
                      <ul className="flex flex-wrap gap-2">{audience.map((a) => <li key={a} className="rounded-full bg-secondary-soft px-3 py-1 text-sm">{a}</li>)}</ul>
                    </div>
                  )}
                </aside>
              </div>
            </section>
          </>
        );
      }}
    </Async>
  );
}

export function UpcomingCourses({ courses }: { courses: CourseSummary[] }) {
  const { t } = useI18n();
  if (!courses.length) return null;
  return (
    <>
      <SectionHeading eyebrow={t("courses")} title={t("upcomingCourses")} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => <li key={c.id}><CourseCard course={c} /></li>)}
      </ul>
    </>
  );
}
