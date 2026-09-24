import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CharacterFace from "../components/CharacterFace";
import {
  groupService,
  type Group,
  type GroupMember,
  type GroupMessage,
} from "../services/groupService";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX,
  ATTACHMENT_MAX_BYTES,
  type Attachment,
  type ChatUsage,
  type Moderation,
} from "../services/chatService";
import UpgradePrompt, { refusalFrom } from "../components/UpgradePrompt";
import VoiceRecorderButton from "../components/voice/VoiceRecorderButton";
import VoicePlayButton from "../components/voice/VoicePlayButton";
import PremiumVoiceToggle from "../components/voice/PremiumVoiceToggle";
import { useVoice } from "../hook/useVoice";
import { usePremiumVoice } from "../lib/voicePrefs";
import { stopAllPlayback, forgetSpokenReply, useVoicePlayer } from "../hooks/useVoicePlayer";
import { voiceCopy } from "../copy";
import type { Refusal } from "../components/UpgradePrompt";
import { useAppDispatch } from "../hook/hooks";
import { loadBilling, creditsChanged } from "../redux/billingSlice";
import { ApiError } from "../services/authService";
import { reportCopy } from "../copy";
import GroupMemberEditor from "../components/GroupMemberEditor";

let idCounter = 0;
const nextTempId = () => `tmp-${idCounter++}-${Date.now()}`;

const IMAGINE_HINT = "imagine mode. your next message becomes a picture.";

// Client-side guess only, used to pick the "sketching" shimmer while we wait.
// The real decision is lib/image.js on the server (content-based - it reads the
// room's recent lines), so the two can disagree.
const LOOKS_LIKE_IMAGE =
  /\b(show me|draw|sketch|paint|render|visuali[sz]e|generate (?:an? )?(?:image|picture|photo|thumbnail|poster|logo)|make (?:me )?(?:an? )?(?:image|picture|photo|drawing|thumbnail|poster|logo)|(?:a|an|the)? ?(?:picture|image|photo|drawing|thumbnail|poster|logo) (?:of|for)|give me (?:an? |the )?(?:image|picture|thumbnail|poster|logo)|(?:suggest|recommend|pick|what should i wear)[^.?!]{0,40}\b(?:outfit|look|dress)|imagine\s+(?:it|the|a|an|us|them|this|that))\b/i;
const looksLikeImageRequest = (t: string) => LOOKS_LIKE_IMAGE.test(t);

/** "2.3 MB" / "480 KB" for attachment cards. */
function fmtBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
const fileExt = (name: string) => (name.split(".").pop() || "").toUpperCase().slice(0, 5);

/** What the lightbox shows: a generated picture or a shared photo. */
interface LightboxItem {
  url: string;
  caption: string | null;
}

