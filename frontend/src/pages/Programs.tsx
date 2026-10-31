import { useState } from "react";

import { ProgramCard } from "@/components/cards";
import { Seo } from "@/components/Seo";
import { Async, Empty, PageHeader, Pagination, Tabs } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { qs } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Paginated, ProgramStatus, ProgramSummary } from "@/lib/types";

export default function Programs() {
  const { t } = useI18n();
  const [status, setStatus] = useState<ProgramStatus | "">("");
  const [page, setPage] = useState(1);
  const query = usePublic<Paginated<ProgramSummary>>(`/programs/${qs({ status, page })}`);

  return (
    <>
      <Seo title={t("programs")} />
      <PageHeader title={t("programs")} crumbs={[{ label: t("programs") }]} />
      <section className="section">
        <div className="container-x">
          <Tabs
            label={t("status")}
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: "", label: t("all") },
              { value: "ongoing", label: t("ongoing") },
              { value: "completed", label: t("completed") },
              { value: "upcoming", label: t("upcoming") },
            ]}
          />
          <Async query={query}>
            {(data) =>
              data.results.length ? (
                <>
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.results.map((p) => <li key={p.id}><ProgramCard program={p} /></li>)}
                  </ul>
                  <Pagination page={page} count={data.count} onChange={setPage} />
                </>
              ) : <Empty text={t("noPrograms")} />
            }
          </Async>
        </div>
      </section>
    </>
  );
}
