import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  journalService,
  type JournalEntry,
  type JournalThreadWithEntries,
} from "../services/journalService";
import { ApiError } from "../services/authService";
import { useAppSelector } from "../hook/hooks";
import JournalSidebar, { notifyThreadsChanged } from "./JournalSidebar";

// Writing surface for one thread: autosave on a debounce, then ask the backend
// for a reflection. Reflection text comes from lib/reflect.js, not a model yet.

const BODY_MAX = 20000;
const TITLE_MAX = 80;
const SAVE_DEBOUNCE_MS = 1200;
const AI_PREF_KEY = "journal:aiResponse";

function datePill(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const mon = d.toLocaleDateString("en-US", { month: "short" }).toLowerCase();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${day} ${mon} · ${time}`;
}

/** A short name for an entry, for the delete confirmation. */
function entryLabel(entry: JournalEntry): string {
  const source = (entry.title || "").trim() || (entry.body || "").trim();
  const firstLine = source.split("\n")[0].trim();
  if (!firstLine) return "this entry";
  return firstLine.length > 48 ? `${firstLine.slice(0, 47)}…` : firstLine;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 00-14-4.5L4 8" /><path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0014 4.5L20 16" /><path d="M20 20v-4h-4" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5l-8.5 8.5a5 5 0 01-7-7l8.5-8.5a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3l7.8-7.8" />
    </svg>
  );
}

/** Title + body of one saved entry, editable in place. Esc cancels, ⌘/Ctrl+Enter saves. */
function EntryEditor({
  entry,
  saving,
  error,
  onCancel,
  onSave,
}: {
  entry: JournalEntry;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (patch: { title: string; body: string }) => void;
}) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [body, setBody] = useState(entry.body ?? "");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Open with the cursor at the end of the body - edits are usually to the tail.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedBody = body.trim();
  const trimmedTitle = title.trim();
  const bodyTooLong = trimmedBody.length > BODY_MAX;
  const titleTooLong = trimmedTitle.length > TITLE_MAX;
  const changed = trimmedTitle !== (entry.title ?? "").trim() || body !== entry.body;
  const canSave = !!trimmedBody && !bodyTooLong && !titleTooLong && !saving && changed;

  const save = () => {
    if (!canSave) return;
    onSave({ title: trimmedTitle, body });
  };

  return (
    <div className="pt-1">
      <input
        type="text"
        value={title}
        maxLength={TITLE_MAX + 10}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        placeholder="a title, if you want one"
        className="w-full bg-transparent outline-none font-instrument text-ink text-[1.35rem] leading-tight placeholder:text-ink-soft/35 placeholder:text-[1.1rem]"
      />
      <p className="font-caveat  text-muted text-[0.72rem] mt-0.5">{datePill(entry.createdAt)}</p>

      <textarea
        ref={bodyRef}
        value={body}
        maxLength={BODY_MAX + 500}
        onChange={(e) => {
          setBody(e.target.value);
          const el = e.target;
          el.style.height = "auto";
          el.style.height = `${Math.max(el.scrollHeight, 120)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          }
        }}
        className="mt-3 w-full resize-none bg-transparent outline-none font-instrument text-ink/90 text-[1.05rem] leading-[1.85] min-h-[7.5rem] rounded-xl border border-ink/12 focus:border-ink/25 px-3 py-2.5 no-scrollbar transition-colors"
      />

      {titleTooLong && (
        <p className="font-caveat  text-rust text-[0.72rem] text-right">
          {trimmedTitle.length} / {TITLE_MAX} - that title ran long.
        </p>
      )}
      {bodyTooLong && (
        <p className="font-caveat  text-rust text-[0.72rem] text-right">
          {trimmedBody.length} / {BODY_MAX} - that ran long.
        </p>
      )}
      {error && <p className="font-caveat  text-danger text-[0.78rem] mt-1">{error}</p>}

      <div className="mt-2 flex items-center gap-3">
        <span className="font-caveat  text-muted/80 text-[0.72rem] mr-auto hidden md:inline">
          esc to cancel
        </span>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="font-serif text-[0.8rem] text-ink-soft/75 hover:text-ink-soft px-1 cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={`rounded-full font-serif text-[0.8rem] px-4 py-1.5 transition ${canSave
            ? "bg-rust text-cream-light hover:bg-rust-hover active:scale-[0.98] cursor-pointer"
            : "bg-ink/10 text-ink-soft/50 cursor-not-allowed"
            }`}
        >
          {saving ? "saving…" : "save"}
        </button>
      </div>
    </div>
  );
}

function EarlierEntry({
  entry,
  showReflection = true,
  editing = false,
  saving = false,
  editError = null,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  entry: JournalEntry;
  showReflection?: boolean;
  editing?: boolean;
  saving?: boolean;
  editError?: string | null;
  onEdit?: (entry: JournalEntry) => void;
  onCancelEdit?: () => void;
  onSaveEdit?: (id: string, patch: { title: string; body: string }) => void;
  onDelete?: (entry: JournalEntry) => void;
}) {
  if (editing) {
    return (
      <article className="pt-6 first:pt-0">
        <EntryEditor
          entry={entry}
          saving={saving}
          error={editError}
          onCancel={() => onCancelEdit?.()}
          onSave={(patch) => onSaveEdit?.(entry.id, patch)}
        />
      </article>
    );
  }

  return (
    <article className="group pt-6 first:pt-0">
      {entry.title && (
        <h3 className="font-instrument  text-ink text-[1.35rem] leading-tight">{entry.title}</h3>
      )}
      <p className="font-caveat  text-muted text-[0.72rem] mt-0.5">{datePill(entry.createdAt)}</p>
      <p className="font-instrument  text-ink/90 text-[1.05rem] leading-[1.85] whitespace-pre-wrap mt-3">
        {entry.body}
      </p>
      {showReflection && entry.reflection && (
        <div className="mt-4 rounded-2xl border border-[#68775B]/25 bg-[#68775B]/[0.07] px-4 py-3">
          <p className="font-caveat  text-[#68775B] text-[0.78rem]">a reflection</p>
          <p className="font-instrument  text-ink/85 text-[1rem] leading-relaxed mt-1">{entry.reflection}</p>
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="mt-3 flex items-center gap-4 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="font-caveat  text-muted text-[0.78rem] hover:text-rust hover:underline cursor-pointer"
            >
              [edit]
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(entry)}
              className="font-caveat  text-muted text-[0.78rem] hover:text-danger hover:underline cursor-pointer"
            >
              [delete]
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function JournalEntryPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();

  const plan = useAppSelector((s) => s.auth.user?.plan) ?? "FREE";
  const isPlus = plan !== "FREE";

  const [thread, setThread] = useState<JournalThreadWithEntries | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [earlier, setEarlier] = useState<JournalEntry[]>([]); // newest-first

  const [draftId, setDraftId] = useState<string | null>(null);
  const [savedEntry, setSavedEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reflection, setReflection] = useState<string | null>(null);
  const [reflectionsHidden, setReflectionsHidden] = useState(false);
  const [reflecting, setReflecting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  // Editing / deleting a saved entry.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JournalEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [aiOn, setAiOn] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(AI_PREF_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const aiOnRef = useRef(aiOn);
  useEffect(() => {
    aiOnRef.current = aiOn;
    try {
      window.localStorage.setItem(AI_PREF_KEY, aiOn ? "on" : "off");
    } catch {
      /* storage blocked; the choice still holds for this session */
    }
  }, [aiOn]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The newest text a debounced save is waiting to write, and the latest
  // `persist`. Both exist so the unmount cleanup can FLUSH the pending save
  // instead of throwing it away - it needs the current values, not the ones
  // captured on first render.
  const pendingFlush = useRef<{ title: string; body: string } | null>(null);
  const persistRef = useRef<(t: string, b: string) => void | Promise<void>>(() => { });
  const draftIdRef = useRef<string | null>(null);
  const nonceRef = useRef(0);
  // True while a save is in flight. Without it, a slow first createEntry let the
  // next debounce tick fire a second createEntry (draftIdRef is still null), and
  // one draft became two entries. `pendingSave` holds the text that arrived
  // while we were busy, so the last keystroke is never dropped.
  const savingRef = useRef(false);
  const pendingSave = useRef<{ title: string; body: string } | null>(null);
  // Which entry the in-flight reflection is for, so a late one can't land on a
  // composer that has already moved to a different entry.
  const reflectForRef = useRef<string | null>(null);

  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;

    // No per-field reset here on purpose. Moving between threads navigates
    // within the same route pattern, so React Router used to keep this
    // component and change only the param - and the composer's state came with
    // it. draftId still pointed at an entry in the PREVIOUS thread, and since
    // `persist` PATCHes that id whenever it is set, typing in thread B silently
    // rewrote thread A's entry; a save timer pending from A fired after the
    // switch too.
    //
    // App.tsx now renders this page with key={threadId}, so a different thread
    // is a genuine remount: every field starts fresh and the unmount cleanup
    // below cancels the pending save. Resetting by hand instead would mean
    // remembering to add each new field to that list forever.
    journalService
      .getThread(threadId)
      .then(({ thread: t }) => {
        if (cancelled) return;
        setThread(t);
        setEarlier(t.entries.slice().reverse());
      })
      .catch((e) => {
        console.error("journal:getThread failed", e);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  useEffect(() => {
    return () => {
      if (!saveTimer.current) return;
      // FLUSH, don't just cancel. Clearing the timer threw away up to
      // SAVE_DEBOUNCE_MS (1.2s) of writing: type the last sentence of an entry,
      // click "back to home", and it was gone - on a page whose own copy
      // promises "it's still here". The request outlives the component even
      // though this teardown does not wait for it.
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const queued = pendingFlush.current;
      pendingFlush.current = null;
      if (queued) {
        void Promise.resolve(persistRef.current(queued.title, queued.body)).catch(() => {
          /* nothing left to tell - the page is gone */
        });
      }
    };
  }, []);

  const requestReflection = async (id: string, nonce = 0) => {
    if (!aiOnRef.current) return;
    reflectForRef.current = id;
    setReflecting(true);
    try {
      const { entry } = await journalService.reflect(id, nonce);
      // The surface can move on while this is in flight - the writer starts a
      // new entry, or deletes this one. Dropping a late reflection onto the
      // composer regardless is what put a reflection card above an empty page
      // that still read "nothing saved yet". It belongs to the entry it was
      // made for, so if that entry has moved into "earlier", update it there.
      if (draftIdRef.current === id) {
        setReflection(entry.reflection);
        setSavedEntry(entry);
        setReflectionsHidden(false);
      } else {
        setEarlier((prev) => prev.map((e) => (e.id === id ? entry : e)));
      }
    } catch (e) {
      console.error("journal:reflect failed", e);
    } finally {
      if (reflectForRef.current === id) {
        reflectForRef.current = null;
        setReflecting(false);
      }
    }
  };

  const persist = async (nextTitle: string, nextBody: string) => {
    if (!threadId) return;

    // One save at a time. Anything typed while a save is in flight is queued and
    // written once it lands, so a slow network can't turn one draft into two
    // entries and can't lose the last thing the writer typed.
    if (savingRef.current) {
      pendingSave.current = { title: nextTitle, body: nextBody };
      return;
    }
    savingRef.current = true;

    try {
      if (!draftIdRef.current) {
        if (!nextBody.trim()) return;
        const { entry } = await journalService.createEntry(threadId, {
          title: nextTitle.trim(),
          body: nextBody,
        });
        setDraftId(entry.id);
        draftIdRef.current = entry.id;
        setSavedEntry(entry);
        setSavedAt(entry.updatedAt);
        notifyThreadsChanged();
        requestReflection(entry.id);
      } else {
        const { entry } = await journalService.updateEntry(draftIdRef.current, {
          title: nextTitle.trim(),
          body: nextBody,
        });
        setSavedEntry(entry);
        setSavedAt(entry.updatedAt);
        // The server drops the reflection when the body changes - it described
        // words that are gone. Follow it, but do NOT ask for a new one here:
        // autosave fires on every 1.2s pause in typing, so refetching would
        // mean a model call per pause and a reflection flickering mid-sentence.
        // The writer asks when they're ready, with [ask for another].
        if (!entry.reflection) setReflection(null);
        notifyThreadsChanged();
      }
      setBanner(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setBanner(e.message); // 403 here is the free-tier entry cap
      } else {
        console.error("journal:autosave failed", e);
        setBanner("couldn't save that just now. it's still here try again in a moment.");
      }
    } finally {
      savingRef.current = false;
      const queued = pendingSave.current;
      pendingSave.current = null;
      // only chase the queued text if it differs from what we just wrote
      if (queued && (queued.title !== nextTitle || queued.body !== nextBody)) {
        persist(queued.title, queued.body);
      }
    }
  };

  // Kept current in an effect rather than during render - mutating a ref while
  // rendering is what react-hooks flags, and this only has to be right by the
  // time the unmount cleanup runs.
  useEffect(() => {
    persistRef.current = persist;
  });

  const scheduleSave = (nextTitle: string, nextBody: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingFlush.current = { title: nextTitle, body: nextBody };
    saveTimer.current = setTimeout(() => {
      pendingFlush.current = null;
      persist(nextTitle, nextBody);
    }, SAVE_DEBOUNCE_MS);
  };

  const onBody = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setBody(v);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 144)}px`;
    scheduleSave(title, v);
  };
  const onTitle = (v: string) => {
    setTitle(v);
    scheduleSave(v, body);
  };

  const askForAnother = () => {
    if (!draftId) return;
    nonceRef.current += 1;
    requestReflection(draftId, nonceRef.current);
  };

  const onReflect = () => {
    if (!aiOn) {
      setNote("reflections are off. turn them on from the ••• menu.");
      return;
    }
    if (draftId) return askForAnother();
    setNote("write a line first, and a reflection will come.");
  };

  // ── edit / delete a saved entry ───────────────────────────────────────────

  const startEdit = (entry: JournalEntry) => {
    setEditError(null);
    setNote(null);
    setEditingId(entry.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = async (id: string, patch: { title: string; body: string }) => {
    setSavingEdit(true);
    setEditError(null);
    try {
      const { entry } = await journalService.updateEntry(id, patch);
      setEarlier((prev) => prev.map((e) => (e.id === id ? entry : e)));
      if (savedEntry?.id === id) setSavedEntry(entry);
      if (draftIdRef.current === id && !entry.reflection) setReflection(null);
      setEditingId(null);
      setNote("saved.");
      notifyThreadsChanged();
    } catch (e) {
      // Already gone on the server: drop it here rather than nag about saving.
      if (e instanceof ApiError && e.status === 404) {
        dropEntry(id);
        setEditingId(null);
        setNote("that entry is already gone.");
      } else if (e instanceof ApiError && e.status === 400) {
        setEditError(e.message);
      } else {
        console.error("journal:updateEntry failed", e);
        setEditError("couldn't save that just now. try again in a moment.");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  // Removes an entry from every place this page holds it. If it's the one the
  // composer is writing into, the surface is cleared and the pending autosave
  // cancelled - otherwise a queued save would write the text straight back.
  const dropEntry = (id: string) => {
    notifyThreadsChanged();
    setEarlier((prev) => prev.filter((e) => e.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
    if (draftIdRef.current === id) {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      setDraftId(null);
      draftIdRef.current = null;
      setSavedEntry(null);
      setTitle("");
      setBody("");
      setReflection(null);
      setReflectionsHidden(false);
      setReflecting(false);
      reflectForRef.current = null;
      setSavedAt(null);
      setBanner(null);
    } else if (savedEntry?.id === id) {
      setSavedEntry(null);
    }
  };

  const askDelete = (entry: JournalEntry) => {
    setDeleteError(null);
    setPendingDelete(entry);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    setDeleteError(null);
    try {
      await journalService.removeEntry(id);
      dropEntry(id);
      setPendingDelete(null);
      setNote("gone.");
    } catch (e) {
      // A 404 means it's already gone, so treat that as success.
      if (e instanceof ApiError && e.status === 404) {
        dropEntry(id);
        setPendingDelete(null);
      } else {
        console.error("journal:removeEntry failed", e);
        setDeleteError("that didn't work. try again?");
      }
    } finally {
      setDeleting(false);
    }
  };

  const newEntry = () => {
    if (savedEntry) setEarlier((prev) => [savedEntry, ...prev]);
    setDraftId(null);
    draftIdRef.current = null;
    setSavedEntry(null);
    setTitle("");
    setBody("");
    setReflection(null);
    setReflectionsHidden(false);
    // a reflection still on its way belongs to the entry just filed away, not
    // to the blank page in front of the writer
    setReflecting(false);
    reflectForRef.current = null;
    setSavedAt(null);
    setNote(null);
    // the thread's preview in the sidebar is now out of date
    notifyThreadsChanged();
  };

  const onAttach = () => {
    // Attachments aren't built yet; Plus/Pro get a different holding line.
    setNote(isPlus ? "image support is coming to the journal." : "images are on Plus. see Plus?");
  };

  const toggleAi = () => {
    setMenuOpen(false);
    const next = !aiOn;
    aiOnRef.current = next; // so requestReflection below isn't blocked by stale state
    setAiOn(next);
    if (next) {
      setNote("reflections are on.");
      setReflectionsHidden(false);
      if (draftIdRef.current && !reflection) requestReflection(draftIdRef.current);
    } else {
      setNote("reflections are off. this page is only yours now.");
      setReflecting(false);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-[100dvh] w-full app-gradient md:flex">
        <JournalSidebar />
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="font-instrument  text-ink text-[1.25rem] md:text-[1.6rem]">that thread isn't here.</p>
            <button
              type="button"
              onClick={() => navigate("/journal")}
              className="mt-4 rounded-full bg-rust text-cream-soft font-serif  text-[0.85rem] px-5 py-2 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
            >
              back to journal →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const draftDate = savedAt ?? new Date().toISOString();

  return (
    <div className="min-h-[100dvh] w-full app-gradient md:flex">
      <JournalSidebar />

      <div className="flex-1 min-w-0 flex items-start justify-center px-4 md:px-10 lg:px-14 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-8 pb-[6rem] md:pb-[7rem]">
        <main className="w-full max-w-[440px] md:max-w-[760px] flex flex-col">
          <div className="relative flex items-center gap-2 shrink-0 px-1 pt-1 border-b border-ink/10 pb-3 md:pb-4">
            <button
              type="button"
              aria-label="Back"
              onClick={() => navigate("/journal")}
              className="h-9 w-9 -ml-1 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer md:hidden"
            >
              <BackIcon />
            </button>

            <div className="flex-1 min-w-0 text-center md:text-left">
              <p className="font-caveat  text-muted text-[0.95rem] truncate">
                thread: <span className="text-ink font-instrument text-[1.05rem] md:text-[1.5rem]">{thread?.name ?? "…"}</span>
              </p>
            </div>

            <button
              type="button"
              aria-label="More"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="h-9 w-9 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
            >
              <MoreIcon />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-1 top-12 z-40 w-56 rounded-2xl bg-cream-light border border-hairline/70 shadow-[0_6px_20px_rgba(0,0,0,0.10)] py-1.5 overflow-hidden">
                  <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={aiOn}
                    onClick={toggleAi}
                    className="w-full text-left px-4 py-2 font-serif text-ink text-[0.9rem] hover:bg-cream-dark/50 cursor-pointer"
                  >
                    {aiOn ? "turn off reflections" : "turn on reflections"}
                  </button>
                  {savedEntry && draftId && (
                    <>
                      <div className="my-1 h-px bg-hairline/60" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          askDelete(savedEntry);
                        }}
                        className="w-full text-left px-4 py-2 font-serif text-danger text-[0.9rem] hover:bg-danger/10 cursor-pointer"
                      >
                        delete this entry
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* The one promise the journal keeps out loud. Only on threads flagged
              as being about a real person, and only until the first line is
              written - after that the page belongs to them. */}
          {thread?.aboutRealPerson && earlier.length === 0 && !body.trim() && (
            <p className="mt-4 px-1 font-caveat text-muted text-[0.95rem] md:text-[1.05rem] leading-relaxed">
              this thread is about someone real. write about them, in your own words - what they
              said, how they were, what you'd want to keep. Privateaile will reflect on what you write;
              it won't speak as them.
            </p>
          )}

          {banner && (
            <div className="mt-3 rounded-xl bg-rust/[0.08] border border-rust/25 px-3.5 py-2.5">
              <p className="font-instrument  text-ink text-[0.95rem]">{banner}</p>
              {plan === "FREE" && (
                <button
                  type="button"
                  onClick={() => navigate("/home")}
                  className="font-caveat  text-rust text-[0.78rem] mt-1 cursor-pointer hover:underline"
                >
                  see Plus →
                </button>
              )}
            </div>
          )}

          <div className="px-1 mt-5 md:mt-8">
            <input
              type="text"
              value={title}
              maxLength={TITLE_MAX + 10}
              onChange={(e) => onTitle(e.target.value)}
              placeholder="a title, if you want one"
              className="w-full bg-transparent outline-none font-instrument  text-ink text-[1.75rem] md:text-[2.3rem] leading-tight placeholder:text-ink-soft/35 placeholder:text-[1.2rem] md:placeholder:text-[1.6rem]"
            />
            <p className="font-caveat  text-muted text-[0.72rem] md:text-[0.82rem] mt-1">{datePill(draftDate)}</p>

            <textarea
              value={body}
              onChange={onBody}
              rows={6}
              maxLength={BODY_MAX + 500}
              placeholder="say what you came to say. a line is enough."
              className="mt-4 md:mt-6 w-full resize-none bg-transparent outline-none font-instrument  text-ink text-[1.15rem] md:text-[1.3rem] leading-[1.9] md:leading-[2] placeholder:text-ink-soft/40 min-h-[9rem] md:min-h-[12rem] no-scrollbar"
            />

            {body.trim().length > BODY_MAX && (
              <p className="font-caveat  text-rust text-[0.72rem] text-right">
                {body.trim().length} / {BODY_MAX} - that ran long.
              </p>
            )}

            {aiOn && reflecting && !reflection && (
              <div className="mt-5 rounded-2xl border border-[#68775B]/25 bg-[#68775B]/[0.07] px-4 py-3">
                <span className="flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#68775B]/50 animate-bounce [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#68775B]/50 animate-bounce [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#68775B]/50 animate-bounce" />
                  <span className="font-caveat  text-[#68775B] text-[0.78rem] ml-2">reading, slowly…</span>
                </span>
              </div>
            )}

            {aiOn && reflection && !reflectionsHidden && (
              <div className="mt-5 md:mt-7 rounded-2xl border border-[#68775B]/30 bg-[#68775B]/[0.08] px-4 py-3.5 md:px-6 md:py-5">
                <p className="font-caveat  text-[#68775B] text-[0.8rem] md:text-[0.9rem]">a reflection</p>
                <p className="font-instrument  text-ink/85 text-[1.1rem] md:text-[1.28rem] leading-relaxed mt-1.5">{reflection}</p>
                <div className="flex items-center gap-4 mt-3">
                  <button
                    type="button"
                    onClick={askForAnother}
                    disabled={reflecting}
                    className="font-caveat  text-[#68775B] text-[0.78rem] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    [ask for another]
                  </button>
                  <button
                    type="button"
                    onClick={() => setReflectionsHidden(true)}
                    className="font-caveat  text-muted text-[0.78rem] hover:underline cursor-pointer"
                  >
                    [hide reflections]
                  </button>
                </div>
              </div>
            )}

            {aiOn && reflection && reflectionsHidden && (
              <button
                type="button"
                onClick={() => setReflectionsHidden(false)}
                className="mt-4 font-caveat  text-muted text-[0.78rem] hover:text-[#68775B] cursor-pointer"
              >
                [show reflections]
              </button>
            )}

            {note && <p className="mt-4 font-caveat  text-muted text-[0.78rem]">{note}</p>}
          </div>

          {earlier.filter((e) => e.id !== draftId).length > 0 && (
            <div className="px-1 mt-10 md:mt-14">
              <p className="font-caveat  text-rust text-[0.78rem] md:text-[0.9rem] tracking-wide">earlier</p>
              <div className="mt-2 divide-y divide-ink/[0.07]">
                {earlier
                  .filter((e) => e.id !== draftId)
                  .map((e) => (
                    <EarlierEntry
                      key={e.id}
                      entry={e}
                      showReflection={aiOn}
                      editing={editingId === e.id}
                      saving={savingEdit}
                      editError={editingId === e.id ? editError : null}
                      onEdit={startEdit}
                      onCancelEdit={cancelEdit}
                      onSaveEdit={saveEdit}
                      onDelete={askDelete}
                    />
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Fixed footer: full width on mobile, offset past the rail on md+. */}
      <div className="fixed bottom-0 inset-x-0 md:left-[248px] lg:left-[276px] z-20 flex justify-center pointer-events-none">
        <div className="w-full max-w-[440px] md:max-w-[760px] px-5 md:px-10 lg:px-14 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:pt-4 pointer-events-auto bg-gradient-to-t from-cream via-cream to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                aria-label="Reflect again"
                onClick={onReflect}
                disabled={reflecting}
                className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-[#68775B] text-cream-light flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer disabled:opacity-60"
              >
                <RefreshIcon />
              </button>
              <button
                type="button"
                aria-label="New entry"
                onClick={newEntry}
                className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-[#68775B]/60 text-[#68775B] flex items-center justify-center hover:bg-[#68775B]/10 active:scale-95 transition cursor-pointer"
              >
                <PlusIcon />
              </button>
              <button
                type="button"
                aria-label="Add an image"
                onClick={onAttach}
                className="h-9 w-9 md:h-10 md:w-10 rounded-full border border-ink/25 text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
              >
                <AttachIcon />
              </button>
            </div>

            <span className="font-caveat  text-muted text-[0.8rem] md:text-[0.9rem]">
              {savedAt ? "saved just now" : body.trim() ? "saving…" : "nothing saved yet"}
            </span>
          </div>
        </div>
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
          onClick={() => !deleting && setPendingDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[400px] rounded-3xl border border-ink/10 bg-cream-light p-6 shadow-[0_30px_80px_-40px_rgba(22,34,74,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-instrument text-ink text-[1.3rem] leading-tight">
              Delete <span className="text-danger">{entryLabel(pendingDelete)}</span>?
            </h2>
            <p className="font-serif  text-muted text-[0.9rem] mt-2 leading-relaxed">
              this removes the entry and its reflection. it can't be undone.
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
