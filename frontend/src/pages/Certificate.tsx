import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Printer, ShieldCheck } from "lucide-react";

import { Seo } from "@/components/Seo";
import { Loading, PageHeader } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";
import type { Certificate } from "@/lib/types";

function VerifyForm({ initial = "" }: { initial?: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [code, setCode] = useState(initial);
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) navigate(`/certificates/${encodeURIComponent(code.trim().toUpperCase())}`); }}
      className="card flex flex-col gap-3 p-5 sm:flex-row print:hidden"
    >
      <label htmlFor="cert" className="sr-only">{t("certificateCode")}</label>
      <input id="cert" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CERT-XXXXXXXXXX" dir="ltr" className="input uppercase" required />
      <button className="btn-primary shrink-0"><ShieldCheck className="size-4" aria-hidden="true" />{t("verify")}</button>
    </form>
  );
}

export function CertificateLookup() {
  const { t } = useI18n();
  return (
    <>
      <Seo title={t("certificates")} />
      <PageHeader title={t("certificates")} crumbs={[{ label: t("certificates") }]} />
      <section className="section"><div className="container-x max-w-2xl"><VerifyForm /></div></section>
    </>
  );
}

export function CertificateView() {
  const { code = "" } = useParams();
  const { t, formatDate } = useI18n();
  const { data: settings } = useSettings();
  const query = usePublic<Certificate>(`/certificates/${encodeURIComponent(code)}/`);
  const c = query.data;
  const verifyUrl = `${window.location.origin}/certificates/${code}`;

  return (
    <>
      <Seo title={t("attendanceCertificate")} />
      <meta name="robots" content="noindex" />
      {/* Print as a single landscape A4 page without the site chrome */}
      <style>{`@media print { @page { size: A4 landscape; margin: 0 } body { -webkit-print-color-adjust: exact; print-color-adjust: exact } }`}</style>
      <div className="print:hidden">
        <PageHeader title={t("certificates")} crumbs={[{ label: t("certificates"), to: "/certificates" }, { label: code }]} />
      </div>
      <section className="section print:p-0">
        <div className="container-x max-w-5xl space-y-6 print:max-w-none print:p-0">
          <div className="print:hidden"><VerifyForm initial={code} /></div>
          {query.isLoading && <Loading />}
          {query.isError && <p role="alert" className="rounded-xl bg-red-50 p-5 text-center text-red-700">{t("certificateInvalid")}</p>}
          {c && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <p className="flex items-center gap-2 font-semibold text-emerald-700"><BadgeCheck className="size-5" aria-hidden="true" />{t("certificateValid")}</p>
                <button className="btn-primary" onClick={() => window.print()}><Printer className="size-4" aria-hidden="true" />{t("printCertificate")}</button>
              </div>

              <article dir="rtl" lang="ar" className="relative mx-auto aspect-[297/210] w-full overflow-hidden bg-white text-ink shadow-xl print:h-screen print:w-screen print:shadow-none">
                <div className="absolute inset-3 border-[6px] border-primary sm:inset-5" />
                <div className="absolute inset-5 border border-secondary sm:inset-8" />
                <div className="relative flex h-full flex-col items-center justify-between px-8 py-6 text-center sm:px-16 sm:py-12">
                  <header className="flex flex-col items-center gap-1 sm:gap-2">
                    {settings?.logo && <img src={settings.logo} alt="" className="h-10 sm:h-20" />}
                    <p className="text-xs font-bold text-primary sm:text-lg">{settings?.name}</p>
                    {settings?.name_en && <p className="text-[8px] text-muted sm:text-xs" dir="ltr">{settings.name_en}</p>}
                  </header>

                  <div className="space-y-1 sm:space-y-3">
                    <h1 className="text-xl font-bold text-secondary-ink sm:text-5xl">{t("attendanceCertificate")}</h1>
                    <p className="text-[10px] text-muted sm:text-lg">{t("certifiesThat")}</p>
                    <p className="text-lg font-bold text-primary sm:text-4xl">{c.full_name}</p>
                    {c.full_name_en && <p className="text-[10px] sm:text-xl" dir="ltr">{c.full_name_en}</p>}
                    <p className="text-[10px] text-muted sm:text-lg">{t("attended")} {c.course_kind}</p>
                    <p className="text-sm font-bold sm:text-2xl">«{c.course_title}»</p>
                    <p className="text-[10px] sm:text-base">
                      {t("heldOn")} {formatDate(c.start_datetime)}
                      {c.location && ` — ${c.location}`}
                    </p>
                    {c.cme_hours && (
                      <p className="inline-block rounded-full bg-secondary-soft px-3 py-0.5 text-[10px] font-bold sm:px-5 sm:py-1.5 sm:text-base">
                        {Number(c.cme_hours)} {t("cmeHours")}{c.accreditation && ` — ${c.accreditation}`}
                      </p>
                    )}
                  </div>

                  <footer className="flex w-full items-end justify-between gap-4 text-[8px] text-muted sm:text-xs">
                    <div className="text-start">
                      <p>{t("certificateCode")}: <span className="font-mono font-bold text-ink" dir="ltr">{c.code}</span></p>
                      <p>{t("issuedOn")}: {formatDate(c.issued_at)}</p>
                    </div>
                    <div className="text-end">
                      <p>{t("verifyAt")}</p>
                      <p className="font-mono" dir="ltr">{verifyUrl}</p>
                    </div>
                  </footer>
                </div>
              </article>
            </>
          )}
        </div>
      </section>
    </>
  );
}
