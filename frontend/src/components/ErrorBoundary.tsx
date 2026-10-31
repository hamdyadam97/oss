import { Component, type ErrorInfo, type ReactNode } from "react";

/** Shows a readable message instead of a blank page if rendering crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold text-ink">حدث خطأ غير متوقع</h1>
        <p className="text-muted">نعتذر، تعذر عرض الصفحة. حاول إعادة التحميل.</p>
        {import.meta.env.DEV && <pre className="max-w-2xl overflow-auto rounded-xl bg-red-50 p-4 text-start text-xs text-red-700" dir="ltr">{this.state.error.message}</pre>}
        <button className="btn-primary" onClick={() => window.location.reload()}>إعادة التحميل</button>
      </div>
    );
  }
}
