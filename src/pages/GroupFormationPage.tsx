import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { characterService, type Character } from "../services/characterService";
import CharacterFace from "../components/CharacterFace";
import { groupService } from "../services/groupService";
import { ApiError } from "../services/authService";
import { useGroupsAllowed } from "../hook/usePlan";
import PaywallSheet from "../components/PaywallSheet";

// One route, five in-page steps: pick the cast, set the speaking order,
// optional backstory, scene, then name the room and create it.

const GROUP_MIN = 2;
// How many characters fit in one room is a plan rule (config/plans.js
// group.maxMembers: Basic 3, Plus 5, Ultra 8), read from the server's limits.
// The server enforces it on create and on every send; this only keeps the
// picker honest about what will be accepted.
const GROUP_MAX_FALLBACK = 8;
const SCENE_MAX = 400;
const NAME_MAX = 80; // matches GROUP_NAME_MAX_LEN on the server
const TOTAL_STEPS = 5;

// Mirrors autoTitle in backend/controllers/group.js so the prefill matches what
// the server would have named the room anyway.
function autoTitle(names: string[]) {
  if (names.length === 0) return "a group";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export default function GroupFormationPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selected, setSelected] = useState<string[]>([]); // ids, in pick order
  const [order, setOrder] = useState<string[]>([]); // ids, speaking order
  const [backstory, setBackstory] = useState("");
  const [scene, setScene] = useState("");
  const [name, setName] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag-to-reorder on step 2. The arrow buttons are the touch and keyboard fallback.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Rooms are a paid feature, so reaching this route directly has to paywall
  // too - hiding the entry on Home is not a gate.
  const { allowed, maxMembers, ready: planReady } = useGroupsAllowed();
  const GROUP_MAX = maxMembers > 0 ? maxMembers : GROUP_MAX_FALLBACK;
  const locked = planReady && !allowed;

  useEffect(() => {
    let cancelled = false;
    characterService
      .list()
      .then(({ characters: c }) => !cancelled && setCharacters(c))
      .catch((e) => {
        console.error("group:characters failed", e);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= GROUP_MAX) return prev;
      return [...prev, id];
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setOrder((prev) => {
      if (from < 0 || from >= prev.length || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const onDrop = (to: number) => {
    if (dragIndex !== null) reorder(dragIndex, to);
    setDragIndex(null);
    setOverIndex(null);
  };

  const goToOrder = () => {
    setOrder(selected); // seed speaking order from pick order
    setStep(2);
  };

  const suggestedName = useMemo(
    () => autoTitle(order.map((id) => byId.get(id)?.name).filter((n): n is string => !!n)),
    [order, byId]
  );

  const goToName = () => {
    // Pre-fill once; if they come back to this step their own text stays put.
    setName((prev) => (prev.trim() ? prev : suggestedName.slice(0, NAME_MAX)));
    setStep(5);
  };

  // A blank name is fine - the server falls back to the auto title.
  const create = async (finalName: string) => {
    setCreating(true);
    setError(null);
    try {
      const { group } = await groupService.create({
        characterIds: order,
        order,
        backstory: backstory.trim(),
        scene: scene.trim(),
        name: finalName.trim(),
      });
      navigate(`/group/${group.id}`, { state: { group } });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "that didn't work. try again?";
      setError(msg);
      setCreating(false);
    }
  };

  const back = () => {
    if (step === 1) navigate("/home");
    else setStep((s) => s - 1);
  };


  if (locked) {
    return (
      <div className="min-h-[100dvh] w-full app-gradient">
        <PaywallSheet open onClose={() => navigate("/home")} />
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] w-full app-gradient md:flex md:items-center md:justify-center md:px-6 md:py-[6vh]"
      style={{
        background:
          "radial-gradient(125% 80% at 50% 0%, rgba(97,107,120,0.07) 0%, rgba(97,107,120,0) 55%), var(--color-cream)",
      }}
    >
      <div className="mx-auto w-full max-w-[560px] md:max-w-[600px] px-5 md:px-0 pt-[max(1rem,env(safe-area-inset-top))] pb-16 md:pt-0 md:pb-0">
        <div className="md:rounded-[28px] md:border md:border-ink/10 md:bg-cream-light md:px-11 md:py-10 md:shadow-[0_30px_80px_-40px_rgba(22,32,43,0.45)]">
          <div className="flex items-center gap-3 pb-2">
            <button
              type="button"
              aria-label="Back"
              onClick={back}
              className="h-9 w-9 -ml-1 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
            >
              <BackIcon />
            </button>
            <div className="flex-1">
              <div className="h-1 w-full rounded-full bg-ink/10 overflow-hidden">
                <div className="h-full bg-rust transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
              </div>
            </div>
            <span className="font-caveat  text-ink-soft/70 text-[0.8rem] w-10 text-right">
              {step} / {TOTAL_STEPS}
            </span>
          </div>

          {loadError ? (
            <p className="mt-16 text-center font-caveat  text-muted">couldn't load your characters. try again?</p>
          ) : loading ? (
            <p className="mt-16 text-center font-caveat  text-muted">gathering them…</p>
          ) : (
            <div className="mt-6">
              {step === 1 && (
                <>
                  <h1 className="font-display  text-ink text-[1.8rem]">A room, then.</h1>
                  <p className="font-caveat  text-ink-soft/80 text-[0.9rem] mt-1">
                    pick {GROUP_MIN} to {GROUP_MAX} of your characters. you'll set the scene next.
                  </p>

                  {characters.length < GROUP_MIN ? (
                    <div className="mt-10 text-center">
                      <p className="font-serif  text-muted text-[0.9rem]">
                        you need at least two characters for a room.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/character-builder")}
                        className="mt-4 rounded-full bg-rust text-cream-soft font-serif  text-[0.85rem] px-5 py-2 hover:bg-rust-hover transition cursor-pointer"
                      >
                        build someone →
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        {characters.map((c) => {
                          const on = selected.includes(c.id);
                          const full = !on && selected.length >= GROUP_MAX;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggle(c.id)}
                              disabled={full}
                              className={`text-left rounded-2xl border p-3.5 transition ${on
                                ? "border-rust bg-rust/[0.06]"
                                : full
                                  ? "border-ink/10 opacity-40 cursor-default"
                                  : "border-ink/10 hover:border-rust/40 hover:bg-ink/[0.02] cursor-pointer"
                                }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <CharacterFace
                                  name={c.name}
                                  colour={c.colour}
                                  avatar={c.avatar}
                                  className="h-8 w-8 font-display text-[0.85rem] shrink-0"
                                />
                                <span className="min-w-0">
                                  <span className="block font-display text-ink text-[0.95rem] truncate">{c.name}</span>
                                  <span className="block font-serif  text-muted text-[0.72rem] truncate">
                                    {c.quickLine || "-"}
                                  </span>
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        disabled={selected.length < GROUP_MIN}
                        onClick={goToOrder}
                        className={`mt-7 w-full rounded-full font-serif  text-[0.95rem] px-5 py-3 transition ${selected.length >= GROUP_MIN
                          ? "bg-rust text-cream-soft hover:bg-rust-hover cursor-pointer"
                          : "bg-rust/30 text-cream-soft/80 cursor-default"
                          }`}
                      >
                        {selected.length >= GROUP_MIN
                          ? `Continue with ${selected.length} →`
                          : `pick ${GROUP_MIN - selected.length} more`}
                      </button>
                    </>
                  )}
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="font-display  text-ink text-[1.6rem]">Who speaks first?</h1>
                  <p className="font-caveat  text-ink-soft/80 text-[0.9rem] mt-1">drag to reorder. or leave it.</p>

                  <div className="mt-5 flex flex-col gap-2">
                    {order.map((id, i) => {
                      const c = byId.get(id);
                      const dragging = dragIndex === i;
                      const dropTarget = overIndex === i && dragIndex !== null && dragIndex !== i;
                      return (
                        <div
                          key={id}
                          draggable
                          onDragStart={(e) => {
                            setDragIndex(i);
                            e.dataTransfer.effectAllowed = "move";
                            // Firefox needs data set for the drag to start.
                            e.dataTransfer.setData("text/plain", id);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (overIndex !== i) setOverIndex(i);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            onDrop(i);
                          }}
                          onDragEnd={() => {
                            setDragIndex(null);
                            setOverIndex(null);
                          }}
                          className={`flex items-center gap-3 rounded-2xl border bg-cream-light p-3 transition ${dragging
                            ? "border-rust/50 opacity-50"
                            : dropTarget
                              ? "border-rust bg-rust/[0.06]"
                              : "border-ink/10"
                            }`}
                        >
                          <span aria-hidden className="text-ink-soft/40 cursor-grab active:cursor-grabbing select-none leading-none text-[1.1rem]">
                            ⠿
                          </span>
                          <span className="font-caveat  text-ink-soft/60 text-[0.8rem] w-5 text-center">{i + 1}</span>
                          <CharacterFace
                            name={c?.name}
                            colour={c?.colour}
                            avatar={c?.avatar}
                            className="h-8 w-8 font-display text-[0.85rem] shrink-0"
                          />
                          <span className="flex-1 font-display text-ink text-[0.95rem] truncate">{c?.name}</span>
                          <span className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label="Move up"
                              onClick={() => move(i, -1)}
                              disabled={i === 0}
                              className="h-7 w-7 rounded-full border border-ink/15 text-ink-soft flex items-center justify-center disabled:opacity-30 hover:bg-ink/5 cursor-pointer disabled:cursor-default"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label="Move down"
                              onClick={() => move(i, 1)}
                              disabled={i === order.length - 1}
                              className="h-7 w-7 rounded-full border border-ink/15 text-ink-soft flex items-center justify-center disabled:opacity-30 hover:bg-ink/5 cursor-pointer disabled:cursor-default"
                            >
                              ↓
                            </button>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="mt-7 w-full rounded-full bg-rust text-cream-soft font-serif  text-[0.95rem] px-5 py-3 hover:bg-rust-hover cursor-pointer transition"
                  >
                    Continue →
                  </button>
                </>
              )}

              {step === 3 && (
                <>
                  <h1 className="font-display  text-ink text-[1.6rem]">Do they know each other?</h1>
                  <p className="font-caveat  text-ink-soft/80 text-[0.9rem] mt-1">one line if so. skip if not.</p>

                  <textarea
                    value={backstory}
                    onChange={(e) => setBackstory(e.target.value.slice(0, SCENE_MAX))}
                    rows={3}
                    placeholder="e.g. aria and kabir went to the same college…"
                    className="mt-5 w-full resize-none rounded-2xl border border-ink/10 bg-cream-light p-4 font-serif text-[0.95rem] text-ink placeholder:text-ink-soft/50 outline-none focus:border-rust/40 leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    className="mt-6 w-full rounded-full bg-rust text-cream-soft font-serif  text-[0.95rem] px-5 py-3 hover:bg-rust-hover cursor-pointer transition"
                  >
                    Continue →
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBackstory("");
                      setStep(4);
                    }}
                    className="mt-3 w-full text-center font-caveat  text-ink-soft/70 text-[0.85rem] hover:text-ink-soft cursor-pointer"
                  >
                    they're meeting for the first time
                  </button>
                </>
              )}

              {step === 4 && (
                <>
                  <h1 className="font-display  text-ink text-[1.6rem]">Set the scene.</h1>
                  <p className="font-caveat  text-ink-soft/80 text-[0.9rem] mt-1">
                    one or two lines. where, when, what's happening.
                  </p>

                  <textarea
                    value={scene}
                    onChange={(e) => setScene(e.target.value.slice(0, SCENE_MAX))}
                    rows={4}
                    placeholder="e.g. a bench at marine drive, sunday evening, rain starting…"
                    className="mt-5 w-full resize-none rounded-2xl border border-ink/10 bg-cream-light p-4 font-instrument  text-[1.05rem] text-ink placeholder:text-ink-soft/50 placeholder:not- outline-none focus:border-rust/40 leading-relaxed"
                  />
                  <p className="text-right font-caveat  text-ink-soft/50 text-[0.72rem] mt-1 pr-1">
                    {scene.length} / {SCENE_MAX}
                  </p>

                  <button
                    type="button"
                    onClick={goToName}
                    className="mt-4 w-full rounded-full bg-rust text-cream-soft font-serif  text-[0.95rem] px-5 py-3 hover:bg-rust-hover cursor-pointer transition"
                  >
                    Continue →
                  </button>
                </>
              )}

              {step === 5 && (
                <>
                  <h1 className="font-display  text-ink text-[1.6rem]">And what do we call it?</h1>
                  <p className="font-caveat  text-ink-soft/80 text-[0.9rem] mt-1">
                    a name for the room. you can change it later.
                  </p>

                  <input
                    type="text"
                    value={name}
                    aria-label="Group name"
                    autoFocus
                    maxLength={NAME_MAX}
                    onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !creating) {
                        e.preventDefault();
                        create(name);
                      }
                    }}
                    placeholder={suggestedName}
                    className="mt-5 w-full rounded-2xl border border-ink/10 bg-cream-light p-4 font-instrument  text-[1.05rem] text-ink placeholder:text-ink-soft/50 placeholder:not- outline-none focus:border-rust/40"
                  />
                  <p className="text-right font-caveat  text-ink-soft/50 text-[0.72rem] mt-1 pr-1">
                    {name.length} / {NAME_MAX}
                  </p>

                  {error && <p className="font-caveat  text-rust text-[0.8rem] mt-2">{error}</p>}

                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => create(name)}
                    className={`mt-4 w-full rounded-full font-serif  text-[0.95rem] px-5 py-3 transition ${creating ? "bg-rust/40 text-cream-soft/80 cursor-default" : "bg-rust text-cream-soft hover:bg-rust-hover cursor-pointer"
                      }`}
                  >
                    {creating ? "bringing them in…" : "Step in →"}
                  </button>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => {
                      setName("");
                      create("");
                    }}
                    className="mt-3 w-full text-center font-caveat  text-ink-soft/70 text-[0.85rem] hover:text-ink-soft cursor-pointer disabled:opacity-50 disabled:cursor-default"
                  >
                    just call it "{suggestedName}"
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
