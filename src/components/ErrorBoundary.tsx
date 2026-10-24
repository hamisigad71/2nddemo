import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main
          className="min-h-screen flex items-center justify-center p-5 text-white"
          style={{
            background:
              "radial-gradient(ellipse at 50% 38%, rgba(48, 36, 88, 0.36), transparent 48%), #080611",
          }}
        >
          <section
            aria-labelledby="error-title"
            className="w-full max-w-[26rem] rounded-[1.35rem] border border-[#29253f] bg-[#111020] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-8"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/[0.08] text-red-400"
            >
              <AlertTriangle className="h-7 w-7" strokeWidth={1.8} />
            </div>
            <h1 id="error-title" className="mb-2 text-[1.4rem] font-semibold tracking-[-0.025em]">
              We couldn&apos;t load this page
            </h1>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-6 text-slate-400">
              Refresh to try again, or go home and continue browsing.
            </p>
            {this.state.error?.message && (
              <div className="mb-6 overflow-hidden rounded-xl border border-[#29263d] bg-[#0b0a15] text-left">
                <div className="border-b border-[#29263d] px-3.5 py-2 text-xs font-medium text-slate-400">
                  Technical details
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all px-3.5 py-3 font-mono text-[11px] leading-[1.55] text-red-300">
                  {this.state.error.message}
                </pre>
              </div>
            )}
            <div className="flex gap-2.5">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-3.5 text-sm font-semibold text-slate-950 shadow-[0_4px_18px_rgba(245,158,11,0.16)] transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111020] motion-reduce:transition-none"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4 shrink-0" />
                Reload Page
              </button>
              <a
                href="/"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.06] px-3.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111020] motion-reduce:transition-none"
              >
                <Home aria-hidden="true" className="h-4 w-4 shrink-0" />
                Home
              </a>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
