import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Clock, Mail, MapPin, Phone, Search as SearchIcon } from "lucide-react";

import { PostCard, ProgramCard } from "@/components/cards";
import { ConsentField, FormError, SubmitButton, SuccessBox, TextArea, TextField, usePublicForm } from "@/components/forms";
import { Seo } from "@/components/Seo";
import { SocialLinks } from "@/components/Social";
import { Async, Empty, PageHeader } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { useSettings } from "@/hooks/useSettings";
import { isNotFound } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { DocumentItem, Faq, PostSummary, ProgramSummary } from "@/lib/types";
import NotFound from "./NotFound";

export function FaqPage() {
  const { t, pick } = useI18n();
  const query = usePublic<Faq[]>("/faqs/");
  return (
    <>
      <Seo title={t("faq")} />
      <PageHeader title={t("faq")} crumbs={[{ label: t("faq") }]} />
      <section className="section">
        <div className="container-x max-w-3xl">
          <Async query={query}>
            {(faqs) =>
              faqs.length ? (
                <div className="space-y-3">
                  {faqs.map((f) => (
                    <details key={f.id} className="card group p-5 open:shadow-md">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                        {pick(f, "question")}
                        <span className="text-xl text-primary transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                      </summary>
                      <p className="prose-text mt-3 text-sm text-muted">{pick(f, "answer")}</p>
                    </details>
                  ))}
                </div>
              ) : <Empty />
            }
          </Async>
        </div>
      </section>
    </>
  );
}

export function Contact() {
  const { t, pick } = useI18n();
  const { data: s } = useSettings();
  const form = usePublicForm("contact");
  const e = form.errors;
  const items = [
    s?.address && { Icon: MapPin, label: t("location"), value: pick(s, "address") },
    s?.phone && { Icon: Phone, label: t("phone"), value: s.phone, href: `tel:${s.phone}`, ltr: true },
    s?.email && { Icon: Mail, label: t("email"), value: s.email, href: `mailto:${s.email}` },
    s?.working_hours && { Icon: Clock, label: t("workingHours"), value: pick(s, "working_hours") },
  ].filter(Boolean) as { Icon: typeof MapPin; label: string; value: string; href?: string; ltr?: boolean }[];

  return (
    <>
      <Seo title={t("contact")} />
      <PageHeader title={t("contact")} crumbs={[{ label: t("contact") }]} />
      <section className="section">
        <div className="container-x grid gap-10 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-2">
            {items.map(({ Icon, label, value, href, ltr }) => (
              <div key={label} className="card flex items-start gap-4 p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                <div>
                  <p className="text-sm text-muted">{label}</p>
                  {href ? <a href={href} className="font-semibold hover:text-primary" dir={ltr ? "ltr" : undefined}>{value}</a> : <p className="font-semibold">{value}</p>}
                </div>
              </div>
            ))}
            {s && <div className="text-primary"><SocialLinks settings={s} iconClass="size-5" /></div>}
            {s?.map_embed_url && (
              <iframe src={s.map_embed_url} title={t("location")} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="aspect-[4/3] w-full rounded-2xl border border-line" />
            )}
            {s?.map_url && <a href={s.map_url} target="_blank" rel="noopener noreferrer" className="btn-outline w-full">{t("openMap")}</a>}
          </div>
          <div className="lg:col-span-3">
            {form.code ? (
              <SuccessBox code={form.code} onReset={form.reset} />
            ) : (
              <form onSubmit={form.onSubmit} className="card space-y-5 p-6 sm:p-8">
                <h2 className="text-xl font-bold">{t("sendMessage")}</h2>
                <FormError message={form.formError} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField name="name" label={t("fullName")} required errors={e} autoComplete="name" />
                  <TextField name="email" label={t("email")} type="email" required errors={e} dir="ltr" autoComplete="email" />
                  <TextField name="phone" label={t("phone")} type="tel" errors={e} dir="ltr" autoComplete="tel" />
                  <TextField name="subject" label={t("subject")} required errors={e} />
                </div>
                <TextArea name="message" label={t("message")} required errors={e} />
                <ConsentField errors={e} />
                <SubmitButton pending={form.pending} />
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export function CmsPage() {
  const { slug = "" } = useParams();
  const { pick } = useI18n();
  const query = usePublic<{ title: string; title_en: string; body: string; body_en: string; seo_description: string }>(`/pages/${encodeURIComponent(slug)}/`);
  if (isNotFound(query.error)) return <NotFound />;
  return (
    <Async query={query}>
      {(page) => (
        <>
          <Seo title={pick(page, "title")} description={page.seo_description} />
          <PageHeader title={pick(page, "title")} crumbs={[{ label: pick(page, "title") }]} />
          <section className="section">
            <div className="container-x max-w-4xl"><div className="prose-text">{pick(page, "body")}</div></div>
          </section>
        </>
      )}
    </Async>
  );
}

type SearchResults = { programs: ProgramSummary[]; posts: PostSummary[]; documents: DocumentItem[] };

export function SearchPage() {
  const { t, pick } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const query = usePublic<SearchResults>(`/search/?q=${encodeURIComponent(q)}`, q.length >= 2);
  const total = query.data ? query.data.programs.length + query.data.posts.length + query.data.documents.length : 0;

  return (
    <>
      <Seo title={t("search")} />
      <PageHeader title={t("search")} crumbs={[{ label: t("search") }]} />
      <section className="section">
        <div className="container-x">
          <form role="search" onSubmit={(e) => { e.preventDefault(); setParams({ q: input.trim() }); }} className="mx-auto mb-10 flex max-w-2xl gap-2">
            <label htmlFor="q" className="sr-only">{t("search")}</label>
            <input id="q" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("searchPlaceholder")} className="input" minLength={2} autoFocus />
            <button className="btn-primary" aria-label={t("search")}><SearchIcon className="size-5" aria-hidden="true" /></button>
          </form>
          {q.length >= 2 && (
            <Async query={query}>
              {(data) =>
                total ? (
                  <div className="space-y-10">
                    {data.programs.length > 0 && (
                      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.programs.map((p) => <li key={p.id}><ProgramCard program={p} /></li>)}</ul>
                    )}
                    {data.posts.length > 0 && (
                      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.posts.map((p) => <li key={p.id}><PostCard post={p} /></li>)}</ul>
                    )}
                    {data.documents.length > 0 && (
                      <ul className="space-y-2">
                        {data.documents.map((d) => (
                          <li key={d.id}><a href={d.file} target="_blank" rel="noopener noreferrer" className="card block p-4 font-semibold hover:border-primary">{pick(d, "title")}</a></li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : <Empty text={t("noResults")} />
              }
            </Async>
          )}
        </div>
      </section>
    </>
  );
}
