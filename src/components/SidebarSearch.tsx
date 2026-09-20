import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";

// Searches everything the sidebar holds, message bodies included. HomePage owns
// the lists and hands them over flat, so nothing in here fetches.

export type SearchKind = "chat" | "journal" | "character" | "group";

export interface SearchItem {
    kind: SearchKind;
    id: string;
    title: string;
    /** the small grey line under the title (last entry, member names, …) */
    subtitle?: string;
    colour?: string;
    /** uploaded profile picture, where the row has one - beats the tint */
    avatar?: string | null;
    /** characters only: built the deep way, so the avatar wears a star */
    deep?: boolean;
    pinned?: boolean;
    /** extra text to match on but never show: message bodies, previews */
    extra?: string;
}

const SECTIONS: { kind: SearchKind; label: string }[] = [
    { kind: "chat", label: "Chats" },
    { kind: "journal", label: "Journal" },
    { kind: "character", label: "Characters" },
    { kind: "group", label: "Groups" },
];

export function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.4 15.4L20 20" />
        </svg>
    );
}

function DeepStar({ className = "h-2.5 w-2.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.44l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95L12 2.6z" />
        </svg>
    );
}

function PinDot({ className = "h-3 w-3" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15.5 3.5l5 5-2.6.9-3.3 3.3.5 4.2-2 2-8-8 2-2 4.2.5 3.3-3.3.9-2.6z" />
            <path d="M8.1 15.9L3.5 20.5" />
        </svg>
    );
}

const KIND_NOUN: Record<SearchKind, string> = {
    chat: "chat",
    journal: "thread",
    character: "character",
    group: "group",
};

function highlight(text: string, q: string): ReactNode {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return (
        <>
            {text.slice(0, i)}
            <mark className="bg-rust/15 text-ink rounded-[3px] px-[1px]">{text.slice(i, i + q.length)}</mark>
            {text.slice(i + q.length)}
        </>
    );
}

/** The line of context shown when the hit was in the body, not the title. */
function snippet(extra: string, q: string): string | null {
    if (!q) return null;
    const i = extra.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return null;
    const start = Math.max(0, i - 28);
    const cut = extra.slice(start, start + 96).replace(/\s+/g, " ").trim();
    return `${start > 0 ? "…" : ""}${cut}${start + 96 < extra.length ? "…" : ""}`;
}