type MenuTarget = { message: GroupMessage };

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  );
}
function WarnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16.5v.01" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.85rem] w-[0.85rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ImagineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.4" />
      <path d="M4 16l4.5-4 3.5 3 3-2.5 5 4.5" />
    </svg>
  );
}
function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5l-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l9-9a3.5 3.5 0 0 1 5 5l-9 9a1.5 1.5 0 0 1-2.1-2.1l8.3-8.3" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}
function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1rem] w-[1rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * The photos + files under a "you" bubble. Photos open in the lightbox; files
 * open in a new tab (the server serves them from /uploads/attachments).
 */
function AttachmentRow({
  attachments,
  onOpen,
}: {
  attachments: Attachment[];
  onOpen: (a: Attachment) => void;
}) {
  const photos = attachments.filter((a) => a.kind === "image");
  const files = attachments.filter((a) => a.kind !== "image");
  return (
    <div className="flex flex-col items-end gap-1.5 max-w-[min(80%,540px)]">
      {photos.length > 0 && (
        <div className={`grid gap-1.5 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {photos.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpen(a)}
              aria-label={`Open photo ${a.name}`}
              className={`block overflow-hidden rounded-[18px] rounded-br-md border border-ink/10 bg-cream-dark cursor-zoom-in active:scale-[0.99] transition ${photos.length === 1 ? "w-[min(70vw,300px)]" : "w-[min(34vw,150px)]"}`}
            >
              <img
                src={a.url}
                alt={a.name}
                loading="lazy"
                className={`block w-full object-cover ${photos.length === 1 ? "max-h-[320px]" : "aspect-square"}`}
              />
            </button>
          ))}
        </div>
      )}
      {files.map((a) => (
        <a
          key={a.id}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-[16px] rounded-br-md bg-rust text-cream-soft px-3 py-2 max-w-[min(70vw,300px)] hover:brightness-105 transition"
        >
          <span className="h-8 w-8 shrink-0 rounded-lg bg-white/15 flex items-center justify-center">
            <FileIcon />
          </span>
          <span className="min-w-0 text-left">
            <span className="block truncate font-serif text-[0.86rem] leading-snug">{a.name}</span>
            <span className="block text-[0.7rem] opacity-70">
              {fileExt(a.name)}{a.size ? ` · ${fmtBytes(a.size)}` : ""}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}


export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const location = useLocation();
  const passed = (location.state as { group?: Group } | null)?.group;

  const [group, setGroup] = useState<Group | null>(passed ?? null);
  const [messages, setMessages] = useState<GroupMessage[]>(passed?.messages ?? []);
  const [loadError, setLoadError] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  // true while a reply that probably carries a picture is on the way
  const [drawing, setDrawing] = useState(false);
  const [pause, setPause] = useState<Moderation | null>(null);

  // ── image features (mirroring the 1:1 chat composer) ──────────────────────
  const [imagine, setImagine] = useState(false);
  // the shared 30/day allowance, now counted across 1:1 and rooms together
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // files / photos queued in the composer, before they're sent
  const [files, setFiles] = useState<File[]>([]);
  const [plusOpen, setPlusOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // object URLs for the queued photos' thumbnails, revoked on change
  const previews = useMemo(
    () => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [files]
  );
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [report, setReport] = useState<{ messageId: string } | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // ─── voice ──────────────────────────────────────────────────────────────────
  // Same rules as 1:1 chat: dictation lands in the composer as text (a room
  // holds words, not recordings), and a character's line can be read out by id.
  const voice = useVoice();
  const [premiumVoice] = usePremiumVoice();
  const sheetPlayer = useVoicePlayer({
    onRefused: (e) => {
      const refused = refusalFrom(e);
      if (refused) setRefusal(refused);
      else showToast(e.message || voiceCopy.ttsFailed);
      voice.refreshUsage();
    },
    onError: showToast,
  });

  useEffect(() => () => stopAllPlayback(), [groupId]);

  const speakFromSheet = (messageId: string) => {
    setMenu(null);
    if (voice.refusal) {
      setRefusal(voice.refusal);
      return;
    }
    void sheetPlayer
      .play(messageId, { premium: premiumVoice && voice.premiumAvailable })
      .then(() => voice.refreshUsage());
  };

  // On lg+ the rail edits members in place, so this holds whichever seat is open.
  const [editingMember, setEditingMember] = useState<GroupMember | null>(null);

  const [stream, setStream] = useState<{ id: string; shown: number } | null>(null);
  const streamWords = useRef<string[]>([]);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Still on screen? A send already in flight resolves after the user has left
  // the room and then arms the reveal timer on a dead component. Same bug as
  // ChatPage - see streamReply and the unmount cleanup below.
  const alive = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    groupService
      .get(groupId)
      .then(({ group: g, messages: m, hasMore: more, cursor: cur, usage: u }) => {
        if (cancelled) return;
        setGroup(g);
        setMessages(m);
        setHasMore(!!more);
        setCursor(cur ?? null);
        setUsage(u ?? null);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setLoadError(true);
        else console.error("group:get failed", e);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Only follow the conversation when the reader is already at the bottom.
    // `stream` changes every 55ms during a reply, so without this guard scrolling
    // up to re-read an earlier line mid-reply yanked you straight back down on
    // the next tick - reading history while a character answered was impossible.
    // ChatPage fixed exactly this and documents the same 160px threshold.
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 160) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing, stream]);

  useEffect(() => {
    // Re-armed on every mount: StrictMode runs the cleanup once before the
    // effect runs again.
    alive.current = true;
    return () => {
      // Clearing the timer is not enough: a send still in flight resolves after
      // this and arms a new interval whose only clearInterval lives inside a
      // setStream updater, which React never runs for an unmounted fiber. It
      // then ticked every 55ms for the life of the tab.
      alive.current = false;
      if (streamTimer.current) clearInterval(streamTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // esc closes whatever is on top
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else if (menu) setMenu(null);
      else if (plusOpen) setPlusOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, menu, plusOpen]);

  const streamReply = useCallback((msg: GroupMessage) => {
    // The caller may be a request that resolved after we left the room.
    if (!alive.current) return;
    if (streamTimer.current) clearInterval(streamTimer.current);
    streamWords.current = msg.text.split(" ");
    setStream({ id: msg.id, shown: 0 });
    streamTimer.current = setInterval(() => {
      // The terminating branch lives inside the updater, which React will not
      // run once this component is unmounted, so the interval has to be able to
      // stop itself from out here too.
      if (!alive.current) {
        if (streamTimer.current) clearInterval(streamTimer.current);
        streamTimer.current = null;
        return;
      }
      setStream((prev) => {
        if (!prev) return prev;
        const next = prev.shown + 1;
        if (next >= streamWords.current.length) {
          if (streamTimer.current) clearInterval(streamTimer.current);
          streamTimer.current = null;
          return null;
        }
        return { ...prev, shown: next };
      });
    }, 55);
  }, []);

  const textFor = (m: GroupMessage) =>
    stream && stream.id === m.id ? streamWords.current.slice(0, stream.shown).join(" ") : m.text;

  const trimmed = input.trim();
  const overLimit = trimmed.length > 4000;
  // the daily allowance is one pool shared with 1:1 chat (lib/entitlement.js)
  const isFreeReached = !!usage && !usage.unlimited && usage.reached;
  const canSend =
    (trimmed.length > 0 || files.length > 0) && !overLimit && !sending && !isFreeReached;

  /** Add picked files to the queue, within the count/size limits. */
  const addFiles = (picked: FileList | File[] | null) => {
    if (!picked) return;
    const incoming = Array.from(picked);
    setFiles((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= ATTACHMENT_MAX) {
          showToast(`up to ${ATTACHMENT_MAX} files at a time.`);
          break;
        }
        if (f.size > ATTACHMENT_MAX_BYTES) {
          showToast(`- ${f.name} is a bit big. under 10mb?`);
          continue;
        }
        if (next.some((p) => p.name === f.name && p.size === f.size)) continue;
        next.push(f);
      }
      return next;
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, j) => j !== i));
  const openAttachment = (a: Attachment) => {
    if (a.kind === "image") setLightbox({ url: a.url, caption: a.name });
    else window.open(a.url, "_blank", "noopener,noreferrer");
  };

  // The stand-in returns an SVG data-URI, so a download anchor is enough here;
  // a same-origin upload URL downloads too. A cross-origin image opens instead.
  const saveImage = (url: string | null | undefined, caption?: string | null) => {
    setMenu(null);
    if (!url) return;
    try {
      const a = document.createElement("a");
      a.href = url;
      const isSvg = url.includes("image/svg");
      a.download = `${(caption || "privateaile-image").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "privatraile-image"}.${isSvg ? "svg" : "png"}`;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast("saved.");
    } catch {
      showToast("couldn't save that.");
    }
  };

  const copyText = async (m: GroupMessage) => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(m.text);
      showToast("copied.");
    } catch {
      showToast("couldn't copy that.");
    }
  };

  const doSend = async (text: string, wantImage: boolean, sendFiles: File[]) => {
    if (!groupId) return;
    setSending(true);
    const tempId = nextTempId();
    // local previews of the queued photos so the bubble shows them right away
    const localAttachments: Attachment[] = sendFiles.map((f, i) => ({
      id: `local-${tempId}-${i}`,
      kind: f.type.startsWith("image/") ? "image" : "file",
      name: f.name,
      type: f.type,
      size: f.size,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
    }));
    const optimistic: GroupMessage = {
      id: tempId,
      groupId,
      sender: "you",
      senderCharacterId: null,
      senderName: null,
      senderColour: null,
      text,
      attachments: localAttachments,
      blocked: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTyping(true);
    setDrawing(wantImage || looksLikeImageRequest(text));
    const restoreDraft = () => {
      setInput(text);
      setFiles(sendFiles);
      setImagine(wantImage);
    };
    try {
      // No speaker argument - the room always decides who answers next.
      // groupService.send still accepts one and the server still honours it;
      // there is just no control in the page that sets it.
      const res = await groupService.send(groupId, text, {
        imagine: wantImage,
        files: sendFiles,
      });
      if (res.moderation && res.moderation.stage === "input") {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        restoreDraft();
        setTyping(false);
        setDrawing(false);
        setPause(res.moderation);
        return;
      }
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const next = [...withoutTemp];
        if (res.userMessage) next.push(res.userMessage);
        if (res.reply) next.push(res.reply);
        return next;
      });
      setTyping(false);
      setDrawing(false);
      if (res.usage) setUsage(res.usage);
      // The server says what a send cost and what is left; the chip follows it.
      if (res.credits) {
        dispatch(creditsChanged(res.credits.balance));
        dispatch(loadBilling());
      }
      if (res.learned && res.learned.length > 0) {
        showToast(res.learned.length === 1 ? "noted." : "noted a few things.");
      } else if (res.memoryFull) {
        showToast("they remember a lot already. forget some old facts to make room?");
      }
      if (res.reply && res.moderation && res.moderation.stage === "output") {
        setPause(res.moderation);
      } else if (res.reply) {
        streamReply(res.reply);
      }
    } catch (e) {
      console.error("group:send failed", e);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setTyping(false);
      setDrawing(false);
      restoreDraft();
      const refused = refusalFrom(e);
      if (refused && refused.code === "PLAN_LIMIT" && refused.metric === "MESSAGES") {
        // c.10 - the daily allowance is shared with 1:1 chat, so a room can
        // reach it too. Keep the draft; the banner replaces the composer.
        const payload = (e as ApiError).payload as { usage?: ChatUsage } | undefined;
        if (payload?.usage) setUsage(payload.usage);
      } else if (refused) {
        // rooms are a paid feature, the cast has a per-plan ceiling, and a
        // premium reply can want a credit - all of it arrives coded.
        setRefusal(refused);
        dispatch(loadBilling());
      } else if (e instanceof ApiError && e.code === "GROUP_INCOMPLETE") {
        showToast(e.message);
      } else if (e instanceof ApiError && e.status === 400 && e.message) {
        // a 400 from the upload middleware (bad type / too big) says why
        showToast(e.message);
      } else showToast("connection slipped. try again?");
    } finally {
      localAttachments.forEach((a) => a.url && a.url.startsWith("blob:") && URL.revokeObjectURL(a.url));
      setSending(false);
    }
  };

  const send = () => {
    if (!canSend) return;
    const text = trimmed;
    const wantImage = imagine;
    const sendFiles = files;
    setInput("");
    setFiles([]);
    setImagine(false);
    setPlusOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    void doSend(text, wantImage, sendFiles);
  };

  /** "Imagine again" / regenerate one character line, in place. */
  /** §12.6 - the report sheet, opened from a character line's menu. */
  const openReport = (m: GroupMessage) => {
    setMenu(null);
    setReportReason(null);
    setReportNote("");
    setReport({ messageId: m.id });
  };

  const submitReport = async () => {
    if (!groupId || !report || !reportReason || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await groupService.reportMessage(
        groupId,
        report.messageId,
        reportReason,
        reportNote.trim() || undefined
      );
      setReport(null);
      showToast("thank you. we'll look at it.");
    } catch {
      showToast("that didn't send. try again?");
    } finally {
      setReportSubmitting(false);
    }
  };

  /** This line and everything after it, with its files and the facts it taught. */
  const deleteFromHere = async (m: GroupMessage) => {
    setMenu(null);
    if (!groupId) return;
    try {
      await groupService.deleteFromHere(groupId, m.id);
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.id === m.id);
        for (const gone of idx >= 0 ? prev.slice(idx) : []) forgetSpokenReply(gone.id);
        return idx >= 0 ? prev.slice(0, idx) : prev;
      });
      showToast("gone.");
    } catch {
      showToast("that didn't work. try again?");
    }
  };

  /** c.1 - the page above the one we're holding. */
  const loadOlder = async () => {
    if (!groupId || !cursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await groupService.get(groupId, { before: cursor });
      setMessages((prev) => {
        const known = new Set(prev.map((x) => x.id));
        return [...page.messages.filter((x) => !known.has(x.id)), ...prev];
      });
      setHasMore(page.hasMore);
      setCursor(page.cursor ?? null);
    } catch {
      showToast("couldn't reach further back. try again?");
    } finally {
      setLoadingOlder(false);
    }
  };

  const regenerate = async (m: GroupMessage) => {
    setMenu(null);
    if (!groupId || regenerating) return;
    setRegenerating(m.id);
    setTyping(true);
    setDrawing(Boolean(m.imageUrl));
    try {
      const res = await groupService.regenerate(groupId, m.id, Math.floor(Math.random() * 100000));
      setMessages((prev) => prev.map((x) => (x.id === m.id ? res.reply : x)));
      forgetSpokenReply(m.id);
      setTyping(false);
      setDrawing(false);
      if (res.moderation && res.moderation.stage === "output") setPause(res.moderation);
      else streamReply(res.reply);
    } catch (e) {
      console.error("group:regenerate failed", e);
      setTyping(false);
      setDrawing(false);
      showToast("couldn't redo that one. try again?");
    } finally {
      setRegenerating(null);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  const onInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const members: GroupMember[] = group?.members ?? [];
  // Bubbles denormalize senderName/senderColour but not the avatar, so the photo
  // has to be looked up by seat; a deleted member falls back to the colour swatch.
  const faceFor = (characterId?: string | null) =>
    (characterId && members.find((m) => m.characterId === characterId)?.avatar) || null;
  const isEmpty = messages.length === 0;
  const statusText = typing ? (drawing ? "sketching" : "writing") : isEmpty ? "scene set" : "in progress";
  const railTint = members[0]?.colour ?? "#25315E";

  // Hands the loaded group over in route state so details paints before its refetch.
  const openDetails = () => {
    if (!groupId) return;
    navigate(`/group/${groupId}/details`, { state: group ? { group } : undefined });
  };

  // Only the cast is swapped in. Past messages keep the name and colour they were
  // sent under, so the transcript doesn't rearrange itself behind you.
  const onMemberSaved = useCallback((updated: Group) => {
    setGroup((g) => (g ? { ...g, members: updated.members } : updated));
  }, []);

  return (
    <div className="h-[100dvh] min-h-screen w-full overflow-hidden app-gradient">
      <div className="h-full w-full flex items-stretch justify-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] md:p-0">
        <div className="w-full max-w-[440px] md:max-w-none h-full flex overflow-hidden">

          <aside
            className="hidden lg:flex flex-col w-[320px] shrink-0 border-r border-ink/10 px-7 py-8"
            style={{
              background: `linear-gradient(168deg, ${railTint}26 0%, ${railTint}0d 42%, rgba(0,0,0,0) 100%), var(--color-cream-light)`,
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="self-start inline-flex items-center gap-1.5 text-ink-soft hover:text-ink font-serif  text-[0.84rem] active:scale-[0.98] transition cursor-pointer"
            >
              <BackIcon /> home
            </button>

            <div className="mt-10 flex flex-col items-center text-center">
              <div className="flex -space-x-3">
                {members.slice(0, 5).map((m) => (
                  <CharacterFace
                    key={m.characterId}
                    name={m.name}
                    colour={m.colour}
                    avatar={m.avatar}
                    className="h-12 w-12 font-display text-[1.05rem] ring-2 ring-cream-light shadow-[inset_0_-4px_10px_rgba(0,0,0,0.16)]"
                  />
                ))}
              </div>

              <div className="mt-5 w-full">
                <button
                  type="button"
                  onClick={openDetails}
                  disabled={!group}
                  title="Group details"
                  className="group/title max-w-full inline-flex items-center gap-1 font-instrument text-ink text-[1.5rem] leading-tight break-words hover:text-rust transition cursor-pointer disabled:cursor-default"
                >
                  <span className="min-w-0 break-words">{group?.name ?? "…"}</span>
                  <span className="shrink-0 text-ink-soft/50 group-hover/title:text-rust transition">
                    <ChevronIcon />
                  </span>
                </button>
              </div>
              <p className={`font-caveat  text-[1rem] mt-1 ${typing ? "text-rust" : "text-[#68775B]"}`}>
                {statusText}
              </p>
            </div>

            <div className="my-8 h-px bg-ink/10" />

            <div className="flex items-baseline justify-between mb-2.5">
              <p className="font-caveat  text-muted/80 text-[0.9rem]">in the room</p>
              <button
                type="button"
                onClick={openDetails}
                disabled={!group}
                className="font-caveat  text-muted/70 hover:text-rust text-[0.85rem] transition cursor-pointer disabled:cursor-default"
              >
                details →
              </button>
            </div>
            <ul className="flex flex-col gap-1">
              {members.map((m) => (
                <li key={m.characterId} className="group/member flex items-center gap-2.5 rounded-lg -mx-1.5 px-1.5 py-1 hover:bg-ink/[0.04] transition">
                  <CharacterFace
                    name={m.name}
                    colour={m.colour}
                    avatar={m.avatar}
                    className="h-7 w-7 font-display text-[0.72rem] shrink-0"
                  />
                  <span className="flex-1 min-w-0 font-serif text-ink text-[0.9rem] truncate">{m.name}</span>
                  <button
                    type="button"
                    aria-label={`Edit ${m.name ?? "this member"} in this group`}
                    title={`Edit ${m.name ?? "this member"} - this group only`}
                    onClick={() => setEditingMember(m)}
                    className="h-7 w-7 shrink-0 rounded-full text-ink-soft/60 flex items-center justify-center opacity-0 group-hover/member:opacity-100 focus-visible:opacity-100 hover:bg-ink/5 hover:text-rust active:scale-95 transition cursor-pointer"
                  >
                    <EditIcon />
                  </button>
                </li>
              ))}
            </ul>

            {group?.scene && (
              <div className="mt-8">
                <p className="font-caveat  text-muted/80 text-[0.9rem] mb-1.5">the scene</p>
                <p className="font-instrument  text-ink-soft text-[1rem] leading-relaxed">{group.scene}</p>
              </div>
            )}

            <p className="mt-auto pt-8 font-caveat  text-muted/70 text-[0.9rem] leading-snug">
              the room picks who speaks next.
            </p>
          </aside>

          <main className="w-full md:max-w-[880px] md:mx-auto lg:flex-1 min-w-0 h-full flex flex-col relative md:px-6 lg:px-10 lg:pt-3">
            {/* The whole avatars-and-title block is one tap target for Group Details. */}
            <div className="lg:hidden flex items-center gap-1 shrink-0 border-b border-ink/10 px-1 pb-3">
              <button
                type="button"
                aria-label="Back"
                onClick={() => navigate("/home")}
                className="h-9 w-9 -ml-1 shrink-0 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 active:scale-95 transition cursor-pointer"
              >
                <BackIcon />
              </button>

              <button
                type="button"
                onClick={openDetails}
                disabled={!group}
                aria-label="Group details"
                title="Group details"
                className="flex-1 min-w-0 flex items-center gap-3 rounded-xl px-2 py-1 -mx-1 text-left hover:bg-ink/[0.04] active:scale-[0.995] transition cursor-pointer disabled:cursor-default"
              >
                <span className="flex -space-x-2 shrink-0">
                  {members.slice(0, 4).map((m) => (
                    <CharacterFace
                      key={m.characterId}
                      name={m.name}
                      colour={m.colour}
                      avatar={m.avatar}
                      className="h-8 w-8 font-display text-[0.8rem] ring-2 ring-cream"
                    />
                  ))}
                </span>

                <span className="flex-1 min-w-0 leading-tight block">
                  <span className="block max-w-full font-display text-ink text-[0.95rem] truncate">
                    {group?.name ?? "…"}
                  </span>
                  <span className={`block font-caveat  text-[0.72rem] leading-none mt-0.5 ${typing ? "text-rust" : "text-[#68775B]"}`}>
                    {statusText}
                  </span>
                </span>

                <span className="shrink-0 text-ink-soft/45">
                  <ChevronIcon />
                </span>
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar py-4">
              {loadError ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <p className="font-display  text-ink text-[1.15rem]">
                    that group isn't <span className="text-rust">here</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/home")}
                    className="mt-4 rounded-full bg-rust text-cream-soft font-serif  text-[0.85rem] px-5 py-2 hover:bg-rust-hover transition cursor-pointer"
                  >
                    go home →
                  </button>
                </div>
              ) : (
                <>
                  {group?.scene && (
                    <p className="text-center font-instrument  text-muted text-[0.85rem] leading-relaxed mb-5 px-6">
                      {group.scene}
                    </p>
                  )}

                  {/* c.1 - the transcript arrives a page at a time */}
                  {messages.length > 0 && hasMore && (
                    <div className="flex justify-center mb-4">
                      <button
                        type="button"
                        onClick={() => void loadOlder()}
                        disabled={loadingOlder}
                        aria-label="Load earlier messages"
                        className="rounded-full border border-ink/10 bg-cream-light px-3.5 py-1 text-[0.72rem] text-muted hover:text-ink transition disabled:opacity-70 disabled:cursor-default cursor-pointer"
                      >
                        {loadingOlder ? "reading back…" : "↑ earlier messages"}
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5">
                    {messages.map((m) =>
                      m.sender === "you" ? (
                        <div key={m.id} className="flex flex-col items-end gap-1.5">
                          {m.attachments && m.attachments.length > 0 && (
                            <AttachmentRow attachments={m.attachments} onOpen={openAttachment} />
                          )}
                          {m.text && (
                            <div className="max-w-[78%] rounded-2xl rounded-br-md bg-rust text-cream-soft font-serif text-[0.92rem] leading-relaxed px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                              {m.text}
                            </div>
                          )}
                        </div>
                      ) : m.blocked && !(stream && stream.id === m.id) ? (
                        <div key={m.id} className="flex items-end gap-2">
                          <CharacterFace
                            name={m.senderName}
                            colour={m.senderColour}
                            avatar={faceFor(m.senderCharacterId)}
                            className="h-6 w-6 font-display text-[0.7rem] shrink-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setPause({
                                stage: "output",
                                reason: "nsfw",
                                headline: `${m.senderName ?? "they"} didn't finish that thought.`,
                                body: "our content policy stopped them.\n- try asking another way?",
                                primary: "close",
                                secondary: "read the policy",
                                tertiary: "close",
                              })
                            }
                            className="text-left max-w-[80%] rounded-2xl rounded-bl-md bg-[#b0842f]/10 text-ink-soft font-serif  text-[0.86rem] px-3.5 py-2 border border-[#b0842f]/30 cursor-pointer"
                          >
                            <span className="text-[#b0842f]">◌</span> - didn't finish that thought.
                          </button>
                        </div>
                      ) : (
                        <div key={m.id} className="flex items-end gap-2">
                          <CharacterFace
                            name={m.senderName}
                            colour={m.senderColour}
                            avatar={faceFor(m.senderCharacterId)}
                            className="h-6 w-6 font-display text-[0.7rem] shrink-0"
                          />
                          <div className="min-w-0 flex flex-col items-start">
                            <p className="font-caveat  text-ink-soft/60 text-[0.68rem] mb-0.5 ml-1">{m.senderName}</p>
                            {m.imageUrl && (
                              <figure className="m-0 mb-1.5">
                                <button
                                  type="button"
                                  onClick={() => setLightbox({ url: m.imageUrl as string, caption: m.imageAlt ?? null })}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setMenu({ message: m });
                                  }}
                                  aria-label={m.imageAlt ? `Open image: ${m.imageAlt}` : "Open image"}
                                  className="group/img relative block w-[min(72vw,320px)] rounded-[18px] rounded-bl-md overflow-hidden border border-ink/10 bg-cream-dark shadow-[0_14px_30px_-18px_rgba(22,34,74,0.7)] active:scale-[0.99] transition cursor-zoom-in"
                                >
                                  <img
                                    src={m.imageUrl}
                                    alt={m.imageAlt ?? `a scene ${m.senderName ?? "they"} imagined`}
                                    loading="lazy"
                                    className={`block w-full aspect-[16/11] object-cover transition-transform duration-500 group-hover/img:scale-[1.03] ${regenerating === m.id ? "opacity-50" : ""}`}
                                  />
                                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                </button>
                                {m.imageAlt && (
                                  <figcaption className="font-serif text-ink-soft/70 text-[0.74rem] mt-1 px-1 italic max-w-[min(72vw,320px)]">
                                    {m.imageAlt}
                                  </figcaption>
                                )}
                              </figure>
                            )}
                            {(m.text || (stream && stream.id === m.id)) && (
                              <span className="flex items-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => setMenu({ message: m })}
                                  className="text-left max-w-[80%] inline-block rounded-2xl rounded-bl-md bg-cream-dark text-ink font-serif text-[0.92rem] leading-relaxed px-3.5 py-2 border border-ink/[0.06] cursor-pointer active:scale-[0.99] transition-transform"
                                >
                                  {textFor(m)}
                                  {stream && stream.id === m.id && <span className="text-rust/70">▍</span>}
                                </button>
                                {m.text && !(stream && stream.id === m.id) && (
                                  <VoicePlayButton
                                    messageId={m.id}
                                    onRefusal={(r) => setRefusal(r)}
                                    onToast={showToast}
                                  />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    )}

                    {typing && drawing && (
                      <div className="flex justify-start ml-8">
                        <div className="chat-shimmer relative w-[min(72vw,320px)] aspect-[16/11] rounded-[18px] rounded-bl-md overflow-hidden border border-ink/10 bg-cream-dark">
                          <div
                            className="absolute inset-0 opacity-70"
                            style={{
                              background: `linear-gradient(135deg, ${railTint}33 0%, transparent 55%, ${railTint}22 100%)`,
                            }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center gap-2 font-serif text-ink-soft/80 text-[0.84rem]">
                            <span className="text-rust">
                              <ImagineIcon />
                            </span>
                            sketching…
                          </span>
                        </div>
                      </div>
                    )}
                    {typing && !drawing && (
                      <div className="flex justify-start ml-8">
                        <div className="rounded-2xl rounded-bl-md bg-cream-dark px-3.5 py-3 border border-ink/[0.06]">
                          <span className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-ink-soft/40 animate-bounce [animation-delay:-0.2s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-ink-soft/40 animate-bounce [animation-delay:-0.1s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-ink-soft/40 animate-bounce" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {!loadError && (
              <div className="shrink-0 pt-2 pb-3">
                {imagine && (
                  <div className="chat-fade mb-2 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rust/35 bg-rust/[0.08] text-rust font-serif text-[0.76rem] px-3 py-1">
                      <ImagineIcon />
                      {IMAGINE_HINT}
                    </span>
                  </div>
                )}

                {/* queued photos / files, before they're sent */}
                {files.length > 0 && (
                  <div className="chat-fade mb-2 flex flex-wrap gap-2 px-1">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${f.size}-${i}`}
                        className="relative flex items-center gap-2 rounded-2xl border border-ink/10 bg-cream-light/80 pl-1.5 pr-7 py-1.5 max-w-[220px]"
                      >
                        {previews[i] ? (
                          <img src={previews[i] as string} alt="" className="h-10 w-10 rounded-xl object-cover" />
                        ) : (
                          <span className="h-10 w-10 rounded-xl bg-ink/5 text-ink-soft flex items-center justify-center">
                            <FileIcon />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-serif text-[0.8rem] text-ink leading-snug">{f.name}</span>
                          <span className="block text-[0.68rem] text-ink-soft/70">{fmtBytes(f.size)}</span>
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${f.name}`}
                          onClick={() => removeFile(i)}
                          className="absolute right-1.5 top-1.5 h-5 w-5 rounded-full bg-ink/10 text-ink-soft hover:bg-ink/20 flex items-center justify-center text-[0.7rem] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />

                {isFreeReached ? (
                  <div className="rounded-3xl border border-[#68775B]/30 bg-[#68775B]/[0.09] px-5 py-4 text-center chat-pop">
                    <p className="text-ink text-[0.92rem] leading-relaxed">
                      {usage?.limit ?? 30} messages - that's a lot of words. see you tomorrow?{" "}
                      <span className="text-ink-soft">or go Plus.</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/plans")}
                      className="mt-3 rounded-full chat-accent text-[0.82rem] px-5 py-1.5 active:scale-[0.98] cursor-pointer"
                    >
                      See Plus →
                    </button>
                  </div>
                ) : (
                  <>
                    {/* the bar lights up the moment you click into it: a soft grey
                    aura behind it, a gradient hairline on the rim, and a faint
                    wash inside. all three ride the same focus-within state.
                    composer-neutral swaps the violet tokens out for greys. */}
                    <div className="relative group composer-neutral">
                      <div
                        aria-hidden="true"
                        className="composer-glow pointer-events-none absolute -inset-2 rounded-[30px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                      />
                      <div
                        aria-hidden="true"
                        className="composer-ring pointer-events-none absolute -inset-px rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
                      />
                      <div
                        className={`composer-shell relative flex items-center gap-1.5 rounded-full bg-cream-light border px-2 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${imagine ? "border-rust/50" : "border-ink/10"}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          addFiles(e.dataTransfer.files);
                        }}
                      >
                        {/* "+" → share a photo / file, or switch on imagine */}
                        {plusOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setPlusOpen(false)} />
                            <div className="absolute left-1 bottom-[calc(100%+8px)] z-40 w-56 rounded-2xl border border-ink/10 bg-cream-light shadow-[0_18px_40px_-20px_rgba(22,34,74,0.5)] p-1.5 chat-pop">
                              <button
                                type="button"
                                onClick={() => {
                                  setPlusOpen(false);
                                  fileInputRef.current?.click();
                                }}
                                className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left font-serif text-[0.86rem] text-ink hover:bg-ink/5 cursor-pointer"
                              >
                                <span className="h-8 w-8 rounded-lg bg-ink/5 text-ink-soft flex items-center justify-center"><PaperclipIcon /></span>
                                <span>
                                  <span className="block">share a photo or file</span>
                                  <span className="block text-[0.7rem] text-ink-soft/70">jpg, png, pdf, txt · up to {ATTACHMENT_MAX}</span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPlusOpen(false);
                                  setImagine(true);
                                  requestAnimationFrame(() => textareaRef.current?.focus());
                                }}
                                className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left font-serif text-[0.86rem] text-ink hover:bg-ink/5 cursor-pointer"
                              >
                                <span className="h-8 w-8 rounded-lg bg-rust/10 text-rust flex items-center justify-center"><ImagineIcon /></span>
                                <span>
                                  <span className="block">imagine an image</span>
                                  <span className="block text-[0.7rem] text-ink-soft/70">your next message becomes a picture</span>
                                </span>
                              </button>
                            </div>
                          </>
                        )}
                        <button
                          type="button"
                          aria-label={imagine ? "Turn off imagine" : "Add a photo, file, or image"}
                          aria-pressed={imagine}
                          aria-haspopup="menu"
                          aria-expanded={plusOpen}
                          title={imagine ? "Turn off imagine" : "Add a photo, file, or image"}
                          onClick={() => {
                            if (imagine) setImagine(false);
                            else setPlusOpen((v) => !v);
                          }}
                          className={`h-8 w-8 rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0 ${imagine
                            ? "bg-rust text-cream-light"
                            : plusOpen
                              ? "border border-ink/10 text-ink bg-ink/5 rotate-45"
                              : "border border-ink/10 text-ink-soft hover:text-ink hover:bg-ink/5"
                            }`}
                        >
                          {imagine ? <ImagineIcon /> : <AttachIcon />}
                        </button>
                        <VoiceRecorderButton
                          size="sm"
                          onTranscript={(text) => {
                            setInput((cur) => (cur ? `${cur.trimEnd()} ${text}` : text));
                            requestAnimationFrame(() => textareaRef.current?.focus());
                          }}
                          onRefusal={(r) => setRefusal(r)}
                          onToast={showToast}
                          disabled={sending}
                        />
                        <PremiumVoiceToggle className="shrink-0 hidden lg:inline-flex" />
                        <textarea
                          ref={textareaRef}
                          rows={1}
                          value={input}
                          onChange={onInput}
                          onKeyDown={onKeyDown}
                          placeholder={imagine ? "imagine something…" : files.length ? "say something about it… (optional)" : "say something…"}
                          className="composer-field flex-1 resize-none bg-transparent outline-none font-serif text-[0.92rem] text-ink placeholder:text-ink-soft/55 py-1 px-2 leading-relaxed max-h-[132px] no-scrollbar"
                        />
                        <button
                          type="button"
                          aria-label="Send"
                          onClick={send}
                          disabled={!canSend}
                          className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 transition active:scale-95 ${canSend
                            ? "bg-rust border-rust text-cream-light hover:bg-rust-hover cursor-pointer"
                            : "bg-transparent border-rust/50 text-rust/70 cursor-default"
                            }`}
                        >
                          <SendIcon />
                        </button>
                      </div>
                    </div>
                    {overLimit && (
                      <p className="font-caveat  text-rust text-[0.72rem] text-right mt-1 pr-2">
                        {trimmed.length} / 4,000 - shorten?
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* message menu - save / imagine again / copy on a character line */}
            {menu && (
              <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
                <div className="absolute inset-0 bg-ink/25 md:bg-ink/40 md:backdrop-blur-sm chat-fade" onClick={() => setMenu(null)} />
                <div className="relative z-10 w-full max-w-[440px] md:max-w-[360px] md:mx-4 rounded-t-3xl md:rounded-3xl bg-cream-light border-t border-x md:border border-ink/10 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-3 shadow-[0_-8px_32px_rgba(0,0,0,0.16)] md:shadow-[0_24px_70px_-24px_rgba(22,34,74,0.45)] chat-dialog-in">
                  <div className="mx-auto mt-1 mb-2 h-1 w-10 rounded-full bg-ink/10 md:hidden" />
                  <p className="font-caveat text-muted/80 text-[0.9rem] px-2.5 pb-1">{menu.message.senderName ?? "they"}</p>
                  {[
                    ...(menu.message.imageUrl
                      ? [{ label: "Save image", fn: () => saveImage(menu.message.imageUrl, menu.message.imageAlt) }]
                      : []),
                    ...(menu.message.text ? [{ label: "Copy", fn: () => copyText(menu.message) }] : []),
                    ...(menu.message.text ? [{ label: voiceCopy.speakShort, fn: () => speakFromSheet(menu.message.id) }] : []),
                    {
                      label: menu.message.imageUrl ? "Imagine again" : "Regenerate",
                      fn: () => regenerate(menu.message),
                    },
                    // §12.6 - a character saying something reportable in a room
                    // had no path at all before this.
                    { label: "Report this", fn: () => openReport(menu.message) },
                    {
                      label: "Delete from here",
                      fn: () => deleteFromHere(menu.message),
                      danger: true,
                    },
                  ].map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={a.fn}
                      className={`w-full text-left rounded-xl px-2.5 py-2.5 font-serif text-[0.92rem] hover:bg-ink/5 active:scale-[0.99] transition cursor-pointer ${(a as { danger?: boolean }).danger ? "text-danger" : "text-ink"
                        }`}
                    >
                      {a.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setMenu(null)}
                    className="mt-1 w-full rounded-full border border-dashed border-ink/20 text-ink-soft/70 font-serif text-[0.82rem] px-5 py-2 hover:bg-ink/[0.03] transition cursor-pointer"
                  >
                    close
                  </button>
                </div>
              </div>
            )}

            {/* lightbox - a generated picture or a shared photo, with save */}
            {lightbox && (
              <div
                className="fixed inset-0 z-[65] flex flex-col items-center justify-center px-5 py-8"
                onClick={() => setLightbox(null)}
              >
                <div className="absolute inset-0 bg-black/75 backdrop-blur-md chat-fade" />
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setLightbox(null)}
                  className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 h-10 w-10 rounded-full bg-cream-light/90 text-ink flex items-center justify-center hover:bg-cream-light active:scale-95 transition cursor-pointer"
                >
                  <CloseIcon />
                </button>
                <figure
                  className="relative z-10 m-0 max-w-[min(92vw,580px)] flex flex-col items-center chat-dialog-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={lightbox.url}
                    alt={lightbox.caption ?? "a picture from the room"}
                    className="w-full max-h-[70vh] object-contain rounded-[22px] border border-white/15 shadow-[0_30px_80px_-22px_rgba(0,0,0,0.7)]"
                  />
                  {lightbox.caption && (
                    <figcaption className="font-serif text-white/90 text-[0.9rem] mt-3.5 text-center px-4 italic">
                      {lightbox.caption}
                    </figcaption>
                  )}
                  <button
                    type="button"
                    onClick={() => saveImage(lightbox.url, lightbox.caption)}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream-light text-ink font-serif text-[0.86rem] px-5 py-2.5 hover:brightness-95 active:scale-[0.98] transition cursor-pointer"
                  >
                    <SaveIcon /> save image
                  </button>
                </figure>
              </div>
            )}

            {toast && (
              <div className="fixed bottom-7 left-1/2 z-[70] rounded-full bg-ink text-cream-light font-serif text-[0.84rem] px-5 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)] chat-toast-in">
                {toast}
              </div>
            )}

            {/* §12.6 - report what a character said in the room */}
            {report && (
              <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:px-4">
                <div
                  className="absolute inset-0 bg-ink/25 md:bg-ink/40 md:backdrop-blur-sm chat-fade"
                  onClick={() => !reportSubmitting && setReport(null)}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={reportCopy.headline}
                  className="relative z-10 w-full max-w-[440px] rounded-t-3xl md:rounded-3xl bg-cream-light border-t border-x md:border border-ink/10 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:pb-5 shadow-[0_-8px_32px_rgba(0,0,0,0.16)] chat-dialog-in"
                >
                  <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/10 md:hidden" />
                  <h2 className="text-ink text-[1.1rem] font-medium tracking-[-0.01em]">
                    {reportCopy.headline}
                  </h2>
                  <p className="text-ink-soft/80 text-[0.82rem] mt-1">{reportCopy.sub}</p>

                  <div className="mt-3 flex flex-col gap-1.5">
                    {reportCopy.reasons.map((r) => {
                      const checked = reportReason === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          onClick={() => setReportReason(r.value)}
                          className={`w-full text-left flex items-center gap-3 rounded-2xl px-4 py-2.5 border text-[0.88rem] transition cursor-pointer ${checked
                            ? "border-rust/50 bg-rust/[0.07] text-ink"
                            : "border-ink/10 text-ink-soft hover:text-ink"
                            }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-3 w-3 rounded-full border ${checked ? "border-rust bg-rust" : "border-ink/25"
                              }`}
                          />
                          {r.label}
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    rows={2}
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder={reportCopy.notePlaceholder}
                    className="mt-3 w-full resize-none rounded-2xl border border-ink/10 bg-cream px-3.5 py-2.5 text-[0.88rem] text-ink placeholder:text-muted/70 focus:outline-none focus:border-rust/40"
                  />

                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={!reportReason || reportSubmitting}
                      onClick={() => void submitReport()}
                      className="rounded-full chat-accent text-[0.88rem] px-5 py-2.5 disabled:opacity-60 disabled:cursor-default active:scale-[0.98] cursor-pointer"
                    >
                      {reportSubmitting ? "sending…" : reportCopy.send}
                    </button>
                    <button
                      type="button"
                      onClick={() => !reportSubmitting && setReport(null)}
                      className="rounded-full border border-ink/10 text-ink-soft text-[0.86rem] px-5 py-2 hover:text-ink transition cursor-pointer"
                    >
                      {reportCopy.cancel}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pause && (
              <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
                <div className="absolute inset-0 bg-ink/25 md:bg-ink/40 md:backdrop-blur-sm" onClick={() => setPause(null)} />
                <div className="relative z-10 w-full max-w-[440px] md:max-w-[460px] md:mx-4 rounded-t-3xl md:rounded-3xl bg-cream-light border-t border-x md:border border-ink/10 px-6 pt-6 pb-8 md:pb-7 text-center shadow-[0_-8px_32px_rgba(0,0,0,0.16)] md:shadow-[0_24px_70px_-24px_rgba(22,34,74,0.45)]">
                  <div className="mx-auto mb-3 h-11 w-11 rounded-full bg-[#b0842f]/15 text-[#b0842f] flex items-center justify-center">
                    <WarnIcon />
                  </div>
                  <h2 className="font-display  text-ink text-[1.2rem] leading-tight">{pause.headline}</h2>
                  <p className="font-serif  text-ink-soft text-[0.9rem] leading-relaxed mt-2 whitespace-pre-line">
                    {pause.body}
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPause(null);
                        requestAnimationFrame(() => textareaRef.current?.focus());
                      }}
                      className="rounded-full bg-rust text-cream-soft font-serif  text-[0.9rem] px-5 py-2.5 hover:bg-rust-hover transition cursor-pointer"
                    >
                      {pause.stage === "input" ? "edit the message" : "close"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (pause.stage === "input" && pause.tertiary.includes("discard")) setInput("");
                        setPause(null);
                      }}
                      className="rounded-full border border-dashed border-ink/20 text-ink-soft/70 font-serif text-[0.82rem] px-5 py-2 hover:bg-ink/[0.03] transition cursor-pointer"
                    >
                      {pause.stage === "input" ? pause.tertiary : "close"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Opened from the rail on lg+; below lg it's reached via Group Details. */}
            {editingMember && groupId && (
              <GroupMemberEditor
                groupId={groupId}
                member={editingMember}
                onSaved={onMemberSaved}
                onClose={() => setEditingMember(null)}
              />
            )}
          </main>
        </div>
      </div>

      {/* the same sheet the 1:1 chat uses, for the same coded refusals */}
      <UpgradePrompt refusal={refusal} onClose={() => setRefusal(null)} />
    </div>
  );
}
