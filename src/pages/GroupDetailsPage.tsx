import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { groupService, type Group, type GroupMember } from "../services/groupService";
import CharacterFace from "../components/CharacterFace";
import { ApiError } from "../services/authService";
import GroupMemberEditor from "../components/GroupMemberEditor";

// Edits here write to a character's seat in *this* group only - never to the
// character itself, and never to another group's copy of them.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}


/** A member with at least one field pinned to this room shows a small note. */
const hasOverrides = (m: GroupMember) =>
  m.overrides.name !== null ||
  m.overrides.colour !== null ||
  m.overrides.quickLine !== null ||
  m.overrides.tones !== null;

/**
 * One editable room field (scene, backstory). Click to edit, Enter or blur to
 * save, Escape to cancel - the same shape as the room's own name field above.
 */
function RoomField({
  label,
  placeholder,
  value,
  max,
  busy,
  onSave,
}: {
  label: string;
  placeholder: string;
  value: string;
  max: number;
  busy: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [editing, value]);

  const commit = () => {
    setEditing(false);
    onSave(draft.slice(0, max));
  };

  return (
    <div>
      <p className="font-caveat text-muted/80 text-[0.9rem] mb-1">{label}</p>
      {editing ? (
        <>
          <textarea
            ref={ref}
            rows={2}
            value={draft}
            maxLength={max}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            className="w-full resize-none rounded-xl border border-rust/40 bg-cream px-3 py-2 font-instrument text-[1rem] text-ink leading-relaxed focus:outline-none"
          />
          <p className="text-muted/70 text-[0.72rem] mt-1">
            {busy ? "saving…" : `${draft.length} / ${max} - enter to save, esc to cancel`}
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left font-instrument text-[1rem] leading-relaxed rounded-xl px-1 py-0.5 hover:bg-ink/[0.04] transition cursor-pointer"
        >
          {value ? (
            <span className="text-ink-soft">{value}</span>
          ) : (
            <span className="text-muted/70">{placeholder}</span>
          )}
        </button>
      )}
    </div>
  );
}

