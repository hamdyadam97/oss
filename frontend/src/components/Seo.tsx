import { useSettings } from "@/hooks/useSettings";
import { useI18n } from "@/lib/i18n";

/** React 19 hoists these tags into <head>. */
export function Seo({ title, description, image }: { title?: string; description?: string; image?: string | null }) {
  const { data: settings } = useSettings();
  const { pick } = useI18n();
  const siteName = pick(settings, "name");
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const desc = description || pick(settings, "seo_description") || pick(settings, "about_short");
  return (
    <>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc.slice(0, 300)} />}
      {settings?.seo_keywords && <meta name="keywords" content={settings.seo_keywords} />}
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc.slice(0, 300)} />}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content="website" />
      {(image || settings?.logo) && <meta property="og:image" content={image || settings?.logo || ""} />}
    </>
  );
}
