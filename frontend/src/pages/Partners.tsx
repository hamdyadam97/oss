import { useEffect, useState } from "react";
import { Building2, Copy, HeartHandshake } from "lucide-react";

import {
  ConsentField, FileField, FormError, SelectField, SubmitButton, SuccessBox, TextArea, TextField, usePublicForm,
} from "@/components/forms";
import { Seo } from "@/components/Seo";
import { Async, Empty, PageHeader, SectionHeading } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";
import type { Paginated, Partner, ProgramSummary } from "@/lib/types";
import { PartnerLogos } from "./Home";

const KINDS = [
  { value: "partnership", ar: "شراكة", en: "Partnership" },
  { value: "sponsorship", ar: "رعاية", en: "Sponsorship" },
  { value: "in_kind", ar: "دعم عيني", en: "In-kind support" },
  { value: "csr", ar: "مسؤولية اجتماعية", en: "CSR" },
  { value: "other", ar: "أخرى", en: "Other" },
];

const PARTNER_GROUPS: { kind: Partner["kind"]; ar: string; en: string }[] = [
  { kind: "strategic", ar: "الشركاء الاستراتيجيون", en: "Strategic Partners" },
  { kind: "partner", ar: "الشركاء", en: "Partners" },
  { kind: "supporter", ar: "الداعمون", en: "Supporters" },
  { kind: "sponsor", ar: "الرعاة", en: "Sponsors" },
];

function DonationBox() {
  const { t, pick } = useI18n();
  const { data: s } = useSettings();
  const [copied, setCopied] = useState(false);
  if (!s?.donations_enabled) return null;
  return (
    <section id="donate" className="section scroll-mt-24 pattern-soft">
      <div className="container-x">
        <SectionHeading title={t("donate")} />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <HeartHandshake className="size-9 text-secondary" aria-hidden="true" />
            {s.donation_note && <p className="prose-text mt-3 text-sm">{pick(s, "donation_note")}</p>}
            {s.donation_url && (
              <a href={s.donation_url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5">{t("donateNow")}</a>
            )}
          </div>
          {s.iban && (
            <div className="card p-6">
              <Building2 className="size-9 text-secondary" aria-hidden="true" />
              <h3 className="mt-3 font-bold">{t("bankTransfer")}</h3>
              <dl className="mt-3 space-y-2 text-sm">
                {s.bank_name && <div><dt className="inline text-muted">{s.bank_name}</dt></div>}
                {s.bank_account_name && <div><dd className="font-semibold">{s.bank_account_name}</dd></div>}
                <div className="flex items-center gap-2">
                  <dd className="font-mono font-semibold" dir="ltr">{s.iban}</dd>
                  <button className="btn-ghost px-2!" aria-label={t("copy")} onClick={() => navigator.clipboard?.writeText(s.iban ?? "").then(() => setCopied(true))}>
                    <Copy className="size-4" aria-hidden="true" />
                  </button>
                  {copied && <span className="text-xs text-primary">{t("copied")}</span>}
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Partners() {
  const { t, lang, pick } = useI18n();
  const query = usePublic<Partner[]>("/partners/");
  const programs = usePublic<Paginated<ProgramSummary>>("/programs/?page_size=100");
  const form = usePublicForm("partnership");
  const e = form.errors;

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView(), 300);
  }, []);

  return (
    <>
      <Seo title={t("partners")} />
      <PageHeader title={t("partners")} crumbs={[{ label: t("partners") }]} />
      <section className="section">
        <div className="container-x space-y-12">
          <Async query={query}>
            {(partners) =>
              partners.length ? (
                <>
                  {PARTNER_GROUPS.map((g) => {
                    const items = partners.filter((p) => p.kind === g.kind);
                    if (!items.length) return null;
                    return (
                      <div key={g.kind}>
                        <h2 className="mb-5 text-xl font-bold">{g[lang]}</h2>
                        <PartnerLogos partners={items} />
                      </div>
                    );
                  })}
                </>
              ) : <Empty />
            }
          </Async>
        </div>
      </section>

      <DonationBox />

      <section id="request" className="section scroll-mt-24 bg-sand">
        <div className="container-x max-w-3xl">
          {form.code ? (
            <SuccessBox code={form.code} onReset={form.reset} />
          ) : (
            <form onSubmit={form.onSubmit} className="card space-y-5 p-6 sm:p-8">
              <h2 className="text-xl font-bold">{t("partnershipRequest")}</h2>
              <FormError message={form.formError} />
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField name="kind" label={t("requestType")} required errors={e} placeholder="—" options={KINDS.map((k) => ({ value: k.value, label: k[lang] }))} />
                <TextField name="organization" label={t("organization")} required errors={e} autoComplete="organization" />
                <TextField name="contact_name" label={t("contactName")} required errors={e} autoComplete="name" />
                <TextField name="position" label={t("position")} errors={e} />
                <TextField name="email" label={t("email")} type="email" required errors={e} dir="ltr" autoComplete="email" />
                <TextField name="phone" label={t("phone")} type="tel" required errors={e} dir="ltr" hint={t("phoneHint")} />
              </div>
              {(programs.data?.results.length ?? 0) > 0 && (
                <SelectField name="program" label={t("programs")} errors={e} placeholder="—"
                  options={programs.data!.results.map((p) => ({ value: String(p.id), label: pick(p, "title") }))} />
              )}
              <TextArea name="message" label={t("details")} required errors={e} />
              <FileField name="attachment" label={t("attachment")} errors={e} />
              <ConsentField errors={e} />
              <SubmitButton pending={form.pending} />
            </form>
          )}
        </div>
      </section>
    </>
  );
}
