import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Calendar, Download, MapPin, PlayCircle } from "lucide-react";

import { PostCard } from "@/components/cards";
import { Seo } from "@/components/Seo";
import { Async, Empty, Img, PageHeader, Pagination, Tabs } from "@/components/ui";
import { usePublic } from "@/hooks/usePublic";
import { isNotFound, qs } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Album, Paginated, Post, PostKind, PostSummary } from "@/lib/types";
import NotFound from "./NotFound";

export function MediaList() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const kind = (params.get("kind") ?? "") as PostKind | "";
  const [page, setPage] = useState(1);
  const query = usePublic<Paginated<PostSummary>>(`/posts/${qs({ kind, page })}`);

  return (
    <>
      <Seo title={t("media")} />
      <PageHeader title={t("media")} crumbs={[{ label: t("media") }]} />
      <section className="section">
        <div className="container-x">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Tabs
              label={t("category")}
              value={kind}
              onChange={(v) => { setParams(v ? { kind: v } : {}); setPage(1); }}
              options={[
                { value: "", label: t("all") },
                { value: "news", label: t("news") },
                { value: "event", label: t("event") },
                { value: "announcement", label: t("announcement") },
                { value: "publication", label: t("publication") },
              ]}
            />
            <Link to="/gallery" className="btn-outline">{t("gallery")}</Link>
          </div>
          <Async query={query}>
            {(data) =>
              data.results.length ? (
                <>
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.results.map((p) => <li key={p.id}><PostCard post={p} /></li>)}
                  </ul>
                  <Pagination page={page} count={data.count} onChange={setPage} />
                </>
              ) : <Empty />
            }
          </Async>
        </div>
      </section>
    </>
  );
}

export function PostDetail() {
  const { slug = "" } = useParams();
  const { t, pick, formatDate } = useI18n();
  const query = usePublic<Post>(`/posts/${encodeURIComponent(slug)}/`);
  if (isNotFound(query.error)) return <NotFound />;

  return (
    <Async query={query}>
      {(post) => (
        <>
          <Seo title={pick(post, "title")} description={pick(post, "excerpt")} image={post.cover} />
          <PageHeader title={pick(post, "title")} crumbs={[{ label: t("media"), to: "/media" }, { label: t(post.kind) }]} />
          <article className="section">
            <div className="container-x max-w-4xl">
              <p className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted">
                <span className="rounded-full bg-primary-soft px-3 py-1 font-semibold text-primary">{t(post.kind)}</span>
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </p>
              {post.kind === "event" && (post.event_date || post.event_location) && (
                <div className="mb-8 flex flex-wrap gap-6 rounded-2xl bg-secondary-soft p-5">
                  {post.event_date && <p className="flex items-center gap-2"><Calendar className="size-5" aria-hidden="true" />{formatDate(post.event_date, true)}</p>}
                  {post.event_location && <p className="flex items-center gap-2"><MapPin className="size-5" aria-hidden="true" />{post.event_location}</p>}
                </div>
              )}
              {post.cover && <Img src={post.cover} alt={pick(post, "title")} className="mb-8 aspect-[16/9] w-full rounded-2xl" />}
              <div className="prose-text">{pick(post, "body")}</div>
              {post.attachment && (
                <a href={post.attachment} target="_blank" rel="noopener noreferrer" className="btn-outline mt-8">
                  <Download className="size-4" aria-hidden="true" /> {t("downloadAttachment")}
                </a>
              )}
              {post.program && (
                <Link to={`/programs/${post.program.slug}`} className="mt-10 block rounded-2xl border border-line p-5 hover:border-primary">
                  <span className="text-sm text-muted">{t(post.program.kind)}</span>
                  <span className="block font-bold text-primary">{pick(post.program, "title")}</span>
                </Link>
              )}
            </div>
          </article>
        </>
      )}
    </Async>
  );
}

export function GalleryList() {
  const { t, pick, formatDate } = useI18n();
  const [page, setPage] = useState(1);
  const query = usePublic<Paginated<Album>>(`/albums/${qs({ page })}`);
  return (
    <>
      <Seo title={t("gallery")} />
      <PageHeader title={t("gallery")} crumbs={[{ label: t("media"), to: "/media" }, { label: t("gallery") }]} />
      <section className="section">
        <div className="container-x">
          <Async query={query}>
            {(data) =>
              data.results.length ? (
                <>
                  <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {data.results.map((a) => (
                      <li key={a.id}>
                        <Link to={`/gallery/${a.slug}`} className="group block overflow-hidden rounded-2xl">
                          <div className="relative aspect-[4/3]">
                            <Img src={a.cover} alt="" className="size-full transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 to-transparent p-5 text-white">
                              <h2 className="font-bold">{pick(a, "title")}</h2>
                              <p className="text-sm text-white/80">{formatDate(a.date)} · {a.items_count}</p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Pagination page={page} count={data.count} onChange={setPage} />
                </>
              ) : <Empty />
            }
          </Async>
        </div>
      </section>
    </>
  );
}

function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export function AlbumDetail() {
  const { slug = "" } = useParams();
  const { t, pick } = useI18n();
  const query = usePublic<Album>(`/albums/${encodeURIComponent(slug)}/`);
  const [active, setActive] = useState<number | null>(null);
  if (isNotFound(query.error)) return <NotFound />;

  return (
    <Async query={query}>
      {(album) => {
        const items = album.items ?? [];
        const current = active !== null ? items[active] : null;
        return (
          <>
            <Seo title={pick(album, "title")} description={album.description} image={album.cover} />
            <PageHeader title={pick(album, "title")} intro={album.description} crumbs={[{ label: t("gallery"), to: "/gallery" }, { label: pick(album, "title") }]} />
            <section className="section">
              <div className="container-x">
                {items.length ? (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((item, i) => (
                      <li key={item.id}>
                        <button onClick={() => setActive(i)} className="group relative block aspect-square w-full overflow-hidden rounded-xl" aria-label={item.caption || `${i + 1}`}>
                          {item.kind === "image" ? (
                            <Img src={item.image} alt={item.caption} className="size-full transition-transform group-hover:scale-105" />
                          ) : (
                            <span className="pattern-bg flex size-full items-center justify-center text-white"><PlayCircle className="size-12" aria-hidden="true" /></span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <Empty />}
              </div>
            </section>
            {current && (
              <div role="dialog" aria-modal="true" aria-label={current.caption || pick(album, "title")} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setActive(null)}>
                <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                  {current.kind === "image" && current.image ? (
                    <img src={current.image} alt={current.caption} className="mx-auto max-h-[80vh] rounded-xl" />
                  ) : youtubeEmbed(current.video_url) ? (
                    <iframe src={youtubeEmbed(current.video_url)!} title={current.caption || "video"} className="aspect-video w-full rounded-xl" allow="encrypted-media; picture-in-picture" allowFullScreen />
                  ) : (
                    <a href={current.video_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">{current.video_url}</a>
                  )}
                  {current.caption && <p className="mt-3 text-center text-white">{current.caption}</p>}
                  <div className="mt-4 flex justify-center gap-3">
                    <button className="btn bg-white/15 text-white" disabled={active === 0} onClick={() => setActive((a) => (a ?? 1) - 1)}>{t("prev")}</button>
                    <button className="btn bg-white/15 text-white" onClick={() => setActive(null)} autoFocus>{t("close")}</button>
                    <button className="btn bg-white/15 text-white" disabled={active === items.length - 1} onClick={() => setActive((a) => (a ?? 0) + 1)}>{t("next")}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      }}
    </Async>
  );
}
