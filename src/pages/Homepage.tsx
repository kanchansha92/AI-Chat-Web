import { useEffect, useMemo, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { characterService, type Character } from "../services/characterService";
import { journalService, type JournalThread } from "../services/journalService";
// ASSUMPTION: groupService has the same shape as journalService. If the real
// one differs, fix this import, the Group type and the groupService.list() call.
import { groupService, type GroupSummary } from "../services/groupService";
import { useGroupsAllowed } from "../hook/usePlan";
import PaywallSheet from "../components/PaywallSheet";
import GeneralChatBar from "../components/GeneralChatBar";
import AccountMenu from "../components/AccountMenu";
import SidebarSearch, {
    SearchIcon,
    type SearchItem,
    type SearchKind,
} from "../components/SidebarSearch";
import {
    startNewChat,
    openChat as openGeneralChatAction,
    deleteChat,
    renameChat,
    togglePin as togglePinChat,
} from "../redux/generalChatsSlice";
import {
    togglePin as togglePinAction,
    clearPin as clearPinAction,
    sortPinned,
    pinKey,
    type PinKind,
} from "../redux/pinsSlice";

/* The greeting itself. Rotates by time of day rather than by how long you've
   been away - there is no "we missed you" here on purpose. */
function greeting(firstName: string): string {
    const hour = new Date().getHours();
    if (hour < 5) return `Still up, ${firstName}.`;
    if (hour < 12) return `Morning, ${firstName}.`;
    if (hour < 17) return `Afternoon, ${firstName}.`;
    return `Evening, ${firstName}.`;
}

/* The greeting on the desk. Just that - what you do next is yours to pick from
   the sidebar or the bar below; nothing here nudges. */
function Desk({ firstName, compact = false }: { firstName: string; compact?: boolean }) {
    return (
        <div className={`w-full ${compact ? "px-4 pb-4" : "max-w-[760px] mx-auto px-4 pb-5"}`}>
            <div className="text-center">
                <h1 className={`font-display text-ink leading-[1.1] tracking-[-0.01em] ${compact ? "text-[1.7rem]" : "text-[2.2rem] lg:text-[2.7rem]"}`}>
                    {greeting(firstName)}
                </h1>
                <p className={`font-serif text-ink-soft mt-2 ${compact ? "text-[0.85rem]" : "text-[0.95rem]"}`}>
                    What would you like to do? Nothing is fine too.
                </p>
            </div>
        </div>
    );
}

/** The wordmark's glyph: a small ember. Same drawing as public/favicon.svg. */
function PrivateaileMark({ className = "h-9 w-9" }: { className?: string }) {
    return (
        <span className={`${className} rounded-full bg-rust/10 text-rust flex items-center justify-center shrink-0`} aria-hidden="true">
            <svg viewBox="0 0 64 64" className="h-[62%] w-[62%]">
                <path d="M32 14c1.5 6.5 7 9.5 9.5 15.5 2.8 6.8-.3 15-9.5 16.5-9.2-1.5-12.3-9.7-9.5-16.5C25 23.5 30.5 20.5 32 14z" fill="currentColor" />
                <path d="M18 50.5c9-2.5 19-2.5 28 0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
            </svg>
        </span>
    );
}

function MenuIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
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

function JournalIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" />
            <path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
        </svg>
    );
}

function PanelIcon({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.25" y="4.25" width="17.5" height="15.5" rx="2.6" />
            <path d="M9.75 4.25v15.5" />
        </svg>
    );
}

