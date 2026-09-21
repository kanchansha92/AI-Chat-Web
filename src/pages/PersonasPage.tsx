import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadBilling } from "../redux/billingSlice";
import { personaService } from "../services/personaService";
import type { Persona } from "../services/personaService";
import { ApiError } from "../services/authService";
import UpgradePrompt, { refusalFrom } from "../components/UpgradePrompt";
import type { Refusal } from "../components/UpgradePrompt";

// Personas: who YOU are in a conversation. Not a character, and not the
// per-room character overrides in group chat.
//
// How many you may keep, and how often you may switch, are plan rules the
// server enforces - a refusal comes back as PLAN_LIMIT / PLAN_FEATURE and is
// shown as the same upgrade sheet used everywhere else.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export default function PersonasPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const usage = useAppSelector((s) => s.billing.usage);

  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await personaService.list();
    setPersonas(r.personas);
    setLimit(r.limit);
  }

  useEffect(() => {
    refresh().catch(() => setError("couldn't read your personas just now."));
    dispatch(loadBilling());
  }, [dispatch]);

  function handle(e: unknown) {
    const r = refusalFrom(e);
    if (r) setRefusal(r);
    else if (e instanceof ApiError) setError(e.message);
    else setError("that didn't work just now.");
  }

  async function create(ev: React.FormEvent) {
    ev.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await personaService.create({ name: name.trim(), description: description.trim() });
      setName("");
      setDescription("");
      await refresh();
    } catch (e) {
      handle(e);
    } finally {
      setSaving(false);
    }
  }

  async function activate(id: string) {
    setError(null);
    try {
      await personaService.activate(id);
      await refresh();
      dispatch(loadBilling());
    } catch (e) {
      handle(e);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await personaService.remove(id);
      await refresh();
    } catch (e) {
      handle(e);
    }
  }

  const changes = usage?.meters?.PERSONA_CHANGES ?? null;
  const atLimit = limit !== null && personas !== null && personas.length >= limit;

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <div className="mx-auto w-full max-w-[680px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings"))}
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center md:text-left md:pl-1 font-caveat text-rust text-[1.02rem]">personas</p>
          <span className="h-9 w-9 shrink-0 md:hidden" aria-hidden="true" />
        </div>

        <header className="mt-6 md:mt-8">
          <h1 className="font-display text-ink text-[1.8rem] leading-tight">who are you, here?</h1>
          <p className="font-serif text-muted text-[0.98rem] mt-1.5">
            a persona is how your characters see you a name, and a little about you. one is active at a time.
          </p>
          {changes && !changes.unlimited && changes.limit !== null && changes.limit > 0 && (
            <p className="font-caveat text-muted/80 text-[0.85rem] mt-1">
              {changes.remaining} of {changes.limit} switches left this month
            </p>
          )}
        </header>

        <section className="mt-6 rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-6">
          <form onSubmit={create} className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="what should they call you?"
              className="w-full rounded-[0.9rem] border border-hairline/70 bg-cream px-4 py-2.5 font-serif text-[0.95rem] text-ink placeholder:text-muted/70 focus:outline-none focus:border-rust/50"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={3}
              placeholder="a line or two about you as much or as little as you like."
              className="w-full rounded-[0.9rem] border border-hairline/70 bg-cream px-4 py-2.5 font-serif text-[0.95rem] text-ink placeholder:text-muted/70 focus:outline-none focus:border-rust/50 resize-none"
            />
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="self-start rounded-full bg-rust text-cream-soft font-serif text-[0.9rem] px-5 py-2 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {saving ? "saving…" : atLimit ? "add another (needs more room)" : "add a persona"}
            </button>
          </form>
          {error && <p role="alert" className="mt-3 font-serif text-rust text-[0.9rem]">{error}</p>}
        </section>

        <section className="mt-5 flex flex-col gap-3">
          {personas === null ? (
            <p className="font-caveat text-muted text-[0.95rem]">looking…</p>
          ) : personas.length === 0 ? (
            <p className="font-serif text-muted text-[0.95rem]">none yet the one above is a good start.</p>
          ) : (
            personas.map((p) => (
              <div
                key={p.id}
                className={`rounded-[1.2rem] border p-4 md:p-5 ${p.isActive ? "border-rust/60 bg-gradient-to-b from-cream-light to-cream ring-1 ring-rust/10" : "border-hairline/60 bg-cream-light"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-ink text-[1.15rem] leading-tight truncate">{p.name}</p>
                    {p.description && (
                      <p className="font-serif text-ink-soft text-[0.9rem] mt-1 line-clamp-3">{p.description}</p>
                    )}
                  </div>
                  {p.isActive && (
                    <span className="shrink-0 rounded-full bg-rust text-cream-soft px-2.5 py-0.5 font-serif text-[0.72rem]">
                      active
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {!p.isActive && (
                    <button
                      type="button"
                      onClick={() => activate(p.id)}
                      className="font-serif text-[0.88rem] text-rust hover:underline underline-offset-2 cursor-pointer"
                    >
                      speak as {p.name} →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="font-serif text-[0.85rem] text-muted hover:text-rust transition cursor-pointer ml-auto"
                  >
                    remove
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      <UpgradePrompt refusal={refusal} onClose={() => setRefusal(null)} />
    </div>
  );
}
