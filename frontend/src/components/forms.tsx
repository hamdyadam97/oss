import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Copy } from "lucide-react";

import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function Field({
  label, name, required, error, hint, children, className = "",
}: { label: string; name: string; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

type InputProps = { name: string; label: string; required?: boolean; errors: Record<string, string>; hint?: string; className?: string };

export function TextField({ type = "text", autoComplete, dir, ...p }: InputProps & { type?: string; autoComplete?: string; dir?: "ltr" | "rtl" }) {
  return (
    <Field {...p} error={p.errors[p.name]}>
      <input
        id={p.name} name={p.name} type={type} required={p.required} autoComplete={autoComplete} dir={dir}
        aria-invalid={!!p.errors[p.name]} aria-describedby={p.errors[p.name] ? `${p.name}-error` : undefined}
        className="input"
      />
    </Field>
  );
}

export function TextArea({ rows = 5, ...p }: InputProps & { rows?: number }) {
  return (
    <Field {...p} error={p.errors[p.name]}>
      <textarea id={p.name} name={p.name} rows={rows} required={p.required} aria-invalid={!!p.errors[p.name]} className="input" />
    </Field>
  );
}

export function SelectField({ options, placeholder, defaultValue, ...p }: InputProps & { options: { value: string; label: string }[]; placeholder?: string; defaultValue?: string }) {
  return (
    <Field {...p} error={p.errors[p.name]}>
      <select id={p.name} name={p.name} required={p.required} defaultValue={defaultValue ?? ""} aria-invalid={!!p.errors[p.name]} className="input">
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function FileField(p: InputProps) {
  return (
    <Field {...p} error={p.errors[p.name]}>
      <input
        id={p.name} name={p.name} type="file" required={p.required} accept=".pdf,.jpg,.jpeg,.png"
        className="input file:me-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-primary"
      />
    </Field>
  );
}

export function ConsentField({ errors }: { errors: Record<string, string> }) {
  const { t } = useI18n();
  return (
    <div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" value="true" required className="mt-1 size-4 accent-[var(--brand-primary)]" />
        <span>
          {t("consent")}{" "}
          <Link to="/p/privacy" target="_blank" className="text-primary underline">{t("privacyPolicy")}</Link>
        </span>
      </label>
      {errors.consent && <p role="alert" className="mt-1 text-sm text-red-600">{errors.consent}</p>}
      {/* Honeypot for bots — hidden from users and assistive tech */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
    </div>
  );
}

export function SuccessBox({ code, onReset }: { code: string; onReset?: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="card flex flex-col items-center gap-4 p-8 text-center">
      <CheckCircle2 className="size-14 text-primary" aria-hidden="true" />
      <h2 className="text-xl font-bold">{t("successTitle")}</h2>
      <p className="text-muted">{t("successText")}</p>
      <div className="flex items-center gap-2 rounded-xl bg-primary-soft px-5 py-3">
        <span className="font-mono text-xl font-bold tracking-wider text-primary" dir="ltr">{code}</span>
        <button
          className="btn-ghost px-2!"
          aria-label={t("copy")}
          onClick={() => navigator.clipboard?.writeText(code).then(() => setCopied(true))}
        >
          <Copy className="size-4" aria-hidden="true" />
        </button>
      </div>
      {copied && <span className="text-sm text-primary">{t("copied")}</span>}
      <div className="flex gap-3">
        <Link to="/track" className="btn-primary">{t("track")}</Link>
        {onReset && <button className="btn-outline" onClick={onReset}>{t("newRequest")}</button>}
      </div>
    </div>
  );
}

/** Submits an uncontrolled <form> as multipart and exposes field errors / tracking code. */
export function usePublicForm(endpoint: string, prepare?: (fd: FormData) => void) {
  const { t } = useI18n();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    // Drop empty optional inputs so the API treats them as "not provided".
    for (const [key, value] of [...fd.entries()]) {
      if ((value instanceof File && value.size === 0) || value === "") fd.delete(key);
    }
    prepare?.(fd);
    setPending(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await api<{ tracking_code: string } & Record<string, string>>(`/public/submit/${endpoint}/`, { method: "POST", body: fd });
      setResult(res);
      setCode(res.tracking_code);
      form.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        const fe = err.fieldErrors();
        setErrors(fe);
        const first = Object.keys(fe)[0];
        (form.querySelector(`[name="${first}"]`) as HTMLElement | null)?.focus();
      } else if (err instanceof ApiError && err.status === 429) {
        setFormError(t("rateLimited"));
      } else {
        setFormError(err instanceof Error ? err.message : "Error");
      }
    } finally {
      setPending(false);
    }
  };

  return { errors, pending, code, result, formError, onSubmit, reset: () => setCode(null) };
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>;
}

export function SubmitButton({ pending }: { pending: boolean }) {
  const { t } = useI18n();
  return (
    <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
      {pending ? t("sending") : t("submit")}
    </button>
  );
}
