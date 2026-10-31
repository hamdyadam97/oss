import { useState, type FormEvent } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { LogIn } from "lucide-react";

import { Loading } from "@/components/ui";
import { useSettings } from "@/hooks/useSettings";
import { ApiError } from "@/lib/api";
import { AdminLayout } from "./AdminLayout";
import AuditLog from "./AuditLog";
import { AuthProvider, useAuth } from "./auth";
import Dashboard from "./Dashboard";
import ResourceForm from "./ResourceForm";
import ResourceList from "./ResourceList";
import { resourceByKey } from "./resources";
import SubmissionDetail from "./SubmissionDetail";

function Login() {
  const { login } = useAuth();
  const { data: settings } = useSettings();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await login(String(fd.get("username")), String(fd.get("password")));
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? "محاولات كثيرة، حاول بعد دقيقة." : "اسم المستخدم أو كلمة المرور غير صحيحة.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="pattern-bg flex min-h-screen items-center justify-center p-4" dir="rtl" lang="ar">
      <title>تسجيل الدخول — لوحة التحكم</title>
      <meta name="robots" content="noindex, nofollow" />
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          {settings?.logo && <img src={settings.logo} alt="" className="mx-auto mb-3 h-16" />}
          <h1 className="text-xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted">{settings?.name}</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="username" className="label">اسم المستخدم</label>
          <input id="username" name="username" required autoComplete="username" className="input" dir="ltr" autoFocus />
        </div>
        <div>
          <label htmlFor="password" className="label">كلمة المرور</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" dir="ltr" />
        </div>
        <button className="btn-primary w-full" disabled={pending}><LogIn className="size-4" aria-hidden="true" />{pending ? "جارٍ الدخول…" : "دخول"}</button>
      </form>
    </div>
  );
}

function RecordRoute() {
  const { resource = "" } = useParams();
  return resourceByKey(resource)?.submission ? <SubmissionDetail /> : <ResourceForm />;
}

function Guarded() {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me) return <Login />;
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="settings" element={<ResourceForm singletonKey="settings" />} />
        <Route path="r/:resource" element={<ResourceList />} />
        <Route path="r/:resource/:id" element={<RecordRoute />} />
        <Route path="audit" element={<AuditLog />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}

export default function AdminApp() {
  return (
    <AuthProvider>
      <Guarded />
    </AuthProvider>
  );
}