export default function SidebarSearch({
    open,
    onClose,
    items,
    onOpen,
}: {
    open: boolean;
    onClose: () => void;
    items: SearchItem[];
    onOpen: (kind: SearchKind, id: string) => void;
}) {
    const [q, setQ] = useState("");
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    // Reset on every open; a stale query is never what you wanted.
    useEffect(() => {
        if (!open) return;
        setQ("");
        setCursor(0);
        const t = window.setTimeout(() => inputRef.current?.focus(), 20);
        return () => window.clearTimeout(t);
    }, [open]);

    const query = q.trim();

    /** Empty box shows the pinned rows, otherwise everything that matches. */
    const matches = useMemo(() => {
        if (!query) return items.filter((it) => it.pinned);
        const needle = query.toLowerCase();
        return items.filter(
            (it) =>
                it.title.toLowerCase().includes(needle) ||
                (it.subtitle ?? "").toLowerCase().includes(needle) ||
                (it.extra ?? "").toLowerCase().includes(needle)
        );
    }, [items, query]);

    // Grouped for display, flat for the arrow keys.
    const grouped = useMemo(
        () =>
            SECTIONS.map((s) => ({ ...s, rows: matches.filter((m) => m.kind === s.kind) })).filter(
                (s) => s.rows.length > 0
            ),
        [matches]
    );
    const flat = useMemo(() => grouped.flatMap((s) => s.rows), [grouped]);

    useEffect(() => {
        setCursor((c) => (flat.length === 0 ? 0 : Math.min(c, flat.length - 1)));
    }, [flat.length]);

    useEffect(() => {
        const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
        el?.scrollIntoView({ block: "nearest" });
    }, [cursor]);

    if (!open) return null;

    const choose = (it: SearchItem) => {
        onClose();
        onOpen(it.kind, it.id);
    };

    const onKeyDown = (e: ReactKeyboardEvent) => {
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => (flat.length ? (c + 1) % flat.length : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => (flat.length ? (c - 1 + flat.length) % flat.length : 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const it = flat[cursor];
            if (it) choose(it);
        }
    };

    let idx = -1;

    return (
        <div
            className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            onKeyDown={onKeyDown}
        >
            <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />

            <div className="relative w-full max-w-[560px] rounded-2xl bg-cream border border-hairline shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline/70">
                    <SearchIcon className="h-4 w-4 text-ink-soft/70 shrink-0" />
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setCursor(0);
                        }}
                        placeholder="Search chats, journal, characters, groups…"
                        className="flex-1 min-w-0 bg-transparent outline-none font-serif text-sm text-ink placeholder:text-muted/80"
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close search"
                        className="shrink-0 px-2 py-0.5 rounded-md font-serif text-[0.65rem] text-ink-soft/70 border border-hairline hover:text-ink hover:bg-cream-dark/50 transition cursor-pointer"
                    >
                        esc
                    </button>
                </div>

                <div ref={listRef} className="max-h-[52vh] overflow-y-auto quiet-scrollbar py-1.5">
                    {!query && flat.length === 0 && (
                        <p className="font-caveat  text-muted text-sm px-4 py-6 text-center">
                            type to search, or pin something to find it here
                        </p>
                    )}
                    {query && flat.length === 0 && (
                        <p className="font-caveat  text-muted text-sm px-4 py-6 text-center">
                            nothing matches "{query}"
                        </p>
                    )}

                    {grouped.map((section) => (
                        <div key={section.kind} className="mb-1">
                            <p className="px-4 pt-2 pb-1 font-serif text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                                {query ? section.label : `Pinned ${section.label.toLowerCase()}`}
                            </p>
                            {section.rows.map((it) => {
                                idx += 1;
                                const i = idx;
                                const active = i === cursor;
                                const inBody =
                                    !!query && !it.title.toLowerCase().includes(query.toLowerCase());
                                const line = inBody
                                    ? snippet(it.extra ?? "", query) ?? it.subtitle
                                    : it.subtitle;
                                return (
                                    <button
                                        key={`${it.kind}:${it.id}`}
                                        type="button"
                                        data-idx={i}
                                        onMouseEnter={() => setCursor(i)}
                                        onClick={() => choose(it)}
                                        className={`w-full flex items-center gap-3 px-4 py-2 text-left transition cursor-pointer ${active ? "bg-cream-dark/60" : "hover:bg-cream-dark/40"}`}
                                    >
                                        <span
                                            className="relative h-6 w-6 shrink-0"
                                            title={it.deep ? "Built the deep way" : undefined}
                                        >
                                            <span
                                                style={{ backgroundColor: it.colour ?? "#6f7a4e" }}
                                                className="h-6 w-6 rounded-full flex items-center justify-center font-instrument  text-cream-soft text-[0.7rem] overflow-hidden"
                                            >
                                                {it.avatar ? (
                                                    <img
                                                        src={it.avatar}
                                                        alt=""
                                                        loading="lazy"
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    it.title[0]?.toUpperCase() ?? "·"
                                                )}
                                            </span>
                                            {it.deep && (
                                                <span
                                                    aria-label="Deep character"
                                                    className="absolute -bottom-[3px] -right-[3px] grid h-3.5 w-3.5 place-items-center
                                                               rounded-full bg-cream text-rust ring-[1.5px] ring-cream"
                                                >
                                                    <DeepStar className="h-2.5 w-2.5" />
                                                </span>
                                            )}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="flex items-center gap-1.5 min-w-0">
                                                {it.pinned && <PinDot className="h-3 w-3 text-rust/80 shrink-0" />}
                                                <span className="font-serif text-[0.8rem] text-ink truncate">
                                                    {highlight(it.title, query)}
                                                </span>
                                            </span>
                                            {line && (
                                                <span className="block font-serif text-[0.68rem] text-muted truncate">
                                                    {line}
                                                </span>
                                            )}
                                        </span>
                                        <span className="shrink-0 font-serif  text-[0.62rem] text-muted">
                                            {KIND_NOUN[it.kind]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="px-4 py-2 border-t border-hairline/70 flex items-center gap-3 font-serif text-[0.62rem] text-muted">
                    <span>↑↓ move</span>
                    <span>↵ open</span>
                    <span className="ml-auto ">ctrl / ⌘ + K</span>
                </div>
            </div>
        </div>
    );
}
