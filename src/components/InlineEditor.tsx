import { useEffect, useRef, useState } from "react";

// Turns a message bubble into a textarea in place. Enter saves, Shift+Enter
// adds a line, Esc cancels.

export default function InlineEditor({
  initial,
  className,
  busy = false,
  maxHeight = 220,
  maxChars,
  hint,
  saveLabel = "Save",
  onSave,
  onCancel,
}: {
  initial: string;
  /** The bubble's own classes, so the field matches what it replaced. */
  className: string;
  busy?: boolean;
  maxHeight?: number;
  /** Same character ceiling the composer enforces. */
  maxChars?: number;
  hint?: string;
  saveLabel?: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  // Cursor at the end, not the start; edits are usually to the tail.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    grow(el);
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = text.trim();
  const overLimit = !!maxChars && trimmed.length > maxChars;
  const canSave = !!trimmed && !overLimit && !busy;
  const save = () => {
    if (!canSave) return;
    onSave(trimmed);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <textarea
        ref={ref}
        rows={1}
        value={text}
        disabled={busy}
        onChange={(e) => {
          setText(e.target.value);
          grow(e.target);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        className={`${className} w-full resize-none outline-none focus:ring-1 focus:ring-cream-soft/40 overflow-y-auto no-scrollbar`}
      />
      {overLimit && (
        <p className="font-caveat  text-rust text-[0.72rem] text-right pr-1">
          {trimmed.length.toLocaleString()} / {maxChars?.toLocaleString()} - shorten?
        </p>
      )}

      <div className="flex items-center gap-2 self-end">
        {hint && (
          <span className="font-caveat  text-ink-soft/70 text-[0.74rem] mr-auto">{hint}</span>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="font-serif text-[0.78rem] text-ink-soft/70 hover:text-ink-soft px-1 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={`rounded-full font-serif text-[0.78rem] px-3 py-1 transition ${canSave
            ? "bg-rust text-cream-light hover:bg-rust-hover active:scale-[0.98] cursor-pointer"
            : "bg-ink/10 text-ink-soft/50 cursor-not-allowed"
            }`}
        >
          {busy ? "saving…" : saveLabel}
        </button>
      </div>
    </div>
  );
}
