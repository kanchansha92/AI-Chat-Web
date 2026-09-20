import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { journalService } from "../services/journalService";
import { ApiError } from "../services/authService";
import JournalSidebar from "./JournalSidebar";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

// The input's maxLength sits above this on purpose, so you can overshoot and
// see the count instead of the field silently refusing keystrokes.
const NAME_MAX = 80;

export default function JournalNewThreadPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [aboutRealPerson, setAboutRealPerson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const canStart = trimmed.length > 0 && trimmed.length <= NAME_MAX && !saving;

  const start = async () => {
    if (!canStart) return;
    setSaving(true);
    setError(null);
    try {
      const { thread } = await journalService.createThread({ name: trimmed, aboutRealPerson });
      navigate(`/journal/${thread.id}`, { replace: true });
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.fields?.name ?? e.message : "something on our end. try again?";
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full app-gradient md:flex">
      <JournalSidebar />

      <div className="flex-1 min-w-0 flex items-start md:items-center justify-center px-4 md:px-10 lg:px-14 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:py-12">
        <main className="w-full max-w-[440px] md:max-w-[880px] flex flex-col">
          <div className="flex items-center gap-2 shrink-0 px-1 pt-1 md:hidden">
            <button
              type="button"
              aria-label="Back"
              onClick={() => navigate("/journal")}
              className="h-9 w-9 -ml-1 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
            >
              <BackIcon />
            </button>
            <p className="flex-1 text-center font-caveat  text-muted text-[0.95rem]">new thread</p>
            <span className="h-9 w-9" aria-hidden="true" />
          </div>

          <div className="md:grid md:grid-cols-2 md:rounded-[1.75rem] md:border md:border-hairline/60 md:bg-cream-light md:shadow-[0_24px_60px_-30px_rgba(22,32,43,0.35)] md:overflow-hidden">
            <div
              className="hidden md:flex md:flex-col md:justify-between p-9 lg:p-11"
              style={{
                background:
                  "linear-gradient(155deg, rgba(104,119,91,0.16), rgba(97,107,120,0.10) 60%, rgba(244,239,230,0.4))",
              }}
            >
              <p className="font-caveat  text-rust text-[1rem]">a quiet place</p>
              <div>
                <h1 className="font-instrument text-ink text-[3rem] lg:text-[3.4rem] leading-[1.02]">
                  A <span className=" text-rust">new</span> thread.
                </h1>
                <p className="font-caveat  text-muted text-[0.95rem] mt-4 leading-relaxed max-w-[26ch]">
                  a person, a memory, a question you keep returning to. write a line; a
                  reflection comes when you pause, and only if you want it.
                </p>
              </div>
              <p className="font-instrument  text-ink-soft/70 text-[1.05rem]">
                Privateaile reflects on what you write. it never speaks as anyone.
              </p>
            </div>

            <div className="md:p-9 lg:p-11">
              <div className="px-1 mt-6 md:hidden">
                <h1 className="font-instrument text-ink text-[2.4rem] leading-[1.05]">
                  A <span className=" text-rust">new</span> thread.
                </h1>
              </div>

              <div className="px-1 mt-8 md:mt-0">
                <label htmlFor="thread-name" className="font-caveat  text-rust text-[0.85rem] md:text-[0.95rem]">
                  who or what is it about?
                </label>
                <input
                  id="thread-name"
                  type="text"
                  value={name}
                  maxLength={NAME_MAX + 20}
                  autoFocus
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") start();
                  }}
                  placeholder="a person, a memory, a question you keep coming back to…"
                  className="mt-2 w-full bg-transparent border-0 border-b border-hairline focus:border-rust outline-none font-serif text-[1.05rem] md:text-[1.15rem] text-ink placeholder:text-ink-soft/50 py-2 transition-colors"
                />
                {trimmed.length > NAME_MAX && (
                  <p className="font-caveat  text-rust text-[0.72rem] mt-1">
                    {trimmed.length} / {NAME_MAX} - shorter, maybe?
                  </p>
                )}
                {error && <p className="font-caveat  text-rust text-[0.78rem] mt-2">{error}</p>}
              </div>

              <div className="px-1 mt-8">
                <button
                  type="button"
                  onClick={() => setAboutRealPerson((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 cursor-pointer group"
                  aria-pressed={aboutRealPerson}
                >
                  <span className="font-caveat  text-ink-soft text-[0.85rem] md:text-[0.95rem] text-left">
                    is this about a real person, or someone you've lost?
                  </span>
                  <span
                    className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${aboutRealPerson ? "bg-rust" : "bg-cream-dark"
                      }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-cream-soft shadow-sm transition-transform ${aboutRealPerson ? "translate-x-[1.35rem]" : "translate-x-0.5"
                        }`}
                    />
                  </span>
                </button>
                <p className="font-caveat  text-muted text-[0.72rem] mt-1">
                  {aboutRealPerson ? "on" : "off"}
                </p>

                {aboutRealPerson && (
                  <p className="font-caveat  text-ink-soft text-[0.85rem] mt-3 leading-relaxed">
                    then this thread is for the memory of them: what they said, how they were,
                    what you'd tell them. Privateaile will reflect with you on what you write. it will not
                    pretend to be them - they stay themselves, in your keeping.
                  </p>
                )}
              </div>

              <div className="px-1 mt-10">
                <button
                  type="button"
                  onClick={start}
                  disabled={!canStart}
                  className={`w-full rounded-full font-serif  text-[1rem] py-3.5 transition active:scale-[0.98] ${canStart
                    ? "bg-rust text-cream-soft hover:bg-rust-hover cursor-pointer shadow-[0_6px_16px_-4px_rgba(97,107,120,0.5)]"
                    : "bg-rust/40 text-cream-soft/80 cursor-default"
                    }`}
                >
                  {saving ? "opening the page…" : "Start writing →"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
