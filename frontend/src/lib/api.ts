export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(status: number, data: Record<string, unknown>) {
    super(typeof data?.detail === "string" ? data.detail : `HTTP ${status}`);
    this.status = status;
    this.data = data ?? {};
  }

  /** Flattens DRF error payloads into { field: "message" }. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (value: unknown, key: string) => {
      if (Array.isArray(value)) out[key] = value.map(String).join(" ");
      // Nested objects (e.g. extra_data) are keyed by their inner field name.
      else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => walk(v, k));
      else if (value != null) out[key] = String(value);
    };
    Object.entries(this.data).forEach(([k, v]) => walk(v, k));
    return out;
  }
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfReady: Promise<unknown> | null = null;
async function ensureCsrf() {
  if (getCookie("csrftoken")) return;
  csrfReady ??= fetch("/api/auth/csrf/", { credentials: "include" });
  await csrfReady;
}

type Options = { method?: string; body?: unknown; signal?: AbortSignal };

export async function api<T = unknown>(path: string, { method = "GET", body, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const unsafe = !["GET", "HEAD", "OPTIONS"].includes(method);
  if (unsafe) {
    await ensureCsrf();
    headers["X-CSRFToken"] = getCookie("csrftoken") ?? "";
  }
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: "include", signal });
  if (res.status === 204) return undefined as T;
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : {};
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404;

export const qs =(params: Record<string, string | number | boolean | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : "";
};
