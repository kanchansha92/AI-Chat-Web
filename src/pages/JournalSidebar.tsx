import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { journalService, type JournalThread } from "../services/journalService";

// Desktop-only rail (hidden md:flex); each page keeps its own mobile header.
// Pass `threads` when the page already fetched them, else the rail fetches its own.
const AVATAR_OLIVE = "#6f7a4e";
const SAGE = "#68775B";

/**
 * Fired by the entry page after a save, edit or delete. The rail's rows show a
 * last-entry preview, so without this a thread that had just been written in
 * still read "nothing written yet" until a full page reload. Declared here,
 * next to the listener, so the entry page can import it without a cycle.
 */
export const JOURNAL_THREADS_CHANGED = "journal:threads-changed";
export function notifyThreadsChanged() {
  window.dispatchEvent(new Event(JOURNAL_THREADS_CHANGED));
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function PlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function timeCaption(): string {
  const d = new Date();
  const h = d.getHours();
  const sunday = d.getDay() === 0;
  if (sunday) return h < 12 ? "a Sunday morning" : "a Sunday evening";
  if (h < 5) return "a quiet late";
  if (h < 12) return "morning";
  if (h < 17) return "mid-afternoon";
  return "the evening";
}

function avatarColour(colour: string | undefined): string {
  if (!colour || colour.toLowerCase() === "#a8b08c") return AVATAR_OLIVE;
  return colour;
}

export default function JournalSidebar({ threads: threadsProp }: { threads?: JournalThread[] | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [fetched, setFetched] = useState<JournalThread[] | null>(null);

  useEffect(() => {
    if (threadsProp !== undefined) return; // parent owns the list
    let cancelled = false;

    const load = () => {
      journalService
        .listThreads()
        .then(({ threads: t }) => {
          if (!cancelled) setFetched(t);
        })
        .catch((e) => {
          console.error("journal:sidebar listThreads failed", e);
          if (!cancelled) setFetched((prev) => prev ?? []);
        });
    };

    load();

    // Each row shows its thread's last-entry preview, which goes stale as soon
    // as something is written on the entry page - a thread just written in kept
    // reading "nothing written yet" until a full page reload. The entry page
    // fires this after every save, edit and delete.
    window.addEventListener(JOURNAL_THREADS_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(JOURNAL_THREADS_CHANGED, load);
    };
  }, [threadsProp]);

  const threads = threadsProp !== undefined ? threadsProp : fetched;

  const path = location.pathname;
  const activeThreadId = (() => {
    const m = path.match(/^\/journal\/([^/]+)$/);
    if (!m || m[1] === "new") return null;
    return m[1];
  })();
  const onList = path === "/journal";
  const onNew = path === "/journal/new";

  return (
    <aside className="hidden md:flex md:flex-col shrink-0 md:w-[248px] lg:w-[276px] h-[100dvh] sticky top-0 bg-cream-light border-r border-hairline/60">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <button
          type="button"
          aria-label="Back to home"
          onClick={() => navigate("/home")}
          className="h-9 w-9 rounded-full bg-cream border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer"
        >
          <BackIcon />
        </button>
        <div className="leading-tight">
          <p className="font-instrument text-ink text-[1.35rem] leading-none">privateaile</p>
          <p className="font-caveat  text-rust text-[0.85rem] -mt-0.5">journal</p>
        </div>
      </div>

      <div className="px-4">
        <button
          type="button"
          onClick={() => navigate("/journal/new")}
          className={`w-full flex items-center gap-2.5 rounded-full px-4 py-2.5 font-serif  text-[0.95rem] transition active:scale-[0.98] cursor-pointer ${onNew
            ? "bg-rust text-cream-soft shadow-[0_6px_16px_-6px_rgba(97,107,120,0.6)]"
            : "bg-rust text-cream-soft hover:bg-rust-hover shadow-[0_6px_16px_-8px_rgba(97,107,120,0.55)]"
            }`}
        >
          <PlusIcon className="h-4 w-4" />
          New thread
        </button>
      </div>

      <nav className="px-4 mt-4">
        <button
          type="button"
          onClick={() => navigate("/journal")}
          className={`w-full text-left rounded-xl px-3.5 py-2 font-serif text-[0.95rem] transition cursor-pointer ${onList ? "bg-cream-dark/70 text-ink" : "text-ink-soft hover:bg-cream-dark/40"
            }`}
        >
          All threads
        </button>
      </nav>

      <div className="px-5 mt-5 mb-2 flex items-baseline justify-between">
        <p className="font-caveat  text-rust text-[0.82rem] tracking-wide">your threads</p>
        {threads && threads.length > 0 && (
          <span className="font-caveat  text-muted text-[0.72rem]">{threads.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-2">
        {threads === null ? (
          <div className="flex flex-col gap-2 px-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-11 rounded-xl bg-cream-dark/40 animate-pulse" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="font-caveat  text-muted text-[0.8rem] px-2 leading-relaxed">
            nothing here yet. start a thread for a person, a memory, a question.
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {threads.map((t) => {
              const active = t.id === activeThreadId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/journal/${t.id}`)}
                  className={`group text-left flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition cursor-pointer ${active ? "bg-cream-dark/70" : "hover:bg-cream-dark/40"
                    }`}
                >
                  <span
                    style={{ backgroundColor: avatarColour(t.colour) }}
                    className="h-8 w-8 rounded-full flex items-center justify-center font-instrument  text-cream-soft text-[0.9rem] shrink-0 shadow-[inset_0_-2px_5px_rgba(0,0,0,0.16)]"
                  >
                    {t.name[0]?.toUpperCase() ?? "·"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-serif text-[0.92rem] truncate leading-snug ${active ? "text-ink" : "text-ink-soft"}`}>
                      {t.name}
                    </span>
                    <span className="block font-caveat  text-muted text-[0.72rem] truncate">
                      {t.lastEntryPreview || "nothing written yet"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-5 py-4 border-t border-hairline/50">
        <p className="font-caveat  text-muted text-[0.78rem]">{timeCaption()}</p>
        <p className="font-instrument  text-ink-soft/80 text-[0.92rem] leading-snug">
          a <span style={{ color: SAGE }}>quiet</span> place to write.
        </p>
      </div>
    </aside>
  );
}
