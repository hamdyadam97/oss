import { useState } from "react";
import { CheckCircle2, ListChecks } from "lucide-react";

import {
  ConsentField, FileField, FormError, SelectField, SubmitButton, SuccessBox, TextField, usePublicForm,
} from "@/components/forms";
import { Icon } from "@/components/Icon";
import { Seo } from "@/components/Seo";
import { Async, BulletList, Empty, PageHeader, SectionHeading } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { lines, useI18n } from "@/lib/i18n";
import type { MembershipType } from "@/lib/types";
import { useProfessionOptions } from "./Courses";

export default function Membership() {
  const { t, pick } = useI18n();
  const professions = useProfessionOptions();
  const query = usePublic<MembershipType[]>("/membership-types/");
  const [selected, setSelected] = useState("");
  const form = usePublicForm("membership");
  const e = form.errors;
  const types = query.data ?? [];
  const current = types.find((m) => m.slug === selected);

  const choose = (slug: string) => {
    setSelected(slug);
    document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Seo title={t("membership")} />
      <PageHeader title={t("membership")} crumbs={[{ label: t("membership") }]} />
      <section className="section">
        <div className="container-x">
          <SectionHeading title={t("membershipTypes")} />
          <Async query={query}>
            {(list) =>
              list.length ? (
                <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((m) => (
                    <li key={m.id} className={`card flex flex-col p-6 ${selected === m.slug ? "ring-2 ring-primary" : ""}`}>
                      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon name={m.icon} fallback="badge-check" /></span>
                      <h3 className="mt-4 text-xl font-bold">{pick(m, "title")}</h3>
                      {m.description && <p className="mt-2 text-sm text-muted">{pick(m, "description")}</p>}
                      <p className="mt-4 text-2xl font-bold text-primary">
                        {m.fee && Number(m.fee) > 0 ? <>{Number(m.fee)} <span className="text-sm font-normal text-muted">{t("currency")} / {m.duration_months} {t("months")}</span></> : t("free")}
                      </p>
                      {lines(pick(m, "benefits")).length > 0 && (
                        <div className="mt-5 flex-1 text-sm">
                          <p className="mb-2 font-semibold">{t("benefits")}</p>
                          <BulletList items={lines(pick(m, "benefits"))} icon={<CheckCircle2 className="-mt-1.5 size-4 text-primary" aria-hidden="true" />} />
                        </div>
                      )}
                      {lines(pick(m, "eligibility")).length > 0 && (
                        <div className="mt-5 text-sm">
                          <p className="mb-2 flex items-center gap-1.5 font-semibold"><ListChecks className="size-4 text-secondary-ink" aria-hidden="true" />{t("joinConditions")}</p>
                          <BulletList items={lines(pick(m, "eligibility"))} />
                        </div>
                      )}
                      <button className="btn-primary mt-6" onClick={() => choose(m.slug)}>{t("joinMembership")}</button>
                    </li>
                  ))}
                </ul>
              ) : <Empty text={t("noMembership")} />
            }
          </Async>
        </div>
      </section>

      {types.length > 0 && (
        <section id="apply" className="section scroll-mt-24 bg-sand">
          <div className="container-x max-w-3xl">
            {form.code ? (
              <SuccessBox code={form.code} onReset={form.reset} />
            ) : (
              <form onSubmit={form.onSubmit} className="card space-y-5 p-6 sm:p-8">
                <h2 className="text-xl font-bold">{t("membershipApply")}</h2>
                <FormError message={form.formError} />
                <SelectField key={selected} name="membership_type" label={t("membershipTypes")} required errors={e} defaultValue={selected}
                  placeholder="—" options={types.map((m) => ({ value: m.slug, label: pick(m, "title") }))} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField name="full_name" label={t("fullName")} required errors={e} autoComplete="name" />
                  <TextField name="full_name_en" label={t("nameEn")} errors={e} dir="ltr" />
                  <TextField name="national_id" label={t("nationalId")} required errors={e} dir="ltr" />
                  <TextField name="phone" label={t("phone")} type="tel" required errors={e} dir="ltr" hint={t("phoneHint")} />
                  <TextField name="email" label={t("email")} type="email" required errors={e} dir="ltr" autoComplete="email" />
                  <SelectField name="gender" label={t("gender")} required errors={e} placeholder="—" options={[{ value: "male", label: t("male") }, { value: "female", label: t("female") }]} />
                  <TextField name="birth_date" label={t("birthDate")} type="date" errors={e} />
                  <TextField name="nationality" label={t("nationality")} errors={e} />
                  <SelectField name="profession" label={t("profession")} required errors={e} placeholder="—" options={professions} />
                  <TextField name="specialty" label={t("specialty")} errors={e} />
                  <TextField name="qualification" label={t("qualification")} errors={e} />
                  <TextField name="years_experience" label={t("experience")} type="number" errors={e} />
                  <TextField name="license_number" label={t("licenseNumber")} required={current?.requires_license} errors={e} dir="ltr" />
                  <TextField name="workplace" label={t("workplace")} errors={e} />
                  <TextField name="city" label={t("city")} required errors={e} />
                </div>
                <FileField name="license_card" label={t("licenseCard")} required={current?.requires_license} errors={e} />
                <FileField name="cv" label={t("cv")} errors={e} />
                <ConsentField errors={e} />
                <SubmitButton pending={form.pending} />
              </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}