export default function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const passed = (location.state as { group?: Group } | null)?.group;

  const [group, setGroup] = useState<Group | null>(passed ?? null);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState<GroupMember | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingRoom, setSavingRoom] = useState<"scene" | "backstory" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    groupService
      .get(groupId, { limit: 1 })
      .then(({ group: g }) => !cancelled && setGroup(g))
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setLoadError(true);
        else console.error("group:get failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const saveRoomField = async (field: "scene" | "backstory", value: string) => {
    if (!group || savingRoom) return;
    const trimmed = value.trim();
    if (trimmed === (field === "scene" ? group.scene : group.backstory)) return;
    setSavingRoom(field);
    try {
      const { group: updated } = await groupService.update(group.id, { [field]: trimmed });
      setGroup((g) => (g ? { ...g, scene: updated.scene, backstory: updated.backstory } : updated));
      setToast("saved.");
    } catch {
      setToast("that didn't save. try again?");
    } finally {
      setSavingRoom(null);
      setTimeout(() => setToast(null), 2400);
    }
  };

  const removeMember = async (m: GroupMember) => {
    if (!group) return;
    try {
      const { group: updated, message } = await groupService.removeMember(group.id, m.characterId);
      setGroup(updated);
      setToast(message);
    } catch (e) {
      setToast(e instanceof ApiError && e.message ? e.message : "that didn't work. try again?");
    } finally {
      setTimeout(() => setToast(null), 2400);
    }
  };

  // The editor hands back the whole saved group, so no extra round trip.
  const onSaved = useCallback((updated: Group) => {
    setGroup((g) => (g ? { ...g, members: updated.members } : updated));
  }, []);

  const startRename = () => {
    if (!group) return;
    setNameDraft(group.name);
    setEditingName(true);
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    });
  };

  const commitRename = async () => {
    if (!group || savingName) return;
    const next = nameDraft.trim().slice(0, 80);
    if (!next || next === group.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    const prevName = group.name;
    setGroup((g) => (g ? { ...g, name: next } : g));
    setEditingName(false);
    try {
      const { group: updated } = await groupService.rename(group.id, next);
      setGroup((g) => (g ? { ...g, name: updated.name } : g));
    } catch (e) {
      console.error("group:rename failed", e);
      setGroup((g) => (g ? { ...g, name: prevName } : g));
    } finally {
      setSavingName(false);
    }
  };

  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commitRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingName(false);
    }
  };

  const members = group?.members ?? [];
  const backToRoom = () => navigate(`/group/${groupId}`, { state: group ? { group } : undefined });

  if (loadError) {
    return (
      <div className="min-h-[100dvh] w-full app-gradient flex flex-col items-center justify-center text-center px-6">
        <p className="font-display  text-ink text-[1.15rem]">
          that group isn't <span className="text-rust">here</span>.
        </p>
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="mt-4 rounded-full bg-rust text-cream-soft font-serif  text-[0.85rem] px-5 py-2 hover:bg-rust-hover transition cursor-pointer"
        >
          home →
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full app-gradient">
      <div className="mx-auto w-full max-w-[440px] md:max-w-[680px] px-4 md:px-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">

        <div className="flex items-center gap-2 pb-3 border-b border-ink/10">
          <button
            type="button"
            aria-label="Back to the room"
            onClick={backToRoom}
            className="h-9 w-9 -ml-1 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="font-caveat  text-muted/80 text-[0.95rem]">group details</p>
        </div>

        <div className="mt-7 flex flex-col items-center text-center">
          <div className="flex -space-x-3">
            {members.slice(0, 5).map((m) => (
              <CharacterFace
                key={m.characterId}
                name={m.name}
                colour={m.colour}
                avatar={m.avatar}
                className="h-12 w-12 font-display text-[1.05rem] ring-2 ring-cream shadow-[inset_0_-4px_10px_rgba(0,0,0,0.16)]"
              />
            ))}
          </div>

          <div className="mt-4 w-full px-2">
            {editingName ? (
              <input
                ref={nameInputRef}
                value={nameDraft}
                maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={onNameKeyDown}
                onBlur={() => void commitRename()}
                aria-label="Group name"
                className="w-full text-center bg-transparent font-instrument text-ink text-[1.5rem] leading-tight outline-none border-b border-rust/40 pb-0.5"
              />
            ) : (
              <button
                type="button"
                onClick={startRename}
                disabled={!group}
                title="Rename this group"
                className="max-w-full font-instrument text-ink text-[1.5rem] leading-tight break-words hover:text-rust transition cursor-pointer disabled:cursor-default"
              >
                {group?.name ?? "…"}
              </button>
            )}
            <p className="font-caveat  text-muted/70 text-[0.85rem] mt-1">
              tap the name to rename this room
            </p>
          </div>
        </div>

        <div className="mt-9">
          <p className="font-caveat  text-muted/80 text-[0.95rem] mb-2">in the room</p>

          <ul className="flex flex-col divide-y divide-ink/[0.07] rounded-2xl border border-ink/10 bg-cream-light overflow-hidden">
            {members.map((m) => (
              <li key={m.characterId} className="flex items-center gap-3 px-3.5 py-3">
                <CharacterFace
                  name={m.name}
                  colour={m.colour}
                  avatar={m.avatar}
                  className="h-10 w-10 font-display text-[0.9rem] shrink-0 shadow-[inset_0_-3px_8px_rgba(0,0,0,0.14)]"
                />

                <div className="flex-1 min-w-0">
                  <p className="font-serif text-ink text-[0.95rem] truncate">
                    {m.name}
                    {hasOverrides(m) && (
                      <span className="font-caveat  text-rust/70 text-[0.78rem] ml-1.5">
                        edited for this room
                      </span>
                    )}
                  </p>
                  <p className="font-instrument  text-ink-soft/70 text-[0.85rem] truncate">
                    {m.quickLine || (m.tones.length ? m.tones.join(", ") : "nothing written down yet")}
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={`Edit ${m.name ?? "this member"} in this group`}
                  title={`Edit ${m.name ?? "this member"} - this group only`}
                  onClick={() => setEditing(m)}
                  className="h-9 w-9 shrink-0 rounded-full border border-ink/12 text-ink-soft flex items-center justify-center hover:bg-ink/5 hover:text-rust active:scale-95 transition cursor-pointer"
                >
                  <EditIcon />
                </button>
                {/* §6.10 - a room is 2 to 5, so the last two seats stay put.
                    The cast used to be fixed at formation: swapping someone out
                    meant rebuilding the room and losing its transcript. */}
                <button
                  type="button"
                  aria-label={`Remove ${m.name ?? "this member"} from this room`}
                  title={
                    members.length <= 2
                      ? "a room needs two."
                      : `Remove ${m.name ?? "this member"} from this room`
                  }
                  disabled={members.length <= 2}
                  onClick={() => void removeMember(m)}
                  className="h-9 w-9 shrink-0 rounded-full border border-ink/12 text-ink-soft flex items-center justify-center enabled:hover:bg-danger/10 enabled:hover:text-danger active:scale-95 transition disabled:opacity-35 disabled:cursor-default cursor-pointer"
                >
                  ✕
                </button>
              </li>
            ))}

            {members.length === 0 && (
              <li className="px-3.5 py-6 text-center font-caveat  text-muted/70 text-[0.9rem]">
                no one's here yet.
              </li>
            )}
          </ul>

          <p className="mt-2.5 font-caveat  text-muted/70 text-[0.85rem] leading-snug">
            editing someone here changes them in this group only. they stay as they were in your
            other groups, and the original character isn't touched.
          </p>
        </div>

        {/* Scene and backstory used to be write-once: the server's PATCH
            hardcoded `name`, so sending a new scene answered "nothing to
            change yet." and changed nothing. Both are editable in place now. */}
        <div className="mt-8 rounded-2xl border border-ink/10 bg-cream-light px-4 py-4">
          <RoomField
            label="how they know each other"
            placeholder="add a line about their history?"
            value={group?.backstory ?? ""}
            max={400}
            busy={savingRoom === "backstory"}
            onSave={(v) => void saveRoomField("backstory", v)}
          />
          <div className="h-4" />
          <RoomField
            label="the scene"
            placeholder="where are they, right now?"
            value={group?.scene ?? ""}
            max={400}
            busy={savingRoom === "scene"}
            onSave={(v) => void saveRoomField("scene", v)}
          />
        </div>

        {toast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-7 left-1/2 -translate-x-1/2 z-[70] rounded-full bg-charcoal text-cream-light text-[0.84rem] px-5 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)] chat-toast-in"
          >
            {toast}
          </div>
        )}

        <button
          type="button"
          onClick={backToRoom}
          className="mt-8 w-full rounded-full bg-rust text-cream-soft font-serif  text-[0.9rem] px-5 py-2.5 hover:bg-rust-hover transition cursor-pointer"
        >
          back to the room →
        </button>
      </div>

      {editing && groupId && (
        <GroupMemberEditor
          groupId={groupId}
          member={editing}
          onSaved={onSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
