import { Eye, FileText, Rocket } from "lucide-react";

import { Icon } from "@/components/Icon";
import { Seo } from "@/components/Seo";
import { Async, Img, PageHeader, Reveal, SectionHeading } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";
import type { AboutItem, BoardMember, DocumentItem } from "@/lib/types";

type AboutData = { goals: AboutItem[]; values: AboutItem[]; board: BoardMember[]; executives: BoardMember[]; licenses: DocumentItem[] };

function Members({ title, members }: { title: string; members: BoardMember[] }) {
  const { pick } = useI18n();
  if (!members.length) return null;
  return (
    <section className="section">
      <div className="container-x">
        <SectionHeading title={title} />
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m) => (
            <li key={m.id} className="card overflow-hidden text-center">
              <Img src={m.photo} alt={pick(m, "name")} className="aspect-square w-full" />
              <div className="p-4">
                <p className="font-bold">{pick(m, "name")}</p>
                <p className="mt-1 text-sm text-secondary-ink">{pick(m, "position")}</p>
                {m.bio && <p className="mt-2 line-clamp-3 text-xs text-muted">{pick(m, "bio")}</p>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function About() {
  const { t, pick } = useI18n();
  const { data: settings } = useSettings();
  const about = usePublic<AboutData>("/about/");

  return (
    <>
      <Seo title={t("about")} description={pick(settings, "about_short")} />
      <PageHeader title={t("about")} intro={pick(settings, "about_short")} crumbs={[{ label: t("about") }]} />

      {settings?.about_full && (
        <section className="section">
          <div className="container-x grid items-start gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SectionHeading eyebrow={t("aboutUs")} title={pick(settings, "name")} />
              <p className="prose-text">{pick(settings, "about_full")}</p>
            </div>
            {settings.about_image && <Img src={settings.about_image} alt="" className="aspect-[4/3] w-full rounded-2xl lg:col-span-2" />}
          </div>
        </section>
      )}

      {(settings?.vision || settings?.mission) && (
        <section className="pattern-soft py-14">
          <div className="container-x grid gap-6 md:grid-cols-2">
            {settings.vision && (
              <Reveal className="card p-8">
                <Eye className="size-9 text-secondary" aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-bold">{t("vision")}</h2>
                <p className="prose-text mt-3 text-muted">{pick(settings, "vision")}</p>
              </Reveal>
            )}
            {settings.mission && (
              <Reveal className="card p-8">
                <Rocket className="size-9 text-secondary" aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-bold">{t("mission")}</h2>
                <p className="prose-text mt-3 text-muted">{pick(settings, "mission")}</p>
              </Reveal>
            )}
          </div>
        </section>
      )}

      <Async query={about}>
        {(data) => (
          <>
            {data.goals.length > 0 && (
              <section className="section">
                <div className="container-x">
                  <SectionHeading title={t("goals")} />
                  <ol className="grid gap-5 md:grid-cols-2">
                    {data.goals.map((g, i) => (
                      <li key={g.id} className="card flex gap-4 p-6">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">{i + 1}</span>
                        <div>
                          <h3 className="font-bold">{pick(g, "title")}</h3>
                          {g.description && <p className="mt-1 text-sm text-muted">{pick(g, "description")}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {data.values.length > 0 && (
              <section className="section bg-sand">
                <div className="container-x">
                  <SectionHeading title={t("values")} />
                  <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {data.values.map((v) => (
                      <li key={v.id} className="card p-6 text-center">
                        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                          <Icon name={v.icon} className="size-7" />
                        </span>
                        <h3 className="mt-4 font-bold">{pick(v, "title")}</h3>
                        {v.description && <p className="mt-2 text-sm text-muted">{pick(v, "description")}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            <Members title={t("board")} members={data.board} />
            <Members title={t("executives")} members={data.executives} />

            {settings?.org_structure_image && (
              <section className="section bg-sand">
                <div className="container-x">
                  <SectionHeading title={t("orgStructure")} />
                  <a href={settings.org_structure_image} target="_blank" rel="noopener noreferrer">
                    <img src={settings.org_structure_image} alt={t("orgStructure")} loading="lazy" className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-4" />
                  </a>
                </div>
              </section>
            )}

            {data.licenses.length > 0 && (
              <section className="section">
                <div className="container-x">
                  <SectionHeading title={t("licenses")} />
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.licenses.map((d) => (
                      <li key={d.id}>
                        <a href={d.file} target="_blank" rel="noopener noreferrer" className="card flex items-center gap-4 p-5 hover:border-primary">
                          <FileText className="size-8 shrink-0 text-primary" aria-hidden="true" />
                          <span className="font-semibold">{pick(d, "title")}</span>
                        </a>
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
