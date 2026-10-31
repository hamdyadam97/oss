import { Link } from "react-router-dom";
import { Users } from "lucide-react";

import { Arrow } from "@/components/cards";
import { Seo } from "@/components/Seo";
import { Async, BulletList, Empty, Img, PageHeader, SectionHeading } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { lines, useI18n } from "@/lib/i18n";
import type { Program, Statistic } from "@/lib/types";
import { StatsGrid } from "./Home";

export default function Impact() {
  const { t, pick, formatNumber } = useI18n();
  const query = usePublic<{ statistics: Statistic[]; programs: Program[] }>("/impact/");

  return (
    <>
      <Seo title={t("impact")} description={t("impactIntro")} />
      <PageHeader title={t("impact")} intro={t("impactIntro")} crumbs={[{ label: t("impact") }]} />
      <Async query={query}>
        {(data) => (
          <>
            <section className="section">
              <div className="container-x">
                {data.statistics.length ? <StatsGrid stats={data.statistics} dark={false} /> : <Empty />}
              </div>
            </section>
            {data.programs.length > 0 && (
              <section className="section bg-sand">
                <div className="container-x">
                  <SectionHeading title={t("results")} />
                  <ul className="space-y-6">
                    {data.programs.map((p) => (
                      <li key={p.id} className="card grid overflow-hidden md:grid-cols-3">
                        <Img src={p.cover} alt="" className="aspect-[16/10] w-full md:aspect-auto md:h-full" />
                        <div className="p-6 md:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-lg font-bold">{pick(p, "title")}</h3>
                            {p.beneficiaries_count != null && (
                              <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
                                <Users className="size-4" aria-hidden="true" />{formatNumber(p.beneficiaries_count)} {t("beneficiaries")}
                              </span>
                            )}
                          </div>
                          {lines(pick(p, "results")).length > 0 && (
                            <div className="mt-4 text-sm"><BulletList items={lines(pick(p, "results"))} /></div>
                          )}
                          <Link to={`/programs/${p.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{t("learnMore")} <Arrow /></Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </Async>
    </>
  );
}
