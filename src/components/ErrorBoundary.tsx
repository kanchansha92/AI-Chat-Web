import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches a render-time crash and shows it, instead of letting React unmount
 * the whole tree.
 *
 * Without one of these, a single bad line anywhere below the router takes the
 * entire page down to blank white - no message, no sidebar, nothing in the UI
 * to say what happened. That is exactly how a `.toFixed()` on an undefined
 * moderation threshold in the admin Providers screen presented: not as "this
 * one panel is broken" but as "the app is gone".
 *
 * A class component because error boundaries have no hook equivalent; this is
 * still the only way React offers to catch a descendant's render error.
 */
interface Props {
  children: ReactNode;
  /** Shown above the error. Defaults to something generic. */
  label?: string;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // The console is where a developer will look first, and React's own
    // "consider adding an error boundary" warning no longer fires once one
    // exists - so log the component stack ourselves or it is lost.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center px-6">
        <div className="max-w-[560px] w-full rounded-2xl border border-hairline/70 bg-cream-light p-6">
          <h1 className="font-display text-ink text-[1.6rem] leading-none">
            {this.props.label ?? "something broke on this screen."}
          </h1>
          <p className="font-serif text-muted text-[0.9rem] mt-2">
            The rest of the app is fine. This is the error, in full:
          </p>
          <pre className="mt-4 max-h-[40vh] overflow-auto rounded-lg bg-cream px-3 py-2.5 font-mono text-[0.78rem] text-ink-soft whitespace-pre-wrap break-words">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={this.reset} className="btn-neobrutal-rust px-5 py-2 text-[0.95rem]">
              try again
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/home";
              }}
              className="btn-neobrutal-cream px-5 py-2 text-[0.95rem]"
            >
              back to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
