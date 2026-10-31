import { Link } from "react-router-dom";

import { Seo } from "@/components/Seo";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <section className="container-x flex flex-col items-center py-28 text-center">
      <Seo title={t("notFound")} />
      <meta name="robots" content="noindex" />
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notFound")}</h1>
      <Link to="/" className="btn-primary mt-8">{t("backHome")}</Link>
    </section>
  );
}
