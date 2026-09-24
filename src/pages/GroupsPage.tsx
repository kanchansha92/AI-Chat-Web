import { useEffect, useState } from "react";
import CharacterFace from "../components/CharacterFace";
import { useNavigate } from "react-router-dom";
import { groupService, type GroupSummary } from "../services/groupService";
import { ApiError } from "../services/authService";
import { useGroupsAllowed } from "../hook/usePlan";
import PaywallSheet from "../components/PaywallSheet";

// The rooms already made, newest-touched first - that's the order GET /groups
// returns. Deleting cascades the members and transcript away, hence the confirm.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M10 11v6M14 11v6" />
    </svg>
  );
}

// Mirrors the server's autoTitle: "Aria & Kabir" / "Aria, Kabir & Devi".
function joinNames(names: string[]) {
  if (names.length === 0) return "-";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

// "just now" / "3h" / "yesterday" / "12 Jun"
function relTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function AvatarStack({ members }: { members: GroupSummary["members"] }) {
  const ordered = [...members].sort((a, b) => a.order - b.order);
  const shown = ordered.slice(0, 4);
  const extra = ordered.length - shown.length;
  return (
    <span className="flex items-center shrink-0">
      {shown.map((m, i) => (
        <CharacterFace
          key={m.characterId}
          name={m.name}
          colour={m.colour ?? "var(--color-rust)"}
          avatar={m.avatar}
          title={m.name ?? undefined}
          className="h-9 w-9 -ml-2 first:ml-0 font-display text-[0.85rem] ring-2 ring-cream-light"
          style={{ zIndex: shown.length - i }}
        />
      ))}
      {extra > 0 && (
        <span className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center font-serif  text-ink-soft text-[0.72rem] bg-cream ring-2 ring-cream-light">
          +{extra}
        </span>
      )}
    </span>
  );
}

export default function GroupsPage() {
  const navigate = useNavigate();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<GroupSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Rooms are a paid feature (config/plans.js group.maxMembers): Free sees the
  // paywall instead of the list, so there is nothing to fetch. The server
  // refuses either way - this only saves a pointless request.
  const { allowed, ready: planReady } = useGroupsAllowed();
  const locked = planReady && !allowed;

  useEffect(() => {
    if (locked) return;
    let cancelled = false;
    groupService
      .list()
      .then(({ groups: g }) => !cancelled && setGroups(g))
      .catch((e) => {
        console.error("groups:list failed", e);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [locked]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    setDeleteError(null);
    try {
      await groupService.remove(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      setPendingDelete(null);
    } catch (e) {
      // A 404 means it's already gone, so treat that as success.
      if (e instanceof ApiError && e.status === 404) {
        setGroups((prev) => prev.filter((g) => g.id !== id));
        setPendingDelete(null);
      } else {
        console.error("groups:delete failed", e);
        setDeleteError("that didn't work. try again?");
      }
    } finally {
      setDeleting(false);
    }
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
      className="min-h-[100dvh] w-full app-gradient md:flex md:justify-center md:px-6 md:py-[6vh]"
      style={{
        background:
          "radial-gradient(125% 80% at 50% 0%, rgba(37,49,94,0.07) 0%, rgba(37,49,94,0) 55%), var(--color-cream)",
      }}
    >
      <div className="mx-auto w-full max-w-[560px] md:max-w-[600px] px-5 md:px-0 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
        <div className="flex items-center gap-3 pb-1">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/home")}
            className="h-9 w-9 -ml-1 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <h1 className="flex-1 font-display  text-ink text-[1.8rem] leading-none">Your rooms</h1>
          <button
            type="button"
            onClick={() => navigate("/group/new")}
            className="flex items-center gap-1.5 rounded-full bg-rust text-cream-soft font-serif  text-[0.85rem] pl-3 pr-4 py-2 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer shrink-0"
          >
            <PlusIcon /> New
          </button>
        </div>
        <p className="font-caveat  text-ink-soft/70 text-[0.9rem] pl-9">
          scenes with a few characters in them. tap one to step back in.
        </p>

        {loadError ? (
          <p className="mt-16 text-center font-caveat  text-muted">couldn't load your groups. try again?</p>
        ) : loading ? (
          <p className="mt-16 text-center font-caveat  text-muted">gathering your rooms…</p>
        ) : groups.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="font-display  text-ink text-[1.15rem]">No groups yet.</p>
            <p className="font-serif  text-muted text-[0.9rem] mt-1">
              put two or more of your characters in a room together.
            </p>
            <button
              type="button"
              onClick={() => navigate("/group/new")}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-rust text-cream-soft font-serif  text-[0.9rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
            >
              <PlusIcon /> Start a group
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {groups.map((g) => {
              const names = [...g.members].sort((a, b) => a.order - b.order).map((m) => m.name || "-");
              const preview = g.lastPreview?.trim();
              const subtitle = preview || (g.scene?.trim() ? g.scene.trim() : "nothing said yet.");
              return (
                <div
                  key={g.id}
                  className="group relative rounded-2xl border border-ink/10 bg-cream-light transition hover:border-rust/40 hover:shadow-[0_16px_40px_-28px_rgba(22,34,74,0.55)] hover:-translate-y-[1px]"
                >
                  {/* Separate button from the trash control - nested buttons are invalid. */}
                  <button
                    type="button"
                    onClick={() => navigate(`/group/${g.id}`)}
                    className="w-full text-left p-4 cursor-pointer"
                  >
                    <span className="flex items-center gap-3.5">
                      <AvatarStack members={g.members} />

                      <span className="min-w-0 flex-1">
                        {/* pr-8 keeps long names clear of the trash button */}
                        <span className="block font-display text-ink text-[1.05rem] truncate pr-8">
                          {g.name}
                        </span>

                        <span className="block font-serif  text-muted text-[0.74rem] truncate mt-0.5">
                          {joinNames(names)}
                        </span>

                        <span
                          className={`block font-serif text-[0.86rem] truncate mt-1  ${preview ? "text-ink-soft/85" : "text-ink-soft/45"
                            }`}
                        >
                          {subtitle}
                        </span>
                      </span>
                    </span>

                    <span className="mt-2.5 flex items-center gap-2 pl-[2.9rem] font-caveat  text-ink-soft/55 text-[0.74rem]">
                      <span>{relTime(g.updatedAt)}</span>
                      {g.messageCount > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{g.messageCount} {g.messageCount === 1 ? "line" : "lines"}</span>
                        </>
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${g.name}`}
                    title="Delete this group"
                    onClick={() => {
                      setDeleteError(null);
                      setPendingDelete(g);
                    }}
                    className="absolute top-2.5 right-2.5 h-8 w-8 rounded-full flex items-center justify-center text-ink-soft/45 hover:text-danger hover:bg-danger/10 active:scale-95 transition cursor-pointer md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            className="w-full max-w-[400px] rounded-3xl border border-ink/10 bg-cream-light p-6 shadow-[0_30px_80px_-40px_rgba(22,34,74,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display  text-ink text-[1.3rem] leading-tight">
              Delete <span className="text-danger">{pendingDelete.name}</span>?
            </h2>
            <p className="font-serif  text-muted text-[0.9rem] mt-2 leading-relaxed">
              this removes the room and everything said in it. it can't be undone.
            </p>

            {deleteError && (
              <p className="font-caveat  text-danger text-[0.85rem] mt-3">{deleteError}</p>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                className="flex-1 rounded-full border border-ink/15 text-ink-soft font-serif  text-[0.9rem] px-5 py-2.5 hover:bg-ink/5 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:cursor-default"
              >
                keep it
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className={`flex-1 rounded-full font-serif  text-[0.9rem] px-5 py-2.5 transition ${deleting
                  ? "bg-danger/40 text-cream-soft/80 cursor-default"
                  : "bg-danger text-cream-soft hover:bg-danger-hover active:scale-[0.98] cursor-pointer"
                  }`}
              >
                {deleting ? "removing…" : "delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
