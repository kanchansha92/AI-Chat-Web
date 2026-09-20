import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  groupService,
  GROUP_TONES,
  type Group,
  type GroupMember,
  type MemberOverrideInput,
} from "../services/groupService";

// Edits a character's seat in one group. Never touches the character itself or
// their seat in another group; untouched fields keep following the original.

const SWATCHES = [
  { label: "clay", value: "#c96e55" },
  { label: "sage", value: "#a8b08c" },
  { label: "rust", value: "#b5563f" },
  { label: "olive", value: "#8a8a70" },
  { label: "slate", value: "#7d95a3" },
] as const;

const NAME_MAX = 40; // same limits the character builder enforces
const LINE_MAX = 500;

const initial = (name?: string | null) => (name?.[0] ?? "·").toUpperCase();

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export interface GroupMemberEditorProps {
  groupId: string;
  member: GroupMember;
  /** Handed the freshly-saved group so the caller can re-render its cast. */
  onSaved: (group: Group) => void;
  onClose: () => void;
}

export default function GroupMemberEditor({
  groupId,
  member,
  onSaved,
  onClose,
}: GroupMemberEditorProps) {
  // Drafts start from the effective values, i.e. what this room shows now.
  const [name, setName] = useState(member.name ?? "");
  const [colour, setColour] = useState(member.colour ?? "#a8b08c");
  const [quickLine, setQuickLine] = useState(member.quickLine ?? "");
  const [tones, setTones] = useState<string[]>(member.tones ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the drafts whenever a different member is opened in the same mount.
  useEffect(() => {
    setName(member.name ?? "");
    setColour(member.colour ?? "#a8b08c");
    setQuickLine(member.quickLine ?? "");
    setTones(member.tones ?? []);
    setError(null);
  }, [member]);

  useEffect(() => {
    const t = requestAnimationFrame(() => nameRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const onEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const orig = member.original;
  const trimmedName = name.trim();
  const trimmedLine = quickLine.trim();

  const pinned = {
    name: member.overrides.name !== null,
    colour: member.overrides.colour !== null,
    quickLine: member.overrides.quickLine !== null,
    tones: member.overrides.tones !== null,
  };
  const anyPinned = Object.values(pinned).some(Boolean);

  const dirty =
    trimmedName !== (member.name ?? "") ||
    colour !== (member.colour ?? "") ||
    trimmedLine !== (member.quickLine ?? "") ||
    !sameSet(tones, member.tones ?? []);

  const canSave = trimmedName.length > 0 && trimmedName.length <= NAME_MAX && dirty && !saving;

  const toggleTone = (tone: string) =>
    setTones((prev) => (prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]));

  // A field matching the original goes up as null, clearing its override, so a
  // member edited back to their original name follows the character again
  // instead of being frozen at today's value.
  const buildPayload = (): MemberOverrideInput => ({
    name: trimmedName === (orig.name ?? "") ? null : trimmedName,
    colour: colour === (orig.colour ?? "") ? null : colour,
    quickLine: trimmedLine === (orig.quickLine ?? "") ? null : trimmedLine,
    tones: sameSet(tones, orig.tones ?? []) ? null : tones,
  });

  const submit = async (input: MemberOverrideInput) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const { group } = await groupService.updateMember(groupId, member.characterId, input);
      onSaved(group);
      onClose();
    } catch (e) {
      console.error("group:updateMember failed", e);
      setError("that didn't save. try again?");
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!canSave) return;
    void submit(buildPayload());
  };

  const resetToOriginal = () => void submit({ reset: true });

  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  const labelBase = "block font-caveat  text-muted/80 text-[0.9rem] mb-1.5";
  const fieldBase =
    "w-full rounded-xl bg-cream-dark/60 border border-ink/10 px-3 py-2 font-serif text-[0.92rem] text-ink outline-none focus:border-rust/50 transition";

  // Tag beside a label whose field this room has pinned.
  const PinNote = ({ on, fallback }: { on: boolean; fallback: string }) =>
    on ? (
      <span className="font-caveat  text-rust/70 text-[0.8rem] ml-1.5">
        just here{fallback ? `, was "${fallback}"` : ""}
      </span>
    ) : null;

  const previewTones = useMemo(() => tones.join(", "), [tones]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-ink/25 md:bg-ink/40 md:backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${member.name ?? "member"} in this group`}
        className="relative z-10 w-full max-w-[440px] md:max-w-[520px] md:mx-4 max-h-[92dvh] md:max-h-[86vh] overflow-y-auto no-scrollbar rounded-t-3xl md:rounded-3xl bg-cream-light border-t border-x md:border border-ink/10 px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-7 shadow-[0_-8px_32px_rgba(0,0,0,0.16)] md:shadow-[0_24px_70px_-24px_rgba(22,32,43,0.45)]"
      >
        <div className="md:hidden mx-auto -mt-2 mb-4 h-1 w-10 rounded-full bg-ink/15" />

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
        >
          <CloseIcon />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <span
            style={{ backgroundColor: colour }}
            className="h-11 w-11 rounded-full flex items-center justify-center font-display  text-cream-soft text-[1rem] shrink-0 shadow-[inset_0_-4px_10px_rgba(0,0,0,0.16)] transition-colors"
          >
            {initial(trimmedName || member.name)}
          </span>
          <div className="min-w-0">
            <h2 className="font-instrument text-ink text-[1.25rem] leading-tight truncate">
              {trimmedName || member.name || "…"}
            </h2>
            <p className="font-caveat  text-muted/80 text-[0.85rem] leading-none mt-0.5">
              in this room only
            </p>
          </div>
        </div>

        <p className="mt-3 font-serif  text-ink-soft/80 text-[0.82rem] leading-relaxed">
          changes here stay in this group. {orig.name ?? "they"} won't change in your other
          groups, or in the character itself.
        </p>

        <div className="my-5 h-px bg-ink/10" />

        <div className="mb-4">
          <label htmlFor="memberName" className={labelBase}>
            what they're called here
            <PinNote on={pinned.name} fallback={orig.name ?? ""} />
          </label>
          <input
            id="memberName"
            ref={nameRef}
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={onNameKeyDown}
            className={fieldBase}
          />
          {trimmedName.length === 0 && (
            <p className="font-caveat  text-rust text-[0.78rem] mt-1">they need a name.</p>
          )}
        </div>

        <div className="mb-4">
          <span className={labelBase}>
            their colour here
            <PinNote on={pinned.colour} fallback="" />
          </span>
          <div role="radiogroup" aria-label="Member colour" className="flex gap-3">
            {SWATCHES.map((s) => {
              const selected = colour.toLowerCase() === s.value.toLowerCase();
              return (
                <button
                  key={s.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={s.label}
                  onClick={() => setColour(s.value)}
                  style={{ backgroundColor: s.value }}
                  className={`relative h-9 w-9 cursor-pointer rounded-full border-2 shadow-[inset_0_-3px_6px_rgba(0,0,0,0.12)] transition-transform duration-150 hover:scale-[1.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${selected ? "scale-[1.06] border-ink" : "border-transparent"
                    }`}
                >
                  {selected && (
                    <span className="absolute -top-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-ink font-serif text-[10px] text-cream-light">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="memberLine" className={labelBase}>
            a quick line, for this room
            <PinNote on={pinned.quickLine} fallback="" />
          </label>
          <textarea
            id="memberLine"
            value={quickLine}
            maxLength={LINE_MAX}
            placeholder={orig.quickLine || "early thirties, painter, dry sense of humour."}
            onChange={(e) => setQuickLine(e.target.value)}
            className={`${fieldBase} min-h-[64px] resize-none leading-relaxed`}
          />
        </div>

        <div className="mb-5">
          <span className={labelBase}>
            how they sound here
            <PinNote on={pinned.tones} fallback={(orig.tones ?? []).join(", ")} />
          </span>
          <div aria-label="Tone of voice" className="flex flex-wrap gap-1.5">
            {GROUP_TONES.map((tone) => {
              const selected = tones.includes(tone);
              return (
                <button
                  key={tone}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTone(tone)}
                  className={`cursor-pointer rounded-full px-3 py-[3px] font-caveat  text-[0.9rem] leading-normal transition-all duration-150 ${selected
                    ? "border-[1.5px] border-rust-hover bg-rust font-semibold text-cream-light shadow-[0_2px_7px_rgba(97,107,120,0.35)]"
                    : "border-[1.5px] border-dashed border-ink/50 bg-transparent text-ink hover:border-solid hover:border-rust/50"
                    }`}
                >
                  {tone}
                </button>
              );
            })}
          </div>
          {previewTones && (
            <p className="font-caveat  text-muted/70 text-[0.8rem] mt-1.5">
              in this room, they sound {previewTones}.
            </p>
          )}
        </div>

        {error && (
          <p className="font-caveat  text-rust text-[0.85rem] mb-3 text-center">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={`rounded-full font-serif  text-[0.9rem] px-5 py-2.5 transition ${canSave
              ? "bg-rust text-cream-soft hover:bg-rust-hover cursor-pointer"
              : "bg-rust/40 text-cream-soft/70 cursor-default"
              }`}
          >
            {saving ? "saving…" : "save for this group"}
          </button>

          {anyPinned && (
            <button
              type="button"
              onClick={resetToOriginal}
              disabled={saving}
              className="rounded-full border border-dashed border-ink/20 text-ink-soft/70 font-serif text-[0.82rem] px-5 py-2 hover:bg-ink/[0.03] transition cursor-pointer disabled:cursor-default"
            >
              back to the original {orig.name ?? ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
