import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import { useI18n } from "@/lib/i18n";

export function PageHeader({ title, intro, crumbs = [] }: { title: string; intro?: string; crumbs?: { label: string; to?: string }[] }) {
  const { t } = useI18n();
  return (
    <header className="pattern-bg text-white">
      <div className="container-x py-12 sm:py-16">
        <nav aria-label="breadcrumb" className="mb-3 text-sm text-white/75">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-white">{t("home")}</Link></li>
            {crumbs.map((c) => (
              <li key={c.label} className="flex items-center gap-1.5">
                <span aria-hidden="true">/</span>
                {c.to ? <Link to={c.to} className="hover:text-white">{c.label}</Link> : <span>{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 max-w-3xl text-white/85">{intro}</p>}
      </div>
    </header>
  );
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="section-title mt-1">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Loading() {
  const { t } = useI18n();
  return (
    <div role="status" className="flex justify-center py-20">
      <span className="size-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center text-muted">
      <AlertCircle className="size-8 text-red-600" aria-hidden="true" />
      <p>{t("error")}</p>
      {onRetry && <button className="btn-outline" onClick={onRetry}>{t("retry")}</button>}
    </div>
  );
}

export function Empty({ text }: { text?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-14 text-center text-muted">
      <Inbox className="size-8 text-primary/50" aria-hidden="true" />
      <p>{text ?? t("noContent")}</p>
    </div>
  );
}

/** Wrapper that renders loading / error / content for a react-query result. */
export function Async<T>({ query, children }: { query: { data?: T; isLoading: boolean; isError: boolean; refetch: () => unknown }; children: (data: T) => ReactNode }) {
  if (query.isLoading) return <Loading />;
  if (query.isError || query.data === undefined) return <ErrorState onRetry={() => query.refetch()} />;
  return <>{children(query.data)}</>;
}

export function Img({ src, alt, className = "" }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return <div className={`pattern-soft flex items-center justify-center ${className}`} role="img" aria-label={alt} />;
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className}`} />;
}

export function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVisible(true);
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: "0px 0px -60px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref as never} className={`reveal ${visible ? "is-visible" : ""} ${className}`}>
      {children}
    </Tag>
  );
}

export function Pagination({ page, count, pageSize = 12, onChange }: { page: number; count: number; pageSize?: number; onChange: (p: number) => void }) {
  const { t, dir } = useI18n();
  const pages = Math.ceil(count / pageSize);
  if (pages <= 1) return null;
  const Prev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;
  return (
    <nav aria-label="pagination" className="mt-10 flex items-center justify-center gap-3">
      <button className="btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <Prev className="size-4" aria-hidden="true" /> {t("prev")}
      </button>
      <span className="text-sm text-muted">{t("page")} {page} / {pages}</span>
      <button className="btn-outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        {t("next")} <Next className="size-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-8 flex gap-2 overflow-x-auto pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            value === o.value ? "bg-primary text-white" : "bg-sand text-ink hover:bg-primary-soft"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function BulletList({ items, icon }: { items: string[]; icon?: ReactNode }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2.5 shrink-0 text-secondary">{icon ?? <span className="block size-2 rounded-full bg-secondary" />}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Count-up animation that starts when scrolled into view. The real value is
 * rendered by default, so a page that never animates (bots, print, old
 * browsers) never shows a misleading zero.
 */
export function Counter({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    setDisplay(value);
    const el = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || reduce || !("IntersectionObserver" in window)) return;
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      setDisplay(0);
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1400, 1);
        setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return <span ref={ref} aria-label={format(value)}>{format(display)}</span>;
}
