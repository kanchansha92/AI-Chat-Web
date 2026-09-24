import type { ReactElement } from "react";

// Pointer devices only: a finger has no hover, so on touch this stays hidden
// and the tap-to-open action sheet is the way in. Goes inside a `group` row.

export interface RowAction {
  key: string;
  label: string;
  icon: () => ReactElement;
  fn: () => void;
  /**
   * A control that carries state of its own (the speak button is idle,
   * loading, playing or paused) and so renders itself instead of being a plain
   * icon + click. When set, `icon`/`fn` are ignored.
   */
  node?: ReactElement;
}

export default function MessageActions({ actions }: { actions: RowAction[] }) {
  if (!actions.length) return null;
  return (
    <div className="hidden [@media(hover:hover)_and_(pointer:fine)]:flex shrink-0 items-center gap-0.5 self-end pb-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
      {actions.map((a) => {
        if (a.node) return <span key={a.key} className="flex items-center">{a.node}</span>;
        const Icon = a.icon;
        return (
          <button
            key={a.key}
            type="button"
            title={a.label}
            aria-label={a.label}
            onClick={(e) => {
              e.stopPropagation();
              a.fn();
            }}
            className="h-7 w-7 rounded-full flex items-center justify-center text-ink-soft/60 hover:text-rust hover:bg-ink/[0.06] active:scale-95 transition cursor-pointer"
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 5.5 15" />
    </svg>
  );
}
export function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20h4l10-10a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6z" />
      <path d="M13.5 7.5l3 3" />
    </svg>
  );
}
export function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.8 4.5v4.2h-4.2" />
    </svg>
  );
}
export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5V4.5" />
      <path d="M8.4 8.1L12 4.5l3.6 3.6" />
      <path d="M6 12.5v5.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-5.5" />
    </svg>
  );
}

export function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M12 11.5v4.8" />
      <path d="M9.9 14.2l2.1 2.1 2.1-2.1" />
    </svg>
  );
}

// Native share sheet where the browser has one, clipboard otherwise. A
// dismissed sheet throws AbortError, which is a cancel and not a failure.
export async function shareText(body: string, title: string): Promise<string | null> {
  try {
    if (typeof navigator.share === "function") {
      await navigator.share({ title, text: body });
      return null;
    }
    await navigator.clipboard.writeText(body);
    return "copied, ready to share.";
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") return null;
    return "couldn't share that.";
  }
}

export function SpeakIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5.5 6.8 9H4.5A1.5 1.5 0 0 0 3 10.5v3A1.5 1.5 0 0 0 4.5 15h2.3L11 18.5z" />
      <path d="M15.2 9.2a4 4 0 0 1 0 5.6" />
      <path d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8" />
    </svg>
  );
}
