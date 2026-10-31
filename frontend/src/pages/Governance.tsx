import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";

import { Seo } from "@/components/Seo";
import { Async, Empty, PageHeader, Tabs } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";
import type { DocumentItem } from "@/lib/types";

export const DOC_CATEGORIES: { value: string; ar: string; en: string }[] = [
  { value: "annual_report", ar: "التقارير السنوية", en: "Annual Reports" },
  { value: "financial", ar: "القوائم المالية", en: "Financial Statements" },
  { value: "auditor", ar: "تقارير المراجع الخارجي", en: "External Auditor Reports" },
  { value: "performance", ar: "تقارير الأداء", en: "Performance Reports" },
  { value: "policy", ar: "السياسات واللوائح", en: "Policies & Regulations" },
  { value: "bylaws", ar: "اللائحة الأساسية", en: "Bylaws" },
  { value: "license", ar: "التراخيص والشهادات", en: "Licenses & Certificates" },
  { value: "general_assembly", ar: "محاضر اجتماعات الهيئة العامة", en: "General Assembly Minutes" },
  { value: "other", ar: "أخرى", en: "Other" },
];

export default function Governance() {
  const { t, lang, pick, formatDate } = useI18n();
  const { data: settings } = useSettings();
  const query = usePublic<DocumentItem[]>("/documents/");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");

  const docs = query.data ?? [];
  const available = useMemo(() => DOC_CATEGORIES.filter((c) => docs.some((d) => d.category === c.value)), [docs]);
  const years = useMemo(() => [...new Set(docs.map((d) => d.year).filter(Boolean))].sort((a, b) => b! - a!), [docs]);
  const filtered = docs.filter((d) => (!category || d.category === category) && (!year || String(d.year) === year));
  const label = (c: string) => DOC_CATEGORIES.find((x) => x.value === c)?.[lang] ?? c;

  return (
    <>
      <Seo title={t("governance")} description={t("governanceIntro")} />
      <PageHeader title={t("governance")} intro={t("governanceIntro")} crumbs={[{ label: t("governance") }]} />
      <section className="section">
        <div className="container-x">
          {settings?.license_number && (
            <div className="mb-10 grid gap-4 sm:grid-cols-3">
              <div className="card p-5"><p className="text-sm text-muted">{t("licensed")}</p><p className="mt-1 text-lg font-bold">{settings.license_number}</p></div>
              {settings.supervisor && <div className="card p-5"><p className="text-sm text-muted">{t("supervisedBy")}</p><p className="mt-1 font-bold">{pick(settings, "supervisor")}</p></div>}
              {settings.founded_year && <div className="card p-5"><p className="text-sm text-muted">{t("year")}</p><p className="mt-1 text-lg font-bold">{settings.founded_year}</p></div>}
            </div>
          )}
          <Async query={query}>
            {() => (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <Tabs label={t("category")} value={category} onChange={setCategory}
                    options={[{ value: "", label: t("all") }, ...available.map((c) => ({ value: c.value, label: c[lang] }))]} />
                  {years.length > 1 && (
                    <select aria-label={t("year")} value={year} onChange={(e) => setYear(e.target.value)} className="input w-auto">
                      <option value="">{t("year")}: {t("all")}</option>
                      {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                    </select>
                  )}
                </div>
                {filtered.length ? (
                  <ul className="grid gap-4 md:grid-cols-2">
                    {filtered.map((d) => (
                      <li key={d.id} className="card flex items-start gap-4 p-5">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                          <FileText className="size-6" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-secondary-ink">{label(d.category)}{d.year ? ` · ${d.year}` : ""}</p>
                          <h2 className="mt-1 font-bold">{pick(d, "title")}</h2>
                          {d.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{d.description}</p>}
                          <p className="mt-1 text-xs text-muted">{formatDate(d.published_at)}</p>
                        </div>
                        <a href={d.file} target="_blank" rel="noopener noreferrer" className="btn-outline shrink-0 px-3!" aria-label={`${t("download")}: ${pick(d, "title")}`}>
                          <Download className="size-4" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : <Empty text={t("noDocs")} />}
              </>
            )}
          </Async>
        </div>
      </section>
    </>
  );
}
