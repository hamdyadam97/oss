import { Link, useParams } from "react-router-dom";
import { FileCheck2, ListChecks, Search } from "lucide-react";

import { ServiceCard } from "@/components/cards";
import {
  ConsentField, Field, FormError, SelectField, SubmitButton, SuccessBox, TextArea, TextField, usePublicForm,
} from "@/components/forms";
import { Seo } from "@/components/Seo";
import { Async, BulletList, Empty, PageHeader } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { isNotFound } from "@/lib/api";
import { lines, useI18n } from "@/lib/i18n";
import type { ExtraField, Service } from "@/lib/types";
import NotFound from "./NotFound";

export function ServicesList() {
  const { t } = useI18n();
  const query = usePublic<Service[]>("/services/");
  return (
    <>
      <Seo title={t("services")} />
      <PageHeader title={t("services")} crumbs={[{ label: t("services") }]} />
      <section className="section">
        <div className="container-x">
          <Link to="/track" className="mb-8 flex items-center gap-3 rounded-2xl bg-primary-soft p-5 font-semibold text-primary hover:underline">
            <Search className="size-5" aria-hidden="true" /> {t("trackTitle")}
          </Link>
          <Async query={query}>
            {(services) =>
              services.length ? (
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((s) => <li key={s.id}><ServiceCard service={s} /></li>)}
                </ul>
              ) : <Empty text={t("noServices")} />
            }
          </Async>
        </div>
      </section>
    </>
  );
}

function ExtraInput({ field, errors }: { field: ExtraField; errors: Record<string, string> }) {
  const name = `extra__${field.name}`;
  const common = { name, label: field.label, required: field.required, errors: { [name]: errors[field.name] ?? "" } };
  switch (field.type) {
    case "textarea":
      return <TextArea {...common} rows={3} />;
    case "select":
      return <SelectField {...common} placeholder="—" options={(field.options ?? []).map((o) => ({ value: o, label: o }))} />;
    case "boolean":
      return <SelectField {...common} placeholder="—" options={[{ value: "نعم", label: "نعم" }, { value: "لا", label: "لا" }]} />;
    case "number":
    case "date":
      return <TextField {...common} type={field.type} />;
    default:
      return <TextField {...common} />;
  }
}

export function ServiceApply() {
  const { slug = "" } = useParams();
  const { t, pick } = useI18n();
  const query = usePublic<Service>(`/services/${encodeURIComponent(slug)}/`);
  // Collect dynamic fields into a single JSON payload.
  const form = usePublicForm("service-request", (fd) => {
    const extra: Record<string, string> = {};
    for (const [key, value] of [...fd.entries()]) {
      if (key.startsWith("extra__")) {
        extra[key.slice(7)] = String(value);
        fd.delete(key);
      }
    }
    fd.set("extra_data", JSON.stringify(extra));
    fd.set("service", slug);
  });

  if (isNotFound(query.error)) return <NotFound />;

  return (
    <Async query={query}>
      {(service) => {
        const eligibility = lines(pick(service, "eligibility"));
        const docs = lines(pick(service, "required_documents"));
        const e = form.errors;
        return (
          <>
            <Seo title={pick(service, "title")} description={pick(service, "summary")} />
            <PageHeader title={pick(service, "title")} intro={pick(service, "summary")} crumbs={[{ label: t("services"), to: "/services" }, { label: pick(service, "title") }]} />
            <section className="section">
              <div className="container-x grid gap-10 lg:grid-cols-3">
                <aside className="space-y-6 lg:order-last">
                  {service.description && <div className="card p-6"><p className="prose-text text-sm">{pick(service, "description")}</p></div>}
                  {eligibility.length > 0 && (
                    <div className="card p-6">
                      <h2 className="mb-4 flex items-center gap-2 font-bold"><ListChecks className="size-5 text-secondary" aria-hidden="true" />{t("eligibility")}</h2>
                      <div className="text-sm"><BulletList items={eligibility} /></div>
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div className="card p-6">
                      <h2 className="mb-4 flex items-center gap-2 font-bold"><FileCheck2 className="size-5 text-secondary" aria-hidden="true" />{t("requiredDocs")}</h2>
                      <div className="text-sm"><BulletList items={docs} /></div>
                    </div>
                  )}
                </aside>

                <div className="lg:col-span-2">
                  {form.code ? (
                    <SuccessBox code={form.code} onReset={form.reset} />
                  ) : (
                    <form onSubmit={form.onSubmit} className="card space-y-5 p-6 sm:p-8" noValidate={false}>
                      <h2 className="text-xl font-bold">{t("applyService")}</h2>
                      <FormError message={form.formError} />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <TextField name="full_name" label={t("fullName")} required errors={e} autoComplete="name" />
                        <TextField name="national_id" label={t("nationalId")} required errors={e} dir="ltr" />
                        <TextField name="phone" label={t("phone")} type="tel" required errors={e} autoComplete="tel" dir="ltr" hint={t("phoneHint")} />
                        <TextField name="email" label={t("email")} type="email" errors={e} autoComplete="email" dir="ltr" />
                        <TextField name="city" label={t("city")} required errors={e} />
                        <TextField name="district" label={t("district")} errors={e} />
                        <TextField name="family_size" label={t("familySize")} type="number" errors={e} />
                        {service.extra_fields.map((f) => <ExtraInput key={f.name} field={f} errors={e} />)}
                      </div>
                      <TextArea name="details" label={t("details")} required errors={e} />
                      <Field label={t("attachments")} name="attachment_1" required={service.requires_attachment} error={e.attachment_1 || e.attachment_2 || e.attachment_3}>
                        <div className="space-y-2">
                          {["attachment_1", "attachment_2", "attachment_3"].map((n, i) => (
                            <input key={n} id={i === 0 ? n : undefined} name={n} type="file" accept=".pdf,.jpg,.jpeg,.png" required={i === 0 && service.requires_attachment}
                              aria-label={`${t("attachments")} ${i + 1}`}
                              className="input file:me-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-primary" />
                          ))}
                        </div>
                      </Field>
                      {e.extra_data && <p className="text-sm text-red-600">{e.extra_data}</p>}
                      <ConsentField errors={e} />
                      <SubmitButton pending={form.pending} />
                    </form>
                  )}
                </div>
              </div>
            </section>
          </>
        );
      }}
    </Async>
  );
}
