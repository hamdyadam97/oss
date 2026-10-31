import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { OpportunityCard } from "@/components/cards";
import {
  ConsentField, FileField, FormError, SelectField, SubmitButton, SuccessBox, TextArea, TextField, usePublicForm,
} from "@/components/forms";
import { Seo } from "@/components/Seo";
import { Async, Empty, PageHeader, SectionHeading } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { useI18n } from "@/lib/i18n";
import type { Opportunity } from "@/lib/types";

export default function Volunteer() {
  const { t, pick } = useI18n();
  const [params] = useSearchParams();
  const query = usePublic<Opportunity[]>("/opportunities/");
  const [selected, setSelected] = useState(params.get("opportunity") ?? "");
  const form = usePublicForm("volunteer");
  const e = form.errors;

  useEffect(() => {
    if (window.location.hash === "#apply") document.getElementById("apply")?.scrollIntoView();
  }, []);

  const apply = (slug: string) => {
    setSelected(slug);
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Seo title={t("volunteer")} />
      <PageHeader title={t("volunteer")} intro={t("ctaText")} crumbs={[{ label: t("volunteer") }]} />
      <section className="section">
        <div className="container-x">
          <SectionHeading title={t("volunteerOpps")} />
          <Async query={query}>
            {(opps) =>
              opps.length ? (
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {opps.map((o) => <li key={o.id}><OpportunityCard opp={o} onApply={apply} /></li>)}
                </ul>
              ) : <Empty text={t("noOpps")} />
            }
          </Async>
        </div>
      </section>

      <section id="apply" className="section scroll-mt-24 bg-sand">
        <div className="container-x max-w-3xl">
          {form.code ? (
            <SuccessBox code={form.code} onReset={form.reset} />
          ) : (
            <form onSubmit={form.onSubmit} className="card space-y-5 p-6 sm:p-8">
              <h2 className="text-xl font-bold">{t("applyVolunteer")}</h2>
              <FormError message={form.formError} />
              <SelectField
                key={selected}
                name="opportunity"
                label={t("opportunity")}
                errors={e}
                defaultValue={selected}
                placeholder={t("generalVolunteer")}
                options={(query.data ?? []).map((o) => ({ value: o.slug, label: pick(o, "title") }))}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField name="full_name" label={t("fullName")} required errors={e} autoComplete="name" />
                <TextField name="national_id" label={t("nationalId")} required errors={e} dir="ltr" />
                <TextField name="phone" label={t("phone")} type="tel" required errors={e} dir="ltr" autoComplete="tel" hint={t("phoneHint")} />
                <TextField name="email" label={t("email")} type="email" required errors={e} dir="ltr" autoComplete="email" />
                <SelectField name="gender" label={t("gender")} required errors={e} placeholder="—" options={[{ value: "male", label: t("male") }, { value: "female", label: t("female") }]} />
                <TextField name="birth_date" label={t("birthDate")} type="date" errors={e} />
                <TextField name="city" label={t("city")} required errors={e} />
                <TextField name="education" label={t("education")} errors={e} />
                <TextField name="occupation" label={t("occupation")} errors={e} />
                <TextField name="availability" label={t("availability")} errors={e} />
              </div>
              <TextArea name="skills" label={t("skills")} rows={3} errors={e} />
              <TextArea name="motivation" label={t("motivation")} rows={3} errors={e} />
              <FileField name="cv" label={t("cv")} errors={e} />
              <ConsentField errors={e} />
              <SubmitButton pending={form.pending} />
            </form>
          )}
        </div>
      </section>
    </>
  );
}