function ChevronIcon({ open, className = "h-4 w-4" }: { open: boolean; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`${className} transition-transform duration-200 ${open ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 18l6-6-6-6" />
        </svg>
    );
}

function DotsIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="12" cy="19" r="1.7" />
        </svg>
    );
}

function PinIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15.5 3.5l5 5-2.6.9-3.3 3.3.5 4.2-2 2-8-8 2-2 4.2.5 3.3-3.3.9-2.6z" />
            <path d="M8.1 15.9L3.5 20.5" />
        </svg>
    );
}

function PencilIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 20h4l10-10a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20z" />
            <path d="M13.5 7.5l3 3" />
        </svg>
    );
}

function ShareIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5.5" r="2.6" />
            <circle cx="6" cy="12" r="2.6" />
            <circle cx="18" cy="18.5" r="2.6" />
            <path d="M8.4 10.8l7.2-3.9M8.4 13.2l7.2 3.9" />
        </svg>
    );
}

function TrashIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 6.5h15M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7" />
            <path d="M6.5 6.5l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12" />
            <path d="M10.5 10.5v6M13.5 10.5v6" />
        </svg>
    );
}

/** Marks a DEEP character; same star the builder's Deep tab uses. */
function DeepStarIcon({ className = "h-2.5 w-2.5" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.44l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95L12 2.6z" />
        </svg>
    );
}

const AVATAR_OLIVE = "#6f7a4e";
function avatarColour(colour: string | undefined): string {
    if (!colour || colour.toLowerCase() === "#a8b08c") return AVATAR_OLIVE;
    return colour;
}

function HomePage() {
    const user = useAppSelector((s) => s.auth.user);
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [loadingCharacters, setLoadingCharacters] = useState(true);
    // §12.4 - group chat is trial-only; after the trial the entry locks and
    // tapping it opens the paywall instead of navigating.
    const [paywall, setPaywall] = useState(false);
    const { allowed: groupsAllowed, ready: groupPlanReady } = useGroupsAllowed();
    const rpLocked = groupPlanReady && !groupsAllowed;

    const [journalThreads, setJournalThreads] = useState<JournalThread[] | null>(null);
    const [journalDropdownOpen, setJournalDropdownOpen] = useState(false);

    // One set of open/closed flags drives both the mobile drawer and the
    // desktop sidebar - only one of those layouts is visible at a time.
    const [buildDropdownOpen, setBuildDropdownOpen] = useState(false);
    const [singleCharDropdownOpen, setSingleCharDropdownOpen] = useState(false);
    const [groupCharDropdownOpen, setGroupCharDropdownOpen] = useState(false);
    const [groups, setGroups] = useState<GroupSummary[] | null>(null);

    // General chats come from the shared slice, not local state, so this list
    // stays in sync with the inline chat area (§6.14).
    const dispatch = useAppDispatch();
    const generalSessions = useAppSelector((s) => s.generalChats.sessions);
    const generalCurrentId = useAppSelector((s) => s.generalChats.currentId);
    const startNewGeneralChat = () => dispatch(startNewChat());
    const openGeneralChat = (id: string) => dispatch(openGeneralChatAction(id));
    const deleteGeneralChat = (id: string) => dispatch(deleteChat(id));
    const renameGeneralChat = (id: string, title: string) =>
        dispatch(renameChat({ id, title }));
    const togglePinGeneralChat = (id: string) => dispatch(togglePinChat(id));
    const [recentOpen, setRecentOpen] = useState(true);
    const [pinnedOpen, setPinnedOpen] = useState(false);

    const pinnedMap = useAppSelector((s) => s.pins.pinned);
    const togglePinned = (kind: PinKind, id: string) =>
        dispatch(togglePinAction({ kind, id }));
    const clearPin = (kind: PinKind, id: string) =>
        dispatch(clearPinAction({ kind, id }));

    // Searches general chats (titles and transcripts), journal threads,
    // characters and groups. An empty box lists the pinned items.
    const [searchOpen, setSearchOpen] = useState(false);

    // md and up only; the mobile drawer opens and closes on its own.
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem("ember.sidebarCollapsed") === "1";
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem("ember.sidebarCollapsed", sidebarCollapsed ? "1" : "0");
        } catch {
            /* private mode - don't remember it */
        }
    }, [sidebarCollapsed]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen(true);
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                e.preventDefault();
                setSidebarCollapsed((v) => !v);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const searchItems: SearchItem[] = useMemo(() => {
        const out: SearchItem[] = [];

        for (const s of generalSessions) {
            out.push({
                kind: "chat",
                id: s.id,
                title: s.title,
                pinned: !!s.pinned,
                // whole transcript, so searching a phrase from inside a chat finds it
                extra: s.messages.map((m) => m.text).join(" \n"),
            });
        }
        for (const t of journalThreads ?? []) {
            out.push({
                kind: "journal",
                id: t.id,
                title: t.name,
                subtitle: t.lastEntryPreview || undefined,
                colour: avatarColour(t.colour),
                pinned: !!pinnedMap[`journal:${t.id}`],
                extra: t.lastEntryPreview ?? "",
            });
        }
        for (const c of characters) {
            out.push({
                kind: "character",
                id: c.id,
                title: c.name,
                subtitle: c.quickLine || undefined,
                colour: avatarColour(c.colour),
                avatar: c.avatar,
                deep: c.mode === "DEEP",
                pinned: !!pinnedMap[`character:${c.id}`],
                extra: [c.quickLine, ...(c.tones ?? [])].filter(Boolean).join(" "),
            });
        }
        for (const g of groups ?? []) {
            const memberNames = (g.members ?? [])
                .map((m) => m.name ?? m.original?.name ?? "")
                .filter(Boolean);
            out.push({
                kind: "group",
                id: g.id,
                title: g.name,
                subtitle: memberNames.join(" · ") || undefined,
                colour: avatarColour(g.members?.[0]?.colour ?? undefined),
                avatar: g.members?.[0]?.avatar ?? null,
                pinned: !!pinnedMap[`group:${g.id}`],
                extra: [...memberNames, g.scene ?? "", g.lastPreview ?? ""].join(" "),
            });
        }
        return out;
    }, [generalSessions, journalThreads, characters, groups, pinnedMap]);

    const openSearchResult = (kind: SearchKind, id: string) => {
        setMenuOpen(false);
        if (kind === "chat") {
            openGeneralChat(id);
        } else if (kind === "journal") {
            navigate(`/journal/${id}`);
        } else if (kind === "character") {
            const c = characters.find((x) => x.id === id);
            if (c) openChat(c);
        } else {
            const g = groups?.find((x) => x.id === id);
            if (g) openGroup(g);
        }
    };

    // One row menu serves every sidebar list; `kind` tells the handlers which
    // collection the row came from. It is position:fixed and anchored to the
    // button's rect because the nav scrolls and would clip an absolute panel.
    type RowKind = "chat" | PinKind;
    // A pinned thread/character/group is drawn twice - in "Pinned" and in its
    // own dropdown - so `scope` keeps the untouched copy from reacting too.
    type RowScope = "pinned" | "list";
    const [rowMenu, setRowMenu] = useState<
        { kind: RowKind; id: string; scope: RowScope; x: number; y: number } | null
    >(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [renaming, setRenaming] = useState<
        { kind: RowKind; id: string; scope: RowScope } | null
    >(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [sharedKey, setSharedKey] = useState<string | null>(null);

    const rowKey = (kind: RowKind, id: string) => `${kind}:${id}`;
    const isRowPinned = (kind: RowKind, id: string) =>
        kind === "chat"
            ? !!generalSessions.find((s) => s.id === id)?.pinned
            : !!pinnedMap[rowKey(kind, id)];

    // Pinned first, then each list's own newest-first order. General chats are
    // the exception: pinning moves them out of "Recent" entirely.
    const pinnedSessions = generalSessions.filter((s) => !!s.pinned);
    const recentSessions = generalSessions.filter((s) => !s.pinned);
    const orderedCharacters = sortPinned(characters, "character", pinnedMap);
    const orderedGroups = sortPinned(groups ?? [], "group", pinnedMap);
    const orderedThreads = sortPinned(journalThreads ?? [], "journal", pinnedMap);

    const pinnedThreads = (journalThreads ?? []).filter(
        (t) => !!pinnedMap[pinKey("journal", t.id)]
    );
    const pinnedCharacters = characters.filter(
        (c) => !!pinnedMap[pinKey("character", c.id)]
    );
    const pinnedGroups = (groups ?? []).filter(
        (g) => !!pinnedMap[pinKey("group", g.id)]
    );
    const pinnedCount =
        pinnedSessions.length +
        pinnedThreads.length +
        pinnedCharacters.length +
        pinnedGroups.length;

    useEffect(() => {
        if (!rowMenu) return;
        const close = () => setRowMenu(null);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setRowMenu(null);
        };
        window.addEventListener("click", close);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("keydown", onKey);
        };
    }, [rowMenu]);

    const openRowMenu = (
        e: ReactMouseEvent,
        kind: RowKind,
        id: string,
        scope: RowScope
    ) => {
        e.stopPropagation();
        e.preventDefault();
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const WIDTH = 176;
        const HEIGHT = 172;
        // Flip the panel above / left when it would run off the viewport.
        const x = Math.min(r.left, window.innerWidth - WIDTH - 8);
        const y =
            r.bottom + HEIGHT > window.innerHeight - 8
                ? Math.max(8, r.top - HEIGHT - 4)
                : r.bottom + 4;
        setConfirmingDelete(false);
        setRowMenu((cur) =>
            cur?.id === id && cur.kind === kind && cur.scope === scope
                ? null
                : { kind, id, scope, x: Math.max(8, x), y }
        );
    };

    const rowTitle = (kind: RowKind, id: string): string => {
        if (kind === "chat") return generalSessions.find((s) => s.id === id)?.title ?? "";
        if (kind === "journal") return journalThreads?.find((t) => t.id === id)?.name ?? "";
        if (kind === "character") return characters.find((c) => c.id === id)?.name ?? "";
        return groups?.find((g) => g.id === id)?.name ?? "";
    };

    const flashShared = (kind: RowKind, id: string) => {
        const key = rowKey(kind, id);
        setSharedKey(key);
        window.setTimeout(() => setSharedKey((v) => (v === key ? null : v)), 1800);
    };

    const toggleRowPin = (kind: RowKind, id: string) => {
        if (kind === "chat") togglePinGeneralChat(id);
        else togglePinned(kind, id);
    };

    /* Optimistic rename. General chats live in the browser store; the other
       three hit their API and refetch the list if the write fails. */
    const commitRename = async () => {
        const target = renaming;
        const clean = renameDraft.trim().replace(/\s+/g, " ").slice(0, 80);
        setRenaming(null);
        setRenameDraft("");
        if (!target || !clean || clean === rowTitle(target.kind, target.id)) return;

        try {
            if (target.kind === "chat") {
                renameGeneralChat(target.id, clean);
            } else if (target.kind === "journal") {
                setJournalThreads((prev) =>
                    prev ? prev.map((t) => (t.id === target.id ? { ...t, name: clean } : t)) : prev
                );
                await journalService.updateThread(target.id, { name: clean });
            } else if (target.kind === "character") {
                setCharacters((prev) =>
                    prev.map((c) => (c.id === target.id ? { ...c, name: clean } : c))
                );
                await characterService.update(target.id, { name: clean });
            } else {
                setGroups((prev) =>
                    prev ? prev.map((g) => (g.id === target.id ? { ...g, name: clean } : g)) : prev
                );
                await groupService.rename(target.id, clean);
            }
        } catch (err) {
            console.error("sidebar rename failed", err);
            refreshList(target.kind);
        }
    };

    /* Optimistic delete, same refetch-on-failure fallback as the rename. */
    const deleteRow = async (kind: RowKind, id: string) => {
        try {
            if (kind === "chat") {
                deleteGeneralChat(id);
                return;
            }
            clearPin(kind, id);
            if (kind === "journal") {
                setJournalThreads((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
                await journalService.removeThread(id);
            } else if (kind === "character") {
                setCharacters((prev) => prev.filter((c) => c.id !== id));
                await characterService.remove(id);
            } else {
                setGroups((prev) => (prev ? prev.filter((g) => g.id !== id) : prev));
                await groupService.remove(id);
            }
        } catch (err) {
            console.error("sidebar delete failed", err);
            refreshList(kind);
        }
    };

    const refreshList = (kind: RowKind) => {
        if (kind === "journal") {
            journalService
                .listThreads()
                .then(({ threads }) => setJournalThreads(threads))
                .catch(() => undefined);
        } else if (kind === "character") {
            characterService
                .list()
                .then(({ characters: list }) => setCharacters(list))
                .catch(() => undefined);
        } else if (kind === "group") {
            groupService
                .list()
                .then(({ groups: list }) => setGroups(list))
                .catch(() => undefined);
        }
    };

    /* Threads, characters and groups have a real route to share. General chats
       are browser-local with no URL, so that case shares the transcript. */
    const shareRow = async (kind: RowKind, id: string) => {
        const title = rowTitle(kind, id);
        let text: string;
        let url: string | undefined;

        if (kind === "chat") {
            const session = generalSessions.find((s) => s.id === id);
            if (!session) return;
            text = [
                session.title,
                "",
                ...session.messages.map(
                    (m) =>
                        `${m.kind === "user" ? "You" : m.kind === "assistant" ? "Privateaile" : "-"}: ${m.text}`
                ),
            ].join("\n");
        } else {
            const path =
                kind === "journal" ? `/journal/${id}` : kind === "character" ? `/chat/${id}` : `/group/${id}`;
            url = `${window.location.origin}${path}`;
            text = url;
        }

        try {
            if (navigator.share) {
                await navigator.share(url ? { title, text: title, url } : { title, text });
            } else {
                await navigator.clipboard.writeText(text);
                flashShared(kind, id);
            }
        } catch (err) {
            console.error("sidebar share failed", err);
        }
    };

    const sidebarRow = (opts: {
        kind: RowKind;
        id: string;
        label: string;
        leading: ReactNode;
        onOpen: () => void;
        active?: boolean;
        /** Which copy of the row this is; see RowScope. Defaults to "list". */
        scope?: RowScope;
    }) => {
        const { kind, id, label, leading, onOpen, active } = opts;
        const scope: RowScope = opts.scope ?? "list";
        const open =
            rowMenu?.kind === kind && rowMenu.id === id && rowMenu.scope === scope;
        const isRenaming =
            renaming?.kind === kind && renaming.id === id && renaming.scope === scope;
        const pinned = isRowPinned(kind, id);

        return (
            <div
                key={`${scope}:${kind}:${id}`}
                className={`group/rc flex items-center rounded-lg transition ${active || open ? "bg-cream-dark/60" : "hover:bg-cream-dark/40"}`}
            >
                {isRenaming ? (
                    <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => void commitRename()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void commitRename();
                            if (e.key === "Escape") {
                                setRenaming(null);
                                setRenameDraft("");
                            }
                        }}
                        maxLength={80}
                        className="flex-1 min-w-0 py-1.5 px-2.5 rounded-lg bg-cream border border-rust/40 font-serif text-xs text-ink outline-none focus:border-rust"
                    />
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={onOpen}
                            title={label}
                            className="flex-1 min-w-0 text-left py-1 px-2.5 flex items-center gap-2 cursor-pointer"
                        >
                            {leading}
                            {pinned && <PinIcon className="h-3 w-3 text-rust/80 shrink-0" />}
                            <span className="font-serif text-xs text-ink-soft group-hover/rc:text-ink truncate min-w-0">
                                {sharedKey === rowKey(kind, id) ? "Copied to clipboard" : label}
                            </span>
                        </button>
                        <button
                            type="button"
                            aria-label={`Options for ${label}`}
                            aria-haspopup="menu"
                            aria-expanded={open}
                            onClick={(e) => openRowMenu(e, kind, id, scope)}
                            className={`shrink-0 px-2 py-1 rounded-md text-ink-soft/50 hover:text-ink hover:bg-cream-dark/70 transition cursor-pointer focus:opacity-100 ${open ? "opacity-100 text-ink" : "opacity-0 group-hover/rc:opacity-100"}`}
                        >
                            <DotsIcon />
                        </button>
                    </>
                )}
            </div>
        );
    };

    /* The deep badge hangs off a relative wrapper that is exactly the avatar's
       size, so deep and quick rows stay pixel-aligned. */
    const rowAvatar = (
        name: string,
        colour?: string,
        deep = false,
        avatar?: string | null
    ) => {
        const dot = (
            <span
                style={{ backgroundColor: avatarColour(colour) }}
                className="h-5 w-5 rounded-full flex items-center justify-center font-instrument  text-cream-soft text-[0.65rem] shrink-0 overflow-hidden"
            >
                {avatar ? (
                    // The coloured span stays behind this, so a broken or slow
                    // image leaves the swatch showing instead of a hole.
                    <img
                        src={avatar}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                        }}
                    />
                ) : (
                    name[0]?.toUpperCase() ?? "·"
                )}
            </span>
        );

        if (!deep) return dot;

        return (
            <span
                className="relative h-5 w-5 shrink-0"
                title="Built the deep way"
                aria-label="Deep character"
            >
                {dot}
                <span
                    className="absolute -bottom-[3px] -right-[3px] grid h-3 w-3 place-items-center
                               rounded-full bg-cream text-rust ring-[1.5px] ring-cream"
                >
                    <DeepStarIcon className="h-[9px] w-[9px]" />
                </span>
            </span>
        );
    };

    useEffect(() => {
        let cancelled = false;
        characterService
            .list()
            .then(({ characters: list }) => {
                if (!cancelled) setCharacters(list);
            })
            .catch((e) => console.error("characters:list failed", e))
            .finally(() => {
                if (!cancelled) setLoadingCharacters(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        journalService
            .listThreads()
            .then(({ threads }) => {
                if (!cancelled) setJournalThreads(threads);
            })
            .catch((e) => {
                console.error("homepage:listThreads failed", e);
                if (!cancelled) setJournalThreads([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        groupService
            .list()
            .then(({ groups: list }) => {
                if (!cancelled) setGroups(list);
            })
            .catch((e) => {
                console.error("homepage:listGroups failed", e);
                if (!cancelled) setGroups([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);


    const firstName = user?.name?.split(" ")[0] ?? "there";

    const openChat = (c: Character) => {
        navigate(`/chat/${c.id}`, { state: { character: c } });
    };

    const openGroup = (g: GroupSummary) => {
        navigate(`/group/${g.id}`, { state: { group: g } });
    };

    // Same trial lock as the dashboard's "Group chat" card (§12.4).
    const handleCreateGroup = () => {
        setMenuOpen(false);
        if (rpLocked) {
            setPaywall(true);
        } else {
            navigate("/group/new");
        }
    };

    const generalChatRow = (
        s: (typeof generalSessions)[number],
        scope: RowScope = "list"
    ) =>
        sidebarRow({
            kind: "chat",
            id: s.id,
            scope,
            label: s.title,
            active: s.id === generalCurrentId,
            leading: (
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-ink-soft/70 shrink-0" aria-hidden="true">
                    <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
            ),
            onOpen: () => {
                openGeneralChat(s.id);
                setMenuOpen(false);
            },
        });

    const journalThreadRow = (
        t: JournalThread,
        scope: RowScope = "list"
    ) =>
        sidebarRow({
            kind: "journal",
            id: t.id,
            scope,
            label: t.name,
            leading: rowAvatar(t.name, t.colour),
            onOpen: () => {
                setMenuOpen(false);
                navigate(`/journal/${t.id}`);
            },
        });

    const characterRow = (c: Character, scope: RowScope = "list") =>
        sidebarRow({
            kind: "character",
            id: c.id,
            scope,
            label: c.name,
            leading: rowAvatar(c.name, c.colour, c.mode === "DEEP", c.avatar),
            onOpen: () => {
                setMenuOpen(false);
                openChat(c);
            },
        });

    const groupRow = (g: GroupSummary, scope: RowScope = "list") =>
        sidebarRow({
            kind: "group",
            id: g.id,
            scope,
            label: g.name,
            leading: rowAvatar(
                g.name,
                g.members?.[0]?.colour ?? undefined,
                false,
                // groups have no photo of their own, so borrow the first member's
                g.members?.[0]?.avatar ?? undefined
            ),
            onOpen: () => {
                setMenuOpen(false);
                openGroup(g);
            },
        });

    // Gathers every pinned item across the four lists. A kind's heading only
    // shows when that kind has something pinned.
    const pinnedMenu = (compact: boolean) => {
        if (pinnedCount === 0) return null;

        const groupLabel = "px-2.5 pt-1.5 pb-0.5 font-caveat  text-muted text-[0.7rem] leading-none";

        return (
            <div className="w-full">
                <button
                    type="button"
                    onClick={() => setPinnedOpen((v) => !v)}
                    className={`flex items-center justify-between w-full ${compact ? "px-3 py-2 text-[0.86rem]" : "px-3 lg:px-4 py-2 lg:py-1.5 text-[0.82rem] lg:text-[0.86rem]"} rounded-xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif transition duration-150 text-left cursor-pointer`}
                >
                    <div className="flex items-center gap-3">
                        {compact ? (
                            <PinIcon className="h-4 w-4" />
                        ) : (
                            <span className="p-1 rounded-lg bg-cream-dark/50 shrink-0 text-ink-soft">
                                <PinIcon className="h-4 w-4" />
                            </span>
                        )}
                        <span>Pinned</span>
                    </div>
                    <ChevronIcon open={pinnedOpen} className="h-4 w-4 text-ink-soft" />
                </button>

                {pinnedOpen && (
                    <div className={`${compact ? "ml-4" : "ml-4 lg:ml-5"} pl-3 border-l border-hairline/60 my-0.5 flex flex-col gap-0.5`}>
                        {pinnedSessions.length > 0 && (
                            <>
                                <p className={groupLabel}>notes to Privateaile</p>
                                {pinnedSessions.map((s) => generalChatRow(s, "pinned"))}
                            </>
                        )}
                        {pinnedThreads.length > 0 && (
                            <>
                                <p className={groupLabel}>journal</p>
                                {pinnedThreads.map((t) => journalThreadRow(t, "pinned"))}
                            </>
                        )}
                        {pinnedCharacters.length > 0 && (
                            <>
                                <p className={groupLabel}>characters</p>
                                {pinnedCharacters.map((c) => characterRow(c, "pinned"))}
                            </>
                        )}
                        {pinnedGroups.length > 0 && (
                            <>
                                <p className={groupLabel}>rooms</p>
                                {pinnedGroups.map((g) => groupRow(g, "pinned"))}
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // `compact` is the mobile drawer's tighter sizing, same as the others here.
    const recentChatsMenu = (compact: boolean) => (
        <div className="w-full">
            <button
                type="button"
                onClick={() => setRecentOpen((v) => !v)}
                className={`flex items-center justify-between w-full ${compact ? "px-3 py-2 text-[0.86rem]" : "px-3 lg:px-4 py-2 lg:py-1.5 text-[0.82rem] lg:text-[0.86rem]"} rounded-xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif transition duration-150 text-left cursor-pointer`}
            >
                <div className="flex items-center gap-3">
                    {compact ? (
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
                            <path d="M12 7.5V12l3 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <span className="p-1 rounded-lg bg-cream-dark/50 shrink-0 text-ink-soft">
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
                                <path d="M12 7.5V12l3 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                    )}
                    <span>Recent notes</span>
                </div>
                <ChevronIcon open={recentOpen} className="h-4 w-4 text-ink-soft" />
            </button>

            {recentOpen && (
                <div className={`${compact ? "ml-4" : "ml-4 lg:ml-5"} pl-3 border-l border-hairline/60 my-0.5 flex flex-col gap-0.5`}>
                    {recentSessions.length === 0 ? (
                        <p className="font-caveat  text-muted text-xs px-2.5 py-1">
                            {generalSessions.length === 0 ? "nothing written yet" : "all chats pinned"}
                        </p>
                    ) : (
                        recentSessions.map((s) => generalChatRow(s, "list"))
                    )}
                </div>
            )}
        </div>
    );

    const buildCharacterMenu = (compact: boolean) => (
        <div className="w-full">
            <button
                type="button"
                onClick={() => setBuildDropdownOpen((v) => !v)}
                className={`flex items-center justify-between w-full ${compact ? "px-3 py-2 text-[0.86rem]" : "px-3 lg:px-4 py-2 lg:py-1.5 text-[0.82rem] lg:text-[0.86rem]"} rounded-xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif transition duration-150 text-left cursor-pointer`}
            >
                <div className="flex items-center gap-3">
                    {compact ? (
                        <PlusIcon className="h-4 w-4" />
                    ) : (
                        <span className="p-1 rounded-lg bg-cream-dark/50 shrink-0 text-ink-soft">
                            <PlusIcon className="h-4 w-4" />
                        </span>
                    )}
                    <span>Characters</span>
                </div>
                <ChevronIcon open={buildDropdownOpen} className="h-4 w-4 text-ink-soft" />
            </button>

            {buildDropdownOpen && (
                <div className={`${compact ? "ml-4" : "ml-4 lg:ml-5"} pl-3 border-l border-hairline/60 my-0.5 flex flex-col gap-0.5`}>
                    <div className="w-full">
                        <button
                            type="button"
                            onClick={() => setSingleCharDropdownOpen((v) => !v)}
                            className="flex items-center justify-between w-full text-left py-1 px-2.5 text-xs font-serif text-ink-soft hover:text-ink rounded-lg hover:bg-cream-dark/40 transition cursor-pointer"
                        >
                            <span>One to one</span>
                            <ChevronIcon open={singleCharDropdownOpen} className="h-3.5 w-3.5 text-ink-soft" />
                        </button>
                        {singleCharDropdownOpen && (
                            <div className="ml-3 pl-2.5 border-l border-hairline/40 my-0.5 flex flex-col gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        navigate("/character-builder");
                                    }}
                                    className="text-left py-1 px-2.5 text-xs font-serif  text-rust hover:text-rust-hover rounded-lg hover:bg-rust/5 transition cursor-pointer flex items-center gap-1.5"
                                >
                                    <PlusIcon className="h-3 w-3" />
                                    <span>New character</span>
                                </button>
                                {loadingCharacters ? (
                                    <p className="font-caveat  text-muted text-xs px-2.5 py-1">loading…</p>
                                ) : characters.length === 0 ? (
                                    <p className="font-caveat  text-muted text-xs px-2.5 py-1">no characters yet</p>
                                ) : (
                                    orderedCharacters.map((c) => characterRow(c))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="w-full">
                        <button
                            type="button"
                            onClick={() => setGroupCharDropdownOpen((v) => !v)}
                            className="flex items-center justify-between w-full text-left py-1 px-2.5 text-xs font-serif text-ink-soft hover:text-ink rounded-lg hover:bg-cream-dark/40 transition cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5">
                                Story rooms
                                {rpLocked && (
                                    <span
                                        aria-hidden="true"
                                        title="on Plus"
                                        className="h-1.5 w-1.5 rounded-full bg-rust"
                                    />
                                )}
                            </span>
                            <ChevronIcon open={groupCharDropdownOpen} className="h-3.5 w-3.5 text-ink-soft" />
                        </button>
                        {groupCharDropdownOpen && (
                            <div className="ml-3 pl-2.5 border-l border-hairline/40 my-0.5 flex flex-col gap-0.5">
                                <button
                                    type="button"
                                    onClick={handleCreateGroup}
                                    className="text-left py-1 px-2.5 text-xs font-serif  text-rust hover:text-rust-hover rounded-lg hover:bg-rust/5 transition cursor-pointer flex items-center gap-1.5"
                                >
                                    <PlusIcon className="h-3 w-3" />
                                    <span>New room</span>
                                </button>
                                {groups === null ? (
                                    <p className="font-caveat  text-muted text-xs px-2.5 py-1">loading…</p>
                                ) : groups.length === 0 ? (
                                    <p className="font-caveat  text-muted text-xs px-2.5 py-1">no groups yet</p>
                                ) : (
                                    orderedGroups.map((g) => groupRow(g))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="h-[100dvh] min-h-screen w-full overflow-hidden app-gradient">
            {/* Mobile (< md). Side padding lives on the inner blocks (header row,
                GeneralChatBar's GUTTER) rather than here, so the thread can scroll
                edge to edge with its scrollbar against the screen edge. */}
            <div className="md:hidden h-full w-full flex items-start justify-center pt-[max(0.75rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]">
                <main className="w-full max-w-[440px] h-full flex flex-col">
                    <div className="flex items-center justify-between shrink-0 px-5">
                        <button
                            type="button"
                            aria-label="Menu"
                            aria-expanded={menuOpen}
                            onClick={() => setMenuOpen((v) => !v)}
                            className="h-9 w-9 rounded-full bg-cream-dark text-ink flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer"
                        >
                            <MenuIcon />
                        </button>
                    </div>

                    {/* Inline on the page, not a modal and not a character (§6.14).
                        The greeting below is the empty state; after the first
                        message this area becomes the live thread. */}
                    <GeneralChatBar>
                        <Desk compact firstName={firstName} />
                    </GeneralChatBar>
                </main>

                <div
                    className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 ${menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                />

                <aside
                    className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[80%] h-full bg-cream shadow-2xl flex flex-col p-6 pt-[max(1.5rem,env(safe-area-inset-top))] transform transition-transform duration-300 ease-out ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
                >
                    <div className="flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <PrivateaileMark className="h-9 w-9" />
                            <div>
                                <h2 className="font-display text-ink text-[1.35rem] leading-none">privateaile</h2>
                                <p className="font-serif  text-muted text-[0.65rem]">a quiet place</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                aria-label="Close menu"
                                onClick={() => setMenuOpen(false)}
                                className="h-8 w-8 rounded-full bg-cream-dark text-ink flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-0.5 mt-6 flex-1 min-h-0 overflow-y-auto quiet-scrollbar pr-1 -mr-1">
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                startNewGeneralChat();
                            }}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif text-[0.86rem] transition cursor-pointer"
                        >
                            <PlusIcon />
                            <span>write to Privateaile</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMenuOpen(false);
                                setSearchOpen(true);
                            }}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif text-[0.86rem] transition cursor-pointer"
                        >
                            <SearchIcon />
                            <span>search</span>
                        </button>
                        {pinnedMenu(true)}
                        {buildCharacterMenu(true)}
                        <div className="w-full">
                            <button
                                type="button"
                                onClick={() => setJournalDropdownOpen(!journalDropdownOpen)}
                                className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif text-[0.86rem] transition cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <JournalIcon />
                                    <span>journal</span>
                                </div>
                                <ChevronIcon open={journalDropdownOpen} className="h-4 w-4 text-ink-soft" />
                            </button>
                            {journalDropdownOpen && (
                                <div className="ml-4 pl-3 border-l border-hairline/60 my-0.5 flex flex-col gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            navigate("/journal");
                                        }}
                                        className="text-left py-1 px-2.5 text-xs font-serif text-ink-soft hover:text-ink rounded-lg hover:bg-cream-dark/40 transition cursor-pointer"
                                    >
                                        All threads
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMenuOpen(false);
                                            navigate("/journal/new");
                                        }}
                                        className="text-left py-1 px-2.5 text-xs font-serif  text-rust hover:text-rust-hover rounded-lg hover:bg-rust/5 transition cursor-pointer flex items-center gap-1.5"
                                    >
                                        <PlusIcon className="h-3 w-3" />
                                        <span>New thread</span>
                                    </button>
                                    {journalThreads === null ? (
                                        <p className="font-caveat  text-muted text-xs px-2.5 py-1">loading…</p>
                                    ) : journalThreads.length === 0 ? (
                                        <p className="font-caveat  text-muted text-xs px-2.5 py-1">no threads yet</p>
                                    ) : (
                                        orderedThreads.map((t) => journalThreadRow(t))
                                    )}
                                </div>
                            )}
                        </div>
                        {recentChatsMenu(true)}
                        {/* settings moved into the account popup below, so it is
                            deliberately absent from this nav list */}
                    </nav>

                    <div className="shrink-0 mt-4 pt-6 border-t border-hairline pb-[env(safe-area-inset-bottom)]">
                        <AccountMenu compact onNavigate={() => setMenuOpen(false)} />
                    </div>
                </aside>
            </div>

            {/* Tablet / desktop (md and up) */}
            {/* No background of its own - the page gradient on the shell
                above shows through, same as the mobile branch. */}
            <div className="hidden md:flex h-full w-full">
                {/* the sidebar folded down to icons; most of these expand it again */}
                {sidebarCollapsed && (
                    <aside className="w-16 bg-cream-light/35 border-r border-hairline py-5 flex flex-col items-center gap-1 shrink-0 h-full overflow-hidden">
                        <button
                            type="button"
                            aria-label="Expand sidebar"
                            aria-expanded={false}
                            title="Expand sidebar (⌘B)"
                            onClick={() => setSidebarCollapsed(false)}
                            className="h-9 w-9 rounded-xl text-ink-soft flex items-center justify-center hover:bg-cream-dark/60 hover:text-ink active:scale-95 transition cursor-pointer"
                        >
                            <PanelIcon />
                        </button>

                        <div className="my-2">
                            <PrivateaileMark className="h-9 w-9" />
                        </div>

                        <button
                            type="button"
                            aria-label="Search"
                            title="Search (⌘K)"
                            onClick={() => setSearchOpen(true)}
                            className="h-9 w-9 rounded-xl text-ink-soft flex items-center justify-center hover:bg-cream-dark/60 hover:text-ink active:scale-95 transition cursor-pointer"
                        >
                            <SearchIcon />
                        </button>

                        <button
                            type="button"
                            aria-label="Write to Privateaile"
                            title="Write to Privateaile"
                            onClick={() => startNewGeneralChat()}
                            className="h-9 w-9 rounded-xl text-ink-soft flex items-center justify-center hover:bg-cream-dark/60 hover:text-ink active:scale-95 transition cursor-pointer"
                        >
                            <PlusIcon />
                        </button>

                        <button
                            type="button"
                            aria-label="Journal"
                            title="Journal"
                            onClick={() => {
                                setSidebarCollapsed(false);
                                setJournalDropdownOpen(true);
                            }}
                            className="h-9 w-9 rounded-xl text-ink-soft flex items-center justify-center hover:bg-cream-dark/60 hover:text-ink active:scale-95 transition cursor-pointer"
                        >
                            <JournalIcon />
                        </button>

                        <button
                            type="button"
                            aria-label="Characters"
                            title="Characters"
                            onClick={() => {
                                setSidebarCollapsed(false);
                                setBuildDropdownOpen(true);
                            }}
                            className="h-9 w-9 rounded-xl text-ink-soft flex items-center justify-center hover:bg-cream-dark/60 hover:text-ink active:scale-95 transition cursor-pointer"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="8" r="3.4" />
                                <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
                            </svg>
                        </button>

                        {/* the account popup needs the room, so this expands first */}
                        <div className="mt-auto pt-4">
                            <button
                                type="button"
                                aria-label="Account"
                                title={user?.name ?? "Account"}
                                onClick={() => setSidebarCollapsed(false)}
                                className="h-9 w-9 rounded-full bg-cream-dark/70 text-ink-soft font-display text-[0.8rem] flex items-center justify-center hover:text-ink hover:brightness-95 active:scale-95 transition cursor-pointer"
                            >
                                {firstName.charAt(0).toUpperCase()}
                            </button>
                        </div>
                    </aside>
                )}

                {!sidebarCollapsed && (
                    <aside className="w-56 lg:w-64 xl:w-72 bg-cream-light/35 border-r border-hairline p-5 lg:p-8 flex flex-col shrink-0 h-full overflow-hidden">
                        <div className="shrink-0">
                            <div className="flex items-center gap-2 lg:gap-3">
                                <PrivateaileMark className="h-9 w-9 lg:h-10 lg:w-10" />
                                <div className="min-w-0 flex-1">
                                    <h1 className="font-display text-ink text-[1.45rem] lg:text-[1.6rem] leading-none">privateaile</h1>
                                    <p className="font-serif  text-muted text-xs truncate">a quiet place</p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Collapse sidebar"
                                    aria-expanded={true}
                                    title="Collapse sidebar (⌘B)"
                                    onClick={() => setSidebarCollapsed(true)}
                                    className="h-7 w-7 lg:h-8 lg:w-8 rounded-full bg-cream-dark/60 text-ink-soft flex items-center justify-center shrink-0 hover:bg-cream-dark hover:text-ink active:scale-95 transition cursor-pointer"
                                >
                                    <PanelIcon />
                                </button>
                            </div>
                        </div>

                        {/* the only scrolling region - branding and account stay put */}
                        <nav className="flex flex-col gap-0.5 mt-6 lg:mt-8 flex-1 min-h-0 overflow-y-auto quiet-scrollbar pr-1 -mr-1">
                            <button
                                type="button"
                                onClick={() => startNewGeneralChat()}
                                className="flex items-center gap-3 w-full px-3 lg:px-4 py-2 lg:py-1.5 rounded-2xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif text-[0.82rem] lg:text-[0.86rem] transition duration-150 text-left cursor-pointer"
                            >
                                <span className="p-1 rounded-lg bg-cream-dark/50 shrink-0 text-ink-soft">
                                    <PlusIcon />
                                </span>
                                <span>Write to PrivateAile</span>
                            </button>

                            <button
                                type="button"
                                title="Search (⌘K)"
                                onClick={() => setSearchOpen(true)}
                                className="flex items-center gap-3 w-full px-3 lg:px-4 py-2 lg:py-1.5 rounded-2xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif text-[0.82rem] lg:text-[0.86rem] transition duration-150 text-left cursor-pointer"
                            >
                                <span className="p-1 rounded-lg bg-cream-dark/50 shrink-0 text-ink-soft">
                                    <SearchIcon />
                                </span>
                                <span>Search</span>
                            </button>

                            {pinnedMenu(false)}

                            {buildCharacterMenu(false)}

                            <div className="w-full">
                                <button
                                    type="button"
                                    onClick={() => setJournalDropdownOpen(!journalDropdownOpen)}
                                    className="flex items-center justify-between w-full px-3 lg:px-4 py-2 lg:py-1.5 rounded-2xl text-ink-soft hover:bg-cream-dark/50 hover:text-ink font-serif text-[0.82rem] lg:text-[0.86rem] transition duration-150 text-left cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="p-1 rounded-lg bg-cream-dark/50 shrink-0 text-ink-soft">
                                            <JournalIcon />
                                        </span>
                                        <span>Journal</span>
                                    </div>
                                    <ChevronIcon open={journalDropdownOpen} className="h-4 w-4 text-ink-soft" />
                                </button>
                                {journalDropdownOpen && (
                                    <div className="ml-4 lg:ml-5 pl-3 border-l border-hairline/60 my-0.5 flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => navigate("/journal")}
                                            className="text-left py-1 px-3 text-xs font-serif text-ink-soft hover:text-ink rounded-xl hover:bg-cream-dark/40 transition cursor-pointer"
                                        >
                                            All threads
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate("/journal/new")}
                                            className="text-left py-1 px-3 text-xs font-serif  text-rust hover:text-rust-hover rounded-xl hover:bg-rust/5 transition cursor-pointer flex items-center gap-1.5"
                                        >
                                            <PlusIcon className="h-3.5 w-3.5" />
                                            <span>New thread</span>
                                        </button>
                                        {journalThreads === null ? (
                                            <p className="font-caveat  text-muted text-xs px-3 py-1">loading threads…</p>
                                        ) : journalThreads.length === 0 ? (
                                            <p className="font-caveat  text-muted text-xs px-3 py-1">no threads yet</p>
                                        ) : (
                                            orderedThreads.map((t) => journalThreadRow(t))
                                        )}
                                    </div>
                                )}
                            </div>

                            {recentChatsMenu(false)}

                        </nav>

                        <div className="shrink-0 mt-4 pt-6 border-t border-hairline">
                            <AccountMenu />
                        </div>
                    </aside>
                )}

                {/* Horizontal padding lives on GeneralChatBar's GUTTER, not here,
                    so the thread's scrollbar sits against the window edge. */}
                <main className="flex-1 flex flex-col py-6 lg:py-10 2xl:py-12 w-full min-h-0">
                    <GeneralChatBar>
                        <Desk firstName={firstName} />
                    </GeneralChatBar>
                </main>
            </div>

            {/* Rendered once here because the lists themselves appear twice
                (mobile drawer and desktop sidebar). */}
            {rowMenu && (() => {
                const { kind, id, scope } = rowMenu;
                const label = rowTitle(kind, id);
                if (!label) return null;
                const pinned = isRowPinned(kind, id);
                const noun =
                    kind === "chat" ? "note" : kind === "journal" ? "thread" : kind === "character" ? "character" : "room";
                const itemBase =
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left font-serif text-xs transition cursor-pointer";
                const item = `${itemBase} text-ink-soft hover:bg-cream-dark/60 hover:text-ink`;
                // Built off `itemBase` rather than `item` so no competing
                // text-color utility wins the cascade and greys the red out.
                const itemDanger = `${itemBase} text-danger hover:text-danger-hover hover:bg-danger/5`;
                return (
                    <div
                        role="menu"
                        onClick={(e) => e.stopPropagation()}
                        style={{ top: rowMenu.y, left: rowMenu.x, width: 176 }}
                        className="fixed z-[70] py-1 rounded-xl bg-cream border border-hairline shadow-xl overflow-hidden"
                    >
                        {confirmingDelete ? (
                            <>
                                <p className="px-3 pt-1 pb-2 font-serif text-[0.7rem] text-muted leading-snug">
                                    Delete this {noun}? {kind === "chat" ? "It's gone from this browser." : "This can't be undone."}
                                </p>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={itemDanger}
                                    onClick={() => {
                                        void deleteRow(kind, id);
                                        setConfirmingDelete(false);
                                        setRowMenu(null);
                                    }}
                                >
                                    <TrashIcon />
                                    <span>Yes, delete</span>
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={item}
                                    onClick={() => setConfirmingDelete(false)}
                                >
                                    <span className="w-3.5" />
                                    <span>Cancel</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={item}
                                    onClick={() => {
                                        toggleRowPin(kind, id);
                                        setRowMenu(null);
                                    }}
                                >
                                    <PinIcon />
                                    <span>{pinned ? `Unpin ${noun}` : `Pin ${noun}`}</span>
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={item}
                                    onClick={() => {
                                        setRenaming({ kind, id, scope });
                                        setRenameDraft(label);
                                        setRowMenu(null);
                                    }}
                                >
                                    <PencilIcon />
                                    <span>Rename</span>
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={item}
                                    onClick={() => {
                                        void shareRow(kind, id);
                                        setRowMenu(null);
                                    }}
                                >
                                    <ShareIcon />
                                    <span>Share</span>
                                </button>
                                <div className="my-1 border-t border-hairline/70" />
                                <button
                                    type="button"
                                    role="menuitem"
                                    className={itemDanger}
                                    onClick={() => setConfirmingDelete(true)}
                                >
                                    <TrashIcon />
                                    <span>Delete</span>
                                </button>
                            </>
                        )}
                    </div>
                );
            })()}

            <SidebarSearch
                open={searchOpen}
                onClose={() => setSearchOpen(false)}
                items={searchItems}
                onOpen={openSearchResult}
            />

            {/* §12.4 - shown when a locked roleplay entry is tapped */}
            <PaywallSheet open={paywall} onClose={() => setPaywall(false)} />
        </div>
    );
}

export default HomePage;