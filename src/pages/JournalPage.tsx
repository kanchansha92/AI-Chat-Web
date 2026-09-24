import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { journalService, type JournalThread } from "../services/journalService";
import JournalSidebar from "./JournalSidebar";

const AVATAR_OLIVE = "#6f7a4e";

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

function shortWhen(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  if (d.toDateString() === now.toDateString()) return "today";
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "yesterday";
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
  const md = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
  if (now.getFullYear() === d.getFullYear()) return md;
  return `${md}, ${d.getFullYear()}`;
}

// Threads keep whatever colour they were given, except the old default
// #a8b08c, which is too pale against cream.
function avatarColour(colour: string | undefined): string {
  if (!colour || colour.toLowerCase() === "#a8b08c") return AVATAR_OLIVE;
  return colour;
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
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function JournalPage() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<JournalThread[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    journalService
      .listThreads()
      .then(({ threads: t }) => {
        if (!cancelled) setThreads(t);
      })
      .catch((e) => {
        console.error("journal:listThreads failed", e);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isEmpty = threads !== null && threads.length === 0;

  return (
    <div className="min-h-[100dvh] w-full app-gradient md:flex">
      <JournalSidebar threads={loadError ? [] : threads} />

      <div className="flex-1 min-w-0 flex items-start justify-center px-5 md:px-10 lg:px-14 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
        <main className="w-full max-w-[440px] md:max-w-[1080px] flex flex-col">
          <div className="flex items-center gap-2 shrink-0 md:hidden">
            <button
              type="button"
              aria-label="Back"
              onClick={() => navigate("/home")}
              className="h-9 w-9 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer"
            >
              <BackIcon />
            </button>
            <p className="flex-1 text-center font-serif  text-ink-soft text-[1.05rem]">journal</p>
            <button
              type="button"
              aria-label="New thread"
              onClick={() => navigate("/journal/new")}
              className="h-9 w-9 rounded-full bg-cream-light border border-hairline/70 text-rust flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer"
            >
              <PlusIcon />
            </button>
          </div>

          <div className="mt-6 md:mt-0 md:flex md:items-end md:justify-between md:gap-8">
            <div>
              <p className="font-caveat  text-muted text-[0.9rem] md:text-[1.05rem]">{timeCaption()}</p>
              <h1 className="font-instrument text-ink text-[2.4rem] md:text-[3.4rem] leading-[1.02] mt-0.5">
                Your <span className=" text-rust">journal</span>.
              </h1>
              <p className="hidden md:block font-caveat  text-muted text-[0.95rem] mt-2">
                threads for the people, memories and questions you keep returning to.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/journal/new")}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-rust text-cream-soft font-serif  text-[0.95rem] px-5 py-3 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer shadow-[0_10px_24px_-10px_rgba(37,49,94,0.6)] shrink-0"
            >
              <PlusIcon className="h-4 w-4" />
              New thread
            </button>
          </div>

          <div className="flex items-baseline justify-between mt-7 md:mt-10 mb-3 md:mb-5">
            <p className="font-caveat  text-rust text-[0.9rem] md:text-[1rem] tracking-wide">your threads</p>
            {threads && threads.length > 0 && (
              <p className="font-caveat  text-muted text-[0.8rem] md:text-[0.85rem]">{threads.length} ongoing</p>
            )}
          </div>

          {loadError ? (
            <div className="py-10 md:py-20 text-center">
              <p className="font-instrument  text-ink text-[1.2rem] md:text-[1.6rem]">something on our end.</p>
              <p className="font-caveat  text-muted text-[0.8rem] mt-1">we know about it. try again in a moment.</p>
            </div>
          ) : threads === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-[1.1rem] bg-cream-light border border-hairline/40 h-[4.75rem] md:h-[5.25rem] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-4">
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/journal/${t.id}`)}
                  className="text-left flex items-center gap-3.5 rounded-[1.1rem] bg-cream-light border border-hairline/60 px-4 py-3.5 md:px-5 md:py-4 hover:border-hairline hover:shadow-[0_6px_18px_-10px_rgba(0,0,0,0.25)] hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer"
                >
                  <span
                    style={{ backgroundColor: avatarColour(t.colour) }}
                    className="h-11 w-11 md:h-12 md:w-12 rounded-full flex items-center justify-center font-instrument  text-cream-soft text-[1.15rem] md:text-[1.25rem] shrink-0 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.16)]"
                  >
                    {t.name[0]?.toUpperCase() ?? "·"}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-serif text-ink text-[1.02rem] md:text-[1.08rem] font-medium truncate leading-snug">{t.name}</span>
                    <span className="block font-caveat  text-muted text-[0.82rem] md:text-[0.86rem] truncate">
                      {t.lastEntryPreview || "nothing written yet"}
                    </span>
                  </span>
                  <span className="font-caveat  text-muted/80 text-[0.78rem] shrink-0 pl-1">
                    {shortWhen(t.lastEntryAt ?? t.updatedAt)}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => navigate("/journal/new")}
                className="text-left flex items-center gap-3.5 rounded-[1.1rem] border border-dashed border-hairline px-4 py-3.5 md:px-5 md:py-4 hover:bg-cream-light/60 hover:-translate-y-0.5 active:scale-[0.99] transition cursor-pointer"
              >
                <span className="h-11 w-11 md:h-12 md:w-12 rounded-full border border-dashed border-hairline text-rust flex items-center justify-center shrink-0">
                  <PlusIcon />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-serif text-ink text-[1.02rem] md:text-[1.08rem] leading-snug">
                    Start a <span className=" text-rust">new thread</span>
                  </span>
                  <span className="block font-caveat  text-muted text-[0.82rem] md:text-[0.86rem]">
                    a person, a memory, a question
                  </span>
                </span>
                <span className="text-rust text-lg shrink-0">→</span>
              </button>

              {isEmpty && (
                <p className="md:col-span-2 xl:col-span-3 font-caveat  text-muted text-[0.9rem] md:text-[1.05rem] text-center px-6 mt-6 md:mt-10 leading-relaxed">
                  nothing here yet, and that's fine.
                  <br />a single line is enough. start a thread for a person, a memory, a question.
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
