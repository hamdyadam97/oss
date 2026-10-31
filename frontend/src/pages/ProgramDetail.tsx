import { Link, useParams } from "react-router-dom";
import { Calendar, CheckCircle2, Target, Users } from "lucide-react";

import { PostCard } from "@/components/cards";
import { Seo } from "@/components/Seo";
import { Async, BulletList, Img, PageHeader, SectionHeading } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { isNotFound } from "@/lib/api";
import { lines, useI18n } from "@/lib/i18n";
import type { Paginated, PostSummary, Program } from "@/lib/types";
import NotFound from "./NotFound";

export default function ProgramDetail() {
  const { slug = "" } = useParams();
  const { t, pick, formatDate, formatNumber } = useI18n();
  const query = usePublic<Program>(`/programs/${encodeURIComponent(slug)}/`);
  const program = query.data;
  const news = usePublic<Paginated<PostSummary>>(`/posts/?program=${program?.id}&page_size=3`, !!program);

  if (isNotFound(query.error)) return <NotFound />;

  return (
    <Async query={query}>
      {(p) => {
        const goals = lines(pick(p, "goals"));
        const groups = lines(pick(p, "target_groups"));
        const results = lines(pick(p, "results"));
        return (
          <>
            <Seo title={pick(p, "title")} description={pick(p, "summary")} image={p.cover} />
            <PageHeader title={pick(p, "title")} intro={pick(p, "summary")} crumbs={[{ label: t("programs"), to: "/programs" }, { label: pick(p, "title") }]} />
            <section className="section">
              <div className="container-x grid gap-10 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  {p.cover && <Img src={p.cover} alt={pick(p, "title")} className="mb-8 aspect-[16/9] w-full rounded-2xl" />}
                  {p.description && <p className="prose-text">{pick(p, "description")}</p>}

                  {goals.length > 0 && (
                    <div className="mt-10">
                      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Target className="size-6 text-secondary" aria-hidden="true" />{t("programGoals")}</h2>
                      <BulletList items={goals} />
                    </div>
                  )}
                  {results.length > 0 && (
                    <div className="mt-10 rounded-2xl bg-primary-soft p-6">
                      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><CheckCircle2 className="size-6 text-primary" aria-hidden="true" />{t("results")}</h2>
                      <BulletList items={results} icon={<CheckCircle2 className="-mt-1.5 size-4 text-primary" aria-hidden="true" />} />
                    </div>
                  )}
                  {p.images.length > 0 && (
                    <div className="mt-10">
                      <h2 className="mb-4 text-xl font-bold">{t("photos")}</h2>
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {p.images.map((img) => (
                          <li key={img.id}>
                            <a href={img.image} target="_blank" rel="noopener noreferrer">
                              <Img src={img.image} alt={img.caption || pick(p, "title")} className="aspect-square w-full rounded-xl" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <aside className="space-y-6">
                  <div className="card space-y-4 p-6">
                    <p className="flex justify-between"><span className="text-muted">{t("category")}</span><strong>{t(p.kind)}</strong></p>
                    <p className="flex justify-between"><span className="text-muted">{t("status")}</span><strong>{t(p.status)}</strong></p>
                    {p.start_date && (
                      <p className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-muted"><Calendar className="size-4" aria-hidden="true" />{t("date")}</span>
                        <strong className="text-sm">{formatDate(p.start_date)}{p.end_date && ` – ${formatDate(p.end_date)}`}</strong></p>
                    )}
                    {p.beneficiaries_count != null && (
                      <p className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-muted"><Users className="size-4" aria-hidden="true" />{t("beneficiaries")}</span>
                        <strong className="text-xl text-primary">{formatNumber(p.beneficiaries_count)}</strong></p>
                    )}
                  </div>
                  {groups.length > 0 && (
                    <div className="card p-6">
                      <h2 className="mb-4 font-bold">{t("targetGroups")}</h2>
                      <ul className="flex flex-wrap gap-2">
                        {groups.map((g) => <li key={g} className="rounded-full bg-secondary-soft px-3 py-1 text-sm">{g}</li>)}
                      </ul>
                    </div>
                  )}
                  {p.partners.length > 0 && (
                    <div className="card p-6">
                      <h2 className="mb-4 font-bold">{t("partners")}</h2>
                      <ul className="grid grid-cols-2 gap-3">
                        {p.partners.map((pt) => (
                          <li key={pt.id} className="flex h-16 items-center justify-center rounded-xl border border-line p-2">
                            <img src={pt.logo} alt={pick(pt, "name")} className="max-h-12 object-contain" loading="lazy" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <Link to="/volunteer" className="btn-primary">{t("volunteerNow")}</Link>
                    <Link to="/partners#request" className="btn-outline">{t("becomePartner")}</Link>
                  </div>
                </aside>
              </div>
            </section>
            {news.data && news.data.results.length > 0 && (
              <section className="section bg-sand">
                <div className="container-x">
                  <SectionHeading title={t("relatedNews")} />
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {news.data.results.map((n) => <li key={n.id}><PostCard post={n} /></li>)}
                  </ul>
                </div>
              </section>
            )}
          </>
        );
      }}
    </Async>
  );
}
