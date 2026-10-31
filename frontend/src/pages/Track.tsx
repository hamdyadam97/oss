import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Award, Search } from "lucide-react";

import { Seo } from "@/components/Seo";
import { PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type TrackResult = {
  tracking_code: string;
  type: string;
  subject: string;
  status: string;
  status_display: string;
  public_note: string;
  created_at: string;
  updated_at: string;
  event_date?: string;
  certificate_code?: string | null;
  member_number?: string | null;
  expiry_date?: string | null;
  is_expired?: boolean;
};

const statusColor: Record<string, string> = {
  new: "bg-sky-50 text-sky-700",
  under_review: "bg-amber-50 text-amber-700",
  interview: "bg-amber-50 text-amber-700",
  needs_info: "bg-orange-50 text-orange-700",
  pending: "bg-sky-50 text-sky-700",
  waitlisted: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  attended: "bg-emerald-50 text-emerald-700",
  active: "bg-emerald-50 text-emerald-700",
  absent: "bg-red-50 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
  suspended: "bg-red-50 text-red-700",
  approved: "bg-emerald-50 text-emerald-700",
  accepted: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  declined: "bg-red-50 text-red-700",
};

export default function Track() {
  const { t, formatDate } = useI18n();
  const [params] = useSearchParams();
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api<TrackResult>("/public/track/", {
        method: "POST",
        body: { tracking_code: fd.get("tracking_code"), phone: fd.get("phone") },
      }));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? t("rateLimited") : err instanceof Error ? err.message : "Error");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Seo title={t("trackTitle")} />
      <PageHeader title={t("trackTitle")} intro={t("trackText")} crumbs={[{ label: t("track") }]} />
      <section className="section">
        <div className="container-x max-w-2xl">
          <form onSubmit={onSubmit} className="card grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
            <div>
              <label htmlFor="tracking_code" className="label">{t("trackingCode")}</label>
              <input id="tracking_code" name="tracking_code" required dir="ltr" defaultValue={params.get("code") ?? ""} placeholder="SRV-XXXXXXXX" className="input uppercase" />
            </div>
            <div>
              <label htmlFor="phone" className="label">{t("phone")}</label>
              <input id="phone" name="phone" type="tel" required dir="ltr" placeholder="07XXXXXXXX" className="input" />
            </div>
            <button className="btn-primary sm:col-span-2" disabled={pending}>
              <Search className="size-4" aria-hidden="true" /> {pending ? t("loading") : t("check")}
            </button>
          </form>

          <div aria-live="polite" className="mt-6">
            {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
            {result && (
              <div className="card p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">{result.type}</p>
                    <p className="text-lg font-bold">{result.subject}</p>
                  </div>
                  <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${statusColor[result.status] ?? "bg-sand"}`}>{result.status_display}</span>
                </div>
                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-muted">{t("trackingCode")}</dt><dd className="font-mono font-semibold" dir="ltr">{result.tracking_code}</dd></div>
                  <div><dt className="text-muted">{t("submittedAt")}</dt><dd className="font-semibold">{formatDate(result.created_at)}</dd></div>
                  <div><dt className="text-muted">{t("lastUpdate")}</dt><dd className="font-semibold">{formatDate(result.updated_at)}</dd></div>
                </dl>
                {(result.member_number || result.event_date) && (
                  <dl className="mt-4 grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-3">
                    {result.event_date && <div><dt className="text-muted">{t("date")}</dt><dd className="font-semibold">{formatDate(result.event_date, true)}</dd></div>}
                    {result.member_number && <div><dt className="text-muted">{t("memberNumber")}</dt><dd className="font-mono font-semibold" dir="ltr">{result.member_number}</dd></div>}
                    {result.expiry_date && (
                      <div>
                        <dt className="text-muted">{t("expiryDate")}</dt>
                        <dd className={`font-semibold ${result.is_expired ? "text-red-700" : ""}`}>
                          {formatDate(result.expiry_date)}{result.is_expired && ` — ${t("expired")}`}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
                {result.certificate_code && (
                  <Link to={`/certificates/${result.certificate_code}`} className="btn-primary mt-6">
                    <Award className="size-4" aria-hidden="true" />{t("viewCertificate")}
                  </Link>
                )}
                {result.public_note && (
                  <div className="mt-6 rounded-xl bg-secondary-soft p-4">
                    <p className="text-sm font-semibold">{t("note")}</p>
                    <p className="prose-text mt-1 text-sm">{result.public_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
