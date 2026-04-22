import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Váratlan hiba az alkalmazásban:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900/80 p-6 shadow-xl text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-lg font-semibold text-red-400">
              Váratlan hiba történt
            </h1>
            <p className="text-sm text-white/60">
              Az alkalmazás egy váratlan hibába ütközött. Kérjük, töltsd újra az
              oldalt.
            </p>
            {this.state.error && (
              <pre className="text-xs text-white/30 bg-slate-950/60 rounded-xl p-3 text-left overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-white text-slate-900 text-sm font-medium px-5 py-2"
            >
              Oldal újratöltése
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
