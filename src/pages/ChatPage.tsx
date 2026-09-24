import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { characterService, type Character } from "../services/characterService";
import {
  chatService,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX,
  ATTACHMENT_MAX_BYTES,
  type Attachment,
  type ChatCharacter,
  type ChatMessage,
  type ChatUsage,
  type Memory,
  type Moderation,
} from "../services/chatService";
import { ApiError, saveBlob } from "../services/authService";
import { useAppDispatch } from "../hook/hooks";
import { loadBilling, creditsChanged } from "../redux/billingSlice";
import PremiumToggle from "../components/PremiumToggle";
import ModelPicker from "../components/ModelPicker";
import UpgradePrompt, { refusalFrom } from "../components/UpgradePrompt";
import VoiceRecorderButton from "../components/voice/VoiceRecorderButton";
import VoicePlayButton from "../components/voice/VoicePlayButton";
import PremiumVoiceToggle from "../components/voice/PremiumVoiceToggle";
import { useVoice } from "../hook/useVoice";
import { usePremiumVoice } from "../lib/voicePrefs";
import { stopAllPlayback, forgetSpokenReply, useVoicePlayer } from "../hooks/useVoicePlayer";
import type { Refusal } from "../components/UpgradePrompt";
import { chatErrorCopy, reportCopy, voiceCopy } from "../copy";
import MessageActions, {
  CopyIcon,
  EditIcon,
  RetryIcon,
  ShareIcon,
  SpeakIcon,
  shareText,
} from "../components/MessageActions";
import InlineEditor from "../components/InlineEditor";

// Chat surface (brief §6.9), wired to controllers/chat.js. Replies come from
// the local stand-in in lib/chat.js; swapping in a real model behind the same
// endpoints doesn't touch this file. The chat-* helper classes are at the
// bottom of index.css.

type Status = "here" | "typing" | "quiet" | "trying" | "drawing";

// brief §6.9.1. "drawing" is mockup 10, an image request in flight.
const STATUS_COPY: Record<Status, string> = {
  here: "on the page",
  typing: "writing",
  quiet: "resting",
  trying: "trying again",
  drawing: "sketching",
};
const STATUS_TONE: Record<Status, string> = {
  here: "chat-status-here", // sage; lightened for the dark theme in index.css
  typing: "text-rust",
  quiet: "text-ink-soft/60",
  trying: "text-rust",
  drawing: "text-rust",
};
const STATUS_LIVE: Record<Status, boolean> = {
  here: true,
  typing: true,
  quiet: false,
  trying: true,
  drawing: true,
};

// Client-side guess only, used to pick the shimmer while we wait. The real
// decision is lib/image.js#planImage on the server (content-based: it reads the
// recent thread, so "suggest the perfect outfit for the picnic" or "give me the
// thumbnail for this" can come back as a picture too), so the two can disagree.
const LOOKS_LIKE_IMAGE =
  /\b(show me|draw|sketch|paint|render|visuali[sz]e|generate (?:an? )?(?:image|picture|photo|thumbnail|poster|logo)|make (?:me )?(?:an? )?(?:image|picture|photo|drawing|thumbnail|poster|logo)|(?:a|an|the)? ?(?:picture|image|photo|drawing|thumbnail|poster|logo) (?:of|for)|give me (?:an? |the )?(?:image|picture|thumbnail|poster|logo)|(?:suggest|recommend|pick|what should i wear)[^.?!]{0,40}\b(?:outfit|look|dress)|imagine\s+(?:it|the|a|an|us|them|this|that))\b/i;
const looksLikeImageRequest = (t: string) => LOOKS_LIKE_IMAGE.test(t);

const IDLE_MS = 90_000; // c.4 - status drops to "quiet" after 90s of no input
const EMPTY_COPY = "a blank page. begin anywhere.";
const EDIT_HINT = "editing this will undo every reply after it.";
const IMAGINE_HINT = "imagine mode. your next message becomes a picture.";
const NETWORK_COPY = "connection slipped. try again?";
const MEMORY_HEADER = "What {name} remembers";
const MEMORY_SUB = "only what you've shared. tap any to forget.";
const MEMORY_EMPTY = "nothing yet the page is still blank.";
const FORGET_HEADLINE = "Forget this fact?";
const FORGET_BODY = "they won't remember it again."
// Tapping a starter only fills the composer - nothing is sent.
const STARTERS = [
  "let's pick up where the story left off.",
  "describe the room you're in right now.",
  "i want to think something through with you.",
];

let idCounter = 0;
const nextTempId = () => `tmp-${idCounter++}-${Date.now()}`;
/**
 * True while a message is still only optimistic - the server hasn't answered,
 * so it has no real id. Anything that addresses a message by id (edit, delete
 * from here, report) has to wait for one.
 */
const isPending = (m: ChatMessage) => m.id.startsWith("tmp-");

function learnedWhen(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(then)) / dayMs);
  if (days <= 0) return "learned today";
  if (days === 1) return "learned yesterday";
  if (days < 7) {
    const wd = then.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    return `learned ${wd}`;
  }
  const md = then.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
  return `learned ${md}`;
}

function clockTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

// c.10 countdown, from usage.resetAt.
function untilReset(resetAt: string | null, nowMs: number): string {
  if (!resetAt) return "resets at midnight";
  const ms = new Date(resetAt).getTime() - nowMs;
  if (ms <= 0) return "any moment now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `Reset in ${h}h ${m}m` : `Reset in ${m}m`;
}

// Nudge a hex colour toward white (positive) or black (negative). Anything
// that isn't a plain #rrggbb comes back untouched.
function shade(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(Math.abs(amount), 100) / 100;
  const mix = (h: string) => {
    const v = parseInt(h, 16);
    return Math.round(v + (target - v) * p);
  };
  return `rgb(${mix(m[1])}, ${mix(m[2])}, ${mix(m[3])})`;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.6-3.6" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l1.7 4.6 4.8 1.7-4.8 1.7L12 16.1l-1.7-4.6L5.5 9.8l4.8-1.7z" />
      <path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
    </svg>
  );
}
function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
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
function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v13M6 12l6 6 6-6" />
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
function ImagineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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

/** "2.3 MB" / "480 KB" for attachment cards. */
function fmtBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
const fileExt = (name: string) => (name.split(".").pop() || "").toUpperCase().slice(0, 5);

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
              className={`block overflow-hidden rounded-[18px] rounded-br-md border border-hairline/60 bg-cream-dark cursor-zoom-in active:scale-[0.99] transition ${photos.length === 1 ? "w-[min(70vw,300px)]" : "w-[min(34vw,150px)]"}`}
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
          className="flex items-center gap-2.5 rounded-[16px] rounded-br-md chat-bubble-you px-3 py-2 max-w-[min(70vw,300px)] hover:brightness-105 transition"
        >
          <span className="h-8 w-8 shrink-0 rounded-lg bg-white/15 flex items-center justify-center">
            <FileIcon />
          </span>
          <span className="min-w-0 text-left">
            <span className="block truncate text-[0.86rem] leading-snug">{a.name}</span>
            <span className="block text-[0.7rem] opacity-70">
              {fileExt(a.name)}{a.size ? ` · ${fmtBytes(a.size)}` : ""}
            </span>
          </span>
        </a>
      ))}
    </div>
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

// `color` is set to the raw colour on purpose: chat-halo animates
// currentColor, so it picks up the character's hue from here.
function Avatar({
  initial,
  colour,
  src,
  className = "",
  halo = false,
}: {
  initial: string;
  colour: string;
  /** uploaded profile picture; falls back to the initial when absent */
  src?: string | null;
  className?: string;
  halo?: boolean;
}) {
  // A failed image load falls back to the initial rather than a blank disc.
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const showPhoto = Boolean(src) && !broken;

  return (
    <span
      style={{
        backgroundImage: `linear-gradient(145deg, ${shade(colour, 18)} 0%, ${colour} 52%, ${shade(colour, -24)} 100%)`,
        color: colour,
      }}
      className={`relative isolate inline-flex items-center justify-center overflow-hidden rounded-full shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-4px_10px_rgba(0,0,0,0.18)] ${halo ? "chat-halo" : ""} ${className}`}
    >
      {showPhoto ? (
        <img
          src={src as string}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* fixed white, not a token: the initial sits on the character's own
           colour, which doesn't change between themes. */
        <span className="text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">{initial}</span>
      )}
    </span>
  );
}

/**
 * The time a message was sent.
 *
 * On a pointer device it stays out of the way until you hover, as before. On
 * touch there is no hover, and the stamp used to be hidden outright - so on a
 * phone there was no way at all to see when anything was sent. There it shows
 * quietly on the last message of each run instead, which is where a reader
 * looks for it and keeps a long thread from turning into a column of clocks.
 */
function Stamp({ iso, alwaysOn = false }: { iso?: string; alwaysOn?: boolean }) {
  const t = clockTime(iso);
  if (!t) return null;
  return (
    <span
      className={[
        "shrink-0 self-end pb-1.5 text-[0.68rem] tracking-wide text-ink-soft/45",
        "transition-opacity duration-150 select-none whitespace-nowrap",
        // touch: visible on run ends only
        alwaysOn ? "opacity-70" : "hidden",
        // pointer: always in the layout, revealed on hover
        "[@media(hover:hover)_and_(pointer:fine)]:block",
        "[@media(hover:hover)_and_(pointer:fine)]:opacity-0",
        "[@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100",
      ].join(" ")}
    >
      {t}
    </span>
  );
}

/**
 * A day divider between messages. The thread used to show one hardcoded "today"
 * pill at the very top whatever the dates were, so a conversation spanning
 * weeks read as though all of it happened this afternoon.
 */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    })
    .toLowerCase();
}

/** True when `iso` falls on a different calendar day than `prevIso`. */
function startsNewDay(iso: string, prevIso?: string): boolean {
  if (!prevIso) return true;
  const a = new Date(prevIso);
  const b = new Date(iso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate()
  );
}

/**
 * Everything the six overlays in this screen need to behave like dialogs:
 * Escape closes, Tab stays inside, focus moves in on open and returns to
 * whatever opened it on close.
 *
 * None of them had any of this. A keyboard user could tab straight out of an
 * open sheet into the thread behind it and act on a page they couldn't see,
 * and Escape did nothing anywhere.
 *
 * Returns the ref to put on the dialog panel. Pair it with
 * `role="dialog" aria-modal="true"` and a label.
 */
function useDialog(open: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;

    // Focus the panel itself rather than its first control, so a screen reader
    // announces the dialog before its buttons.
    const raf = requestAnimationFrame(() => panelRef.current?.focus());

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      // give focus back to whatever opened this
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open, onClose]);

  return panelRef;
}

interface MenuTarget {
  message: ChatMessage;
}

export default function ChatPage() {
  const { characterId } = useParams<{ characterId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const passed = (location.state as { character?: Character } | null)?.character;

  const [character, setCharacter] = useState<ChatCharacter | null>(passed ?? null);
  const [loadError, setLoadError] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // c.1 - the thread arrives a page at a time (newest first). `cursor` is the
  // oldest message we hold; `hasMore` says there is more above it.
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [status, setStatus] = useState<Status>("here");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // in-flight guard for regenerate - see regenerate()
  const [regenerating, setRegenerating] = useState(false);

  // word-by-word reveal for the newest reply (c.3)
  const [stream, setStream] = useState<{ id: string; shown: number } | null>(null);
  const streamWords = useRef<string[]>([]);
  // §9.5 - id + the words shown before a stream was stopped, so the bubble
  // stays truncated and "finish it?" can replay the rest.
  const [aborted, setAborted] = useState<{ id: string; text: string; shown: number } | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [pause, setPause] = useState<Moderation | null>(null);
  const [pauseMessageId, setPauseMessageId] = useState<string | null>(null);
  // carries the imagine flag + files so a retried send is the same send
  const [netError, setNetError] = useState<{ text: string; imagine: boolean; files: File[]; extras?: { premium?: boolean; premiumOverflow?: boolean; modelId?: string | null } } | null>(null);
  const [imagine, setImagine] = useState(false);
  // The paid extras for the NEXT send. Both are requests - the server decides.
  const [premium, setPremium] = useState(false);
  const [premiumOverflow, setPremiumOverflow] = useState(false);
  const [modelId, setModelId] = useState<string | null>(null);
  // A refusal worth a sheet (PLAN_LIMIT / PLAN_FEATURE / CREDITS_REQUIRED …).
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  // files / photos queued in the composer (share a file, share a photo)
  const [files, setFiles] = useState<File[]>([]);
  const [plusOpen, setPlusOpen] = useState(false);
  // a file is being dragged over the surface (see onDragEnter below)
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // object URLs for the queued photos' thumbnails, revoked on change
  const previews = useMemo(
    () => files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null)),
    [files]
  );
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);
  const [lightbox, setLightbox] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [forget, setForget] = useState<Memory | null>(null);
  const [report, setReport] = useState<{ messageId: string } | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportNote, setReportNote] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showJump, setShowJump] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Is this component still on screen? A send that is already in flight resolves
  // after the user has navigated away and then arms the reveal timer on a dead
  // component - see streamReply and the unmount cleanup below.
  const alive = useRef(true);

  const isFreeReached = !!usage && !usage.unlimited && usage.reached;

  // initial load: thread + usage
  useEffect(() => {
    if (!characterId) return;
    let cancelled = false;
    setInitialLoading(true);
    chatService
      .listMessages(characterId)
      .then(({ character: c, messages: m, usage: u, hasMore: more, cursor: cur }) => {
        if (cancelled) return;
        if (c) setCharacter(c);
        setMessages(m);
        setHasMore(!!more);
        setCursor(cur ?? null);
        setUsage(u);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setLoadError(true);
        } else {
          // fall back to at least showing the header if we were handed one
          console.error("chat:list failed", e);
          if (!passed && characterId) {
            characterService
              .get(characterId)
              .then(({ character: c }) => !cancelled && setCharacter(c))
              .catch(() => !cancelled && setLoadError(true));
          }
        }
      })
      .finally(() => !cancelled && setInitialLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  // Set just before older messages are prepended: the distance from the bottom
  // to hold onto, so the page doesn't jump when content appears above.
  const anchorRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (anchorRef.current != null) {
      // a "load earlier" prepend - keep the reader where they were reading
      el.scrollTop = el.scrollHeight - anchorRef.current;
      anchorRef.current = null;
      return;
    }
    // Don't drag someone back down while they're reading further up. This fired
    // on every word of a stream, so scrolling up mid-reply was impossible and
    // the "↓ latest" pill it rendered could never be used. Same 160px threshold
    // as that pill, so the two agree on what "away from the bottom" means.
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 160) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status, stream]);

  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const onStreamScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(distanceFromBottom > 160);
  }, []);

  // countdown tick, only while the daily limit banner is up
  useEffect(() => {
    if (!isFreeReached) return;
    const t = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [isFreeReached]);

  useEffect(() => {
    // Re-armed on every mount: in StrictMode the cleanup runs once before the
    // effect runs again, so this must not stay false.
    alive.current = true;
    return () => {
      // Clearing the timers is not enough on its own. A doSend still in flight
      // resolves after this and calls streamReply, which arms a NEW interval on
      // a component that is gone - and the only clearInterval for it lives
      // inside a setStream updater, which React never runs for an unmounted
      // fiber. So it ticked every 55ms for the life of the tab, once per
      // navigation. This flag is what stops that.
      alive.current = false;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (streamTimer.current) clearInterval(streamTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const armIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setStatus("quiet"), IDLE_MS);
  }, []);

  // c.4 - start the clock on arrival. It was only ever armed by an interaction,
  // so opening a chat and sitting with it left the status reading "here"
  // indefinitely; "quiet" could not happen until you'd typed at least once.
  useEffect(() => {
    armIdle();
  }, [armIdle]);

  const wakeFromQuiet = () => {
    setStatus((s) => (s === "quiet" ? "here" : s));
    armIdle();
  };

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // ─── voice ──────────────────────────────────────────────────────────────────
  // The hover row has its own speak control (VoicePlayButton). This player is
  // for the touch action sheet, which has no room for one. Both share the same
  // audio cache and the same "one clip at a time" rule.
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

  // Leaving this chat (or switching character) ends whatever is speaking.
  useEffect(() => () => stopAllPlayback(), [characterId]);

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

  /**
   * c.1 - fetch the page above the one we're holding. The server sends a
   * screenful at a time, so a long thread opens fast and older messages come
   * back on demand.
   */
  const loadOlder = useCallback(async () => {
    if (!characterId || !cursor || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    anchorRef.current = el ? el.scrollHeight - el.scrollTop : null;
    try {
      const page = await chatService.listMessages(characterId, { before: cursor });
      setMessages((prev) => {
        // an edit or a delete can have shifted things under us; ids win
        const known = new Set(prev.map((m) => m.id));
        return [...page.messages.filter((m) => !known.has(m.id)), ...prev];
      });
      setHasMore(page.hasMore);
      setCursor(page.cursor ?? null);
    } catch {
      anchorRef.current = null;
      showToast(chatErrorCopy.loadOlderFailed);
    } finally {
      setLoadingOlder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, cursor, loadingOlder]);

  const firstInitial = character?.name?.[0]?.toUpperCase() ?? "·";
  const avatarColour = character?.colour ?? "#25315E";
  const avatarPhoto = character?.avatar ?? null;

  const trimmed = input.trim();
  const overLimit = trimmed.length > 4000; // brief §14.3
  const canSend = (trimmed.length > 0 || files.length > 0) && !overLimit && !sending && !isFreeReached;

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
    wakeFromQuiet();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, j) => j !== i));

  // Drag and drop across the whole surface. dragenter/dragleave fire for every
  // child element the cursor crosses, so a depth counter is what keeps the
  // overlay from flickering as it travels over bubbles.
  const hasDraggedFiles = (e: DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes("Files");

  const onDragEnter = (e: DragEvent) => {
    if (!hasDraggedFiles(e) || isFreeReached) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragOver = (e: DragEvent) => {
    if (!hasDraggedFiles(e) || isFreeReached) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    if (!hasDraggedFiles(e)) return;
    // Always preventDefault on a file drop, even one we won't take: the browser
    // default is to navigate away to the dropped file, losing the conversation.
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (isFreeReached) return;
    addFiles(e.dataTransfer.files);
  };

  const openAttachment = (a: Attachment) => {
    if (a.kind === "image") {
      setLightbox({
        id: `att-${a.id}`,
        characterId: characterId ?? "",
        sender: "you",
        text: "",
        imageUrl: a.url,
        imageAlt: a.name,
        blocked: false,
        createdAt: "",
      });
    } else {
      window.open(a.url, "_blank", "noopener,noreferrer");
    }
  };

  const streamReply = useCallback(
    (msg: ChatMessage, asStatus: Status = "typing", from = 0) => {
      // The caller may be a request that resolved after we left the page.
      if (!alive.current) return;
      if (streamTimer.current) clearInterval(streamTimer.current);
      // a fresh stream clears any earlier "cut short" state
      setAborted(null);
      streamWords.current = msg.text.split(" ");
      // index.css honours prefers-reduced-motion for every CSS animation here,
      // but this reveal is a JS timer and ran regardless of the setting. Show
      // the reply whole instead of typing it out.
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        setStream(null);
        setStatus("here");
        armIdle();
        return;
      }
      // `from` resumes an interrupted reveal at the word it stopped on
      setStream({ id: msg.id, shown: Math.min(Math.max(from, 0), streamWords.current.length) });
      setStatus(asStatus);
      streamTimer.current = setInterval(() => {
        // Belt and braces with the guard above: the terminating branch lives
        // inside the updater, which React will not run once this component is
        // unmounted, so the interval has to be able to stop itself from out
        // here too.
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
            setStatus("here");
            armIdle();
            return null;
          }
          return { ...prev, shown: next };
        });
      }, 55);
    },
    [armIdle]
  );

  const textFor = (m: ChatMessage) =>
    stream && stream.id === m.id
      ? streamWords.current.slice(0, stream.shown).join(" ")
      : aborted && aborted.id === m.id
        ? aborted.text
        : m.text;

  const stopStream = () => {
    if (!stream) return;
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
    const shown = Math.max(1, stream.shown);
    const shownText = streamWords.current.slice(0, shown).join(" ");
    // `shown` is kept so "finish it?" can pick up where it left off
    setAborted({ id: stream.id, text: shownText, shown });
    setStream(null);
    setStatus("here");
    armIdle();
  };
  /**
   * §9.5 "finish it?" - resume a reveal that was stopped. It used to restart at
   * word zero, so the visible text jumped backwards and re-typed itself; now it
   * carries on from the word it stopped on.
   */
  const finishStream = (m: ChatMessage) => {
    const from = aborted && aborted.id === m.id ? aborted.shown : 0;
    setAborted(null);
    streamReply(m, "typing", from);
  };

  const doSend = async (
    text: string,
    wantImage = false,
    sendFiles: File[] = [],
    // The paid extras this particular send asked for, captured when the user
    // pressed send so a later toggle cannot change what a retry means.
    extras: { premium?: boolean; premiumOverflow?: boolean; modelId?: string | null } = {}
  ) => {
    const wantPremium = extras.premium === true;
    const wantOverflow = extras.premiumOverflow === true;
    const wantModel = extras.modelId ?? null;
    if (!characterId) return;
    setSending(true);
    setNetError(null);
    const tempId = nextTempId();
    // local previews so the photo/file shows in the bubble while it uploads
    const localAttachments: Attachment[] = sendFiles.map((f, i) => ({
      id: `${tempId}-${i}`,
      kind: f.type.startsWith("image/") ? "image" : "file",
      name: f.name,
      type: f.type,
      size: f.size,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : "#",
    }));
    const optimistic: ChatMessage = {
      id: tempId,
      characterId,
      sender: "you",
      text,
      attachments: localAttachments,
      blocked: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setStatus(wantImage || looksLikeImageRequest(text) ? "drawing" : "typing");

    try {
      const res = await chatService.send(characterId, text, wantImage, sendFiles, {
        premium: wantPremium,
        premiumOverflow: wantOverflow,
        modelId: wantModel,
      });

      // c.7 - input paused, so nothing was saved. Drop the optimistic bubble
      // and put the draft back.
      if (res.moderation && res.moderation.stage === "input") {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInput(text);
        setFiles(sendFiles);
        setStatus("here");
        setPause(res.moderation);
        setPauseMessageId(null);
        return;
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const next = [...withoutTemp];
        if (res.userMessage) next.push(res.userMessage);
        if (res.reply) next.push(res.reply);
        return next;
      });
      if (res.usage) setUsage(res.usage);
      // A send can spend credits (a premium overflow, a chosen model, an image
      // past the month's allowance). The server says what is left; the chip and
      // the meters follow it rather than doing sums of their own.
      if (res.credits) dispatch(creditsChanged(res.credits.balance));
      if (res.credits || wantPremium || wantModel) dispatch(loadBilling());
      if (res.learned && res.learned.length > 0) {
        showToast(res.learned.length === 1 ? "noted." : "noted a few things.");
      } else if (res.memoryFull) {
        // §9.5 - there WAS something to remember and the per-character cap left
        // no room. This used to stop learning silently; the copy for it has
        // existed all along and was never reachable.
        showToast(chatErrorCopy.memoryLimit);
      }

      // c.8 - output paused, the reply is withheld rather than streamed.
      if (res.reply && res.moderation && res.moderation.stage === "output") {
        setStatus("here");
        setPause(res.moderation);
        setPauseMessageId(res.reply.id);
      } else if (res.reply) {
        streamReply(res.reply);
      } else {
        setStatus("here");
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setStatus("here");
      const refused = refusalFrom(e);
      if (refused && refused.code === "PLAN_LIMIT" && refused.metric === "MESSAGES") {
        // c.10 - the day's messages. Keep the draft; the banner replaces the
        // composer, so a sheet on top of it would be saying the same thing twice.
        const u = (e as ApiError).payload as { usage?: ChatUsage } | undefined;
        if (u?.usage) setUsage(u.usage);
        setInput(text);
        setFiles(sendFiles);
      } else if (refused) {
        // everything else the plan or the balance refused - one sheet, with the
        // server's own numbers in it.
        setInput(text);
        setFiles(sendFiles);
        setRefusal(refused);
        dispatch(loadBilling());
      } else if (e instanceof ApiError && e.code === "MEMORY_LIMIT") {
        // §9.5 - memory full (rare). Keep the draft; they need to forget
        // something before this will send.
        setInput(text);
        setFiles(sendFiles);
        showToast(chatErrorCopy.memoryLimit);
      } else if (e instanceof ApiError && e.status === 400 && sendFiles.length > 0) {
        // the server refused a file (type / size) - keep everything, say why
        setInput(text);
        setFiles(sendFiles);
        showToast(e.message || "that file couldn't be shared.");
      } else {
        // c.9 - keep the draft and offer a retry.
        setInput(text);
        setNetError({
          text,
          imagine: wantImage,
          files: sendFiles,
          // a retry asks for exactly what the first attempt asked for
          extras: { premium: wantPremium, premiumOverflow: wantOverflow, modelId: wantModel },
        });
      }
    } finally {
      // Every optimistic attachment made an object URL and nothing ever released
      // it, so each photo sent in a 1:1 chat pinned its full decoded bitmap for
      // the life of the tab. By here the bubble has been replaced by the
      // server's copy (or dropped), so the blob is no longer referenced.
      // GroupChatPage already does exactly this.
      localAttachments.forEach(
        (a) => a.url && a.url.startsWith("blob:") && URL.revokeObjectURL(a.url)
      );
      setSending(false);
    }
  };

  const send = () => {
    if (!canSend) return;
    const text = trimmed;
    const wantImage = imagine;
    const wantPremium = premium;
    const wantOverflow = premiumOverflow;
    const wantModel = modelId;
    const sendFiles = files;
    setInput("");
    setImagine(false);
    setPremium(false);
    setPremiumOverflow(false);
    setFiles([]);
    setPlusOpen(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    void doSend(text, wantImage, sendFiles, {
      premium: wantPremium,
      premiumOverflow: wantOverflow,
      modelId: wantModel,
    });
  };

  // §6.9.2 - editing happens in the bubble, not the composer, so an in-progress
  // draft in the composer survives.
  const startEdit = (m: ChatMessage) => {
    setMenu(null);
    setEditing(m.id);
    setNetError(null);
  };
  const cancelEdit = () => {
    setEditing(null);
  };
  const saveEdit = async (text: string) => {
    if (!editing || !text) return;
    const editingId = editing;
    setSending(true);
    try {
      const res = await chatService.editMessage(editingId, text);
      if (res.moderation && res.moderation.stage === "input") {
        // rewrite didn't pass - leave the editor open with their words in it
        setPause(res.moderation);
        setPauseMessageId(null);
        return;
      }
      // Server drops everything after the edited message, so rebuild the tail
      // from the response instead of patching in place.
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === editingId);
        const head = idx >= 0 ? prev.slice(0, idx) : prev;
        const next = [...head];
        if (res.userMessage) next.push(res.userMessage);
        if (res.reply) next.push(res.reply);
        return next;
      });
      setEditing(null);
      if (res.reply && res.moderation && res.moderation.stage === "output") {
        setPause(res.moderation);
        setPauseMessageId(res.reply.id);
      } else if (res.reply) {
        streamReply(res.reply);
      }
    } catch (e) {
      console.error("chat:edit failed", e);
      showToast("that didn't save. try again?");
    } finally {
      setSending(false);
    }
  };

  const regenerate = async (messageId: string) => {
    // Double-tapping "Regenerate response" fired two POSTs; both resolved, both
    // called streamReply, and the second overwrote streamWords mid-reveal so the
    // bubble jumped to a different reply's words - having spent the quota twice.
    // GroupChatPage guards this; this did not.
    if (regenerating) return;
    setRegenerating(true);
    setMenu(null);
    setPause(null);
    setStatus("trying");
    try {
      const res = await chatService.regenerate(messageId, undefined, {
        premium,
        premiumOverflow,
        modelId,
      });
      setMessages((prev) => prev.map((m) => (m.id === res.reply.id ? res.reply : m)));
      // the words changed, so anything already spoken for them is stale
      forgetSpokenReply(res.reply.id);
      if (res.moderation && res.moderation.stage === "output") {
        setStatus("here");
        setPause(res.moderation);
        setPauseMessageId(res.reply.id);
      } else {
        streamReply(res.reply, "trying");
      }
    } catch (e) {
      console.error("chat:regenerate failed", e);
      setStatus("here");
      showToast("couldn't redo that. try again?");
    } finally {
      setRegenerating(false);
    }
  };

  const deleteFromHere = async (m: ChatMessage) => {
    setMenu(null);
    try {
      await chatService.deleteFromHere(m.id);
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.id === m.id);
        for (const gone of idx >= 0 ? prev.slice(idx) : []) forgetSpokenReply(gone.id);
        return idx >= 0 ? prev.slice(0, idx) : prev;
      });
      showToast("gone.");
    } catch (e) {
      console.error("chat:delete failed", e);
      showToast("that didn't work. try again?");
    }
  };

  const copyText = async (m: ChatMessage) => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(m.text);
      showToast("copied.");
    } catch {
      showToast("couldn't copy.");
    }
  };

  const shareMessage = async (m: ChatMessage) => {
    setMenu(null);
    const who = m.sender === "you" ? "you" : character?.name ?? "them";
    const note = await shareText(
      m.text ? `${who}: ${m.text}` : who,
      character?.name ? `a moment with ${character.name}` : "a moment"
    );
    if (note) showToast(note);
  };

  /** A filename from the caption, falling back to something recognisable. */
  const imageFilename = (m: ChatMessage, ext: string) => {
    const slug =
      (m.imageAlt || "privateaile-image")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "privateaile-image";
    return `${slug}.${ext}`;
  };

  /**
   * Save a generated picture or a shared photo.
   *
   * A bare `<a download>` only worked for the stand-in's SVG data-URI: for a
   * real image URL - which is what a generated picture is now, and what every
   * shared photo always was - the browser ignores `download` cross-origin and
   * navigates to the file instead. Fetching to a blob first keeps it a save.
   */
  const saveImage = async (m: ChatMessage) => {
    setMenu(null);
    if (!m.imageUrl) return;
    const url = m.imageUrl;
    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = imageFilename(m, url.includes("image/svg") ? "svg" : "png");
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("saved.");
        return;
      }

      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg").split("+")[0];
      // saveBlob, not a hand-rolled anchor: it defers the revoke by 10s, and
      // says why - "revoking immediately can cancel the download in some
      // browsers". Revoking on the next line produced a cancelled or 0-byte
      // save while still cheerfully toasting "saved."
      saveBlob(blob, imageFilename(m, ext));
      showToast("saved.");
    } catch {
      showToast("couldn't save that.");
    }
  };

  const retrySend = () => {
    const pending = netError;
    if (!pending) return;
    setNetError(null);
    setInput("");
    void doSend(pending.text, pending.imagine, pending.files, pending.extras);
  };
  const skipSend = () => {
    setNetError(null);
  };

  const openMemory = async () => {
    setMenu(null);
    if (!characterId) return;
    setMemoryOpen(true);
    setMemoryLoading(true);
    try {
      const { memories: mem } = await chatService.listMemories(characterId);
      setMemories(mem);
    } catch (e) {
      console.error("chat:memories failed", e);
    } finally {
      setMemoryLoading(false);
    }
  };
  const confirmForget = async () => {
    if (!forget) return;
    const id = forget.id;
    setForget(null);
    try {
      await chatService.forget(id);
      setMemories((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error("chat:forget failed", e);
      showToast("that didn't work. try again?");
    }
  };

  const dismissPause = () => {
    setPause(null);
    setPauseMessageId(null);
  };
  const pausePrimary = () => {
    if (!pause) return;
    if (pause.stage === "output") {
      if (pauseMessageId) void regenerate(pauseMessageId);
      else dismissPause();
      return;
    }
    // Input stage: the text is still in whichever field they were using, so
    // just close. Don't steal focus if an inline editor is open.
    dismissPause();
    if (!editing) requestAnimationFrame(() => textareaRef.current?.focus());
  };
  // Both of these used to branch on the button's WORDS - `tertiary.includes
  // ("discard")`, `secondary.startsWith("iCall")` - so rewording the copy in
  // lib/copy.js silently changed what the buttons did, and the helpline number
  // was hardcoded here in a second place. The server now sends what each button
  // means alongside what it says; the label check stays only as a fallback for
  // a payload from an older server.
  const pauseTertiary = () => {
    if (!pause) return;
    const discards =
      pause.tertiaryAction === "discardDraft" ||
      (!pause.tertiaryAction && pause.stage === "input" && pause.tertiary.includes("discard"));
    if (discards) {
      setInput("");
      setFiles([]);
      if (editing) cancelEdit();
    }
    dismissPause();
  };
  const pauseSecondary = () => {
    if (!pause) return;
    const isHelpline =
      pause.secondaryAction === "helpline" ||
      (!pause.secondaryAction && pause.secondary.startsWith("iCall"));
    if (isHelpline) {
      const tel = pause.helpline?.tel;
      if (!tel) {
        showToast("couldn't open that.");
        return;
      }
      // §12.1 - a phone can dial it; a desktop usually can't, and used to get a
      // blank tab and no number. Copy it there instead and say so.
      const canDial = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      if (canDial) {
        window.location.href = `tel:${tel}`;
        return;
      }
      navigator.clipboard
        ?.writeText(tel)
        .then(() => showToast(`- ${pause.helpline?.name ?? "helpline"}: ${tel} (copied)`))
        .catch(() => showToast(`- ${pause.helpline?.name ?? "helpline"}: ${tel}`));
      return;
    }
    showToast("opening the policy.");
    dismissPause();
  };

  const openReport = (messageId: string) => {
    setMenu(null);
    setReportReason(null);
    setReportNote("");
    setReport({ messageId });
  };
  const closeReport = () => {
    if (reportSubmitting) return;
    setReport(null);
  };

  // §7 - the six overlays, each a real dialog: Escape closes, Tab stays inside,
  // focus returns to whatever opened it. useCallback so the hook's effect isn't
  // torn down and rebuilt on every render.
  const closeMenu = useCallback(() => setMenu(null), []);
  const closeMemorySheet = useCallback(() => setMemoryOpen(false), []);
  const closeForget = useCallback(() => setForget(null), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const closeReportSheet = useCallback(() => {
    setReportSubmitting((busy) => {
      if (!busy) setReport(null);
      return busy;
    });
  }, []);
  const closePause = useCallback(() => {
    setPause(null);
    setPauseMessageId(null);
  }, []);

  const menuDialogRef = useDialog(Boolean(menu), closeMenu);
  const pauseDialogRef = useDialog(Boolean(pause), closePause);
  const reportDialogRef = useDialog(Boolean(report), closeReportSheet);
  const memoryDialogRef = useDialog(memoryOpen, closeMemorySheet);
  const forgetDialogRef = useDialog(Boolean(forget), closeForget);
  const lightboxDialogRef = useDialog(Boolean(lightbox), closeLightbox);
  const submitReport = async () => {
    if (!report || !reportReason || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await chatService.reportMessage(report.messageId, reportReason, reportNote.trim() || undefined);
      setReport(null);
      showToast(reportCopy.sent);
    } catch {
      showToast(reportCopy.failed);
    } finally {
      setReportSubmitting(false);
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
    wakeFromQuiet();
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const useStarter = (text: string) => {
    setInput(text);
    wakeFromQuiet();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
      el.setSelectionRange(text.length, text.length);
    });
  };

  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const showTypingBubble =
    (status === "typing" || status === "drawing") && lastMessage?.sender === "you" && !stream;

  // avatar only on the last message of a run
  const isRunEnd = (i: number) => messages[i + 1]?.sender !== messages[i]?.sender;

  const statusPill = (compact = false) => (
    <span
      // "typing", "sketching", "quiet" carried no announcement at all - despite
      // the STATUS_LIVE map's name, which only ever drove the halo animation.
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 rounded-full border border-hairline/60 bg-cream-light/60 ${compact ? "px-2 py-[3px] text-[0.68rem]" : "px-2.5 py-1 text-[0.76rem]"} ${STATUS_TONE[status]} transition-colors`}
    >
      <span
        className={`relative isolate inline-block h-1.5 w-1.5 rounded-full bg-current ${STATUS_LIVE[status] ? "chat-halo" : ""}`}
      />
      {STATUS_COPY[status]}
    </span>
  );

  const header = useMemo(
    () => (
      <div className="flex items-center gap-3 shrink-0 chat-glass border-b border-hairline/70 px-3 py-2.5 rounded-b-2xl shadow-[0_10px_26px_-24px_rgba(22,34,74,0.7)]">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate("/home")}
          className="h-9 w-9 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 hover:text-ink active:scale-95 transition cursor-pointer"
        >
          <BackIcon />
        </button>

        <Avatar
          initial={firstInitial}
          colour={avatarColour}
          src={avatarPhoto}
          halo={STATUS_LIVE[status]}
          className="h-9 w-9 text-[0.95rem] font-medium"
        />

        <div className="flex-1 min-w-0 leading-tight">
          <p className="font-display text-ink text-[1.15rem] tracking-[-0.01em] truncate">
            {character?.name ?? "…"}
          </p>
          <div className="mt-1">{statusPill(true)}</div>
        </div>

        <button
          type="button"
          aria-label="Search this chat"
          className="h-9 w-9 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 hover:text-ink active:scale-95 transition cursor-pointer"
        >
          <SearchIcon />
        </button>
        <button
          type="button"
          aria-label="What they remember"
          onClick={openMemory}
          className="h-9 w-9 rounded-full text-ink-soft flex items-center justify-center hover:bg-ink/5 hover:text-ink active:scale-95 transition cursor-pointer"
        >
          <MoreIcon />
        </button>
      </div>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [character?.name, avatarColour, avatarPhoto, firstInitial, status]
  );

  return (
    <div
      className="relative h-[100dvh] min-h-screen w-full overflow-hidden app-gradient"
      /* Dropping a file used to work only over the composer bar itself, with no
         highlight to say so anywhere else in the thread the browser navigated
         away to the file instead, losing the conversation. The whole surface
         accepts a drop now, and says so while one is in flight. */
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* ambient wash, tinted by the character's colour */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="chat-ambient h-[460px] w-[460px] -top-40 -right-32 opacity-[0.26]"
          style={{ background: `radial-gradient(circle, ${avatarColour} 0%, transparent 70%)` }}
        />
        <div
          className="chat-ambient h-[380px] w-[380px] -bottom-32 -left-24 opacity-[0.15]"
          style={{ background: `radial-gradient(circle, ${shade(avatarColour, 25)} 0%, transparent 70%)` }}
        />
      </div>

      {/* what a drop will do, while it's still a drop */}
      {dragging && (
        <div
          className="pointer-events-none absolute inset-2 z-40 rounded-3xl border-2 border-dashed border-rust/60 bg-cream-light/80 backdrop-blur-[2px] flex items-center justify-center chat-fade"
          aria-hidden="true"
        >
          <div className="text-center px-6">
            <p className="text-ink text-[1.05rem] font-medium">drop it here</p>
            <p className="text-ink-soft text-[0.85rem] mt-1">
              photos and files - up to {ATTACHMENT_MAX}, 10mb each
            </p>
          </div>
        </div>
      )}

      <div className="relative h-full w-full flex items-stretch justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] md:p-0">
        <div className="w-full max-w-[460px] md:max-w-none h-full flex overflow-hidden">

          <aside
            className="hidden lg:flex flex-col w-[312px] shrink-0 border-r border-hairline/70 px-6 py-8 overflow-y-auto quiet-scrollbar"
            style={{
              background: `linear-gradient(168deg, ${avatarColour}2e 0%, ${avatarColour}0f 46%, rgba(0,0,0,0) 100%), var(--color-cream-light)`,
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="self-start inline-flex items-center gap-1.5 rounded-full chat-tile px-3 py-1.5 text-ink-soft hover:text-ink text-[0.82rem] active:scale-[0.98] cursor-pointer"
            >
              <BackIcon /> back to the desk
            </button>

            <div className="mt-11 flex flex-col items-center text-center">
              <div className="relative">
                <div
                  className="absolute -inset-4 rounded-full blur-2xl opacity-40"
                  style={{ background: `radial-gradient(circle, ${avatarColour} 0%, transparent 70%)` }}
                  aria-hidden="true"
                />
                <Avatar
                  initial={firstInitial}
                  colour={avatarColour}
                  src={avatarPhoto}
                  className="relative h-28 w-28 text-[2.6rem] font-medium ring-1 ring-cream-light/60"
                />
              </div>
              <p className="mt-6 font-display text-ink text-[1.9rem] tracking-[-0.01em] leading-tight break-words max-w-full">
                {character?.name ?? "…"}
              </p>
              <div className="mt-2">{statusPill()}</div>
            </div>

            <div className="my-8 chat-rule" />

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openMemory}
                className="w-full flex items-center gap-3 rounded-2xl chat-tile px-4 py-3 text-left text-[0.9rem] text-ink active:scale-[0.99] cursor-pointer"
              >
                <span className="h-8 w-8 rounded-xl bg-rust/10 text-rust flex items-center justify-center shrink-0">
                  <SparkIcon />
                </span>
                <span className="min-w-0 truncate">What {character?.name ?? "they"} remembers</span>
              </button>
              <button
                type="button"
                aria-label="Search this chat"
                className="w-full flex items-center gap-3 rounded-2xl chat-tile px-4 py-3 text-left text-[0.9rem] text-ink active:scale-[0.99] cursor-pointer"
              >
                <span className="h-8 w-8 rounded-xl bg-rust/10 text-rust flex items-center justify-center shrink-0">
                  <SearchIcon />
                </span>
                Search this chat
              </button>
            </div>

            {!isEmpty && (
              <div className="mt-6 rounded-2xl border border-hairline/60 bg-cream-light/50 px-4 py-3">
                <p className="text-ink text-[1.05rem] font-medium leading-none">{messages.length}</p>
                <p className="text-muted/80 text-[0.76rem] mt-1">
                  line{messages.length === 1 ? "" : "s"} on the page
                </p>
              </div>
            )}

            <p className="mt-auto pt-8 text-muted/70 text-[0.84rem] leading-snug">
              a fictional character. they only know what you've shared.
            </p>
          </aside>

          <main className="w-full lg:flex-1 min-w-0 h-full flex flex-col relative lg:pt-4">
            <div className="lg:hidden w-full md:max-w-[900px] md:mx-auto md:px-6 lg:px-10 z-20">{header}</div>

            <div className="relative flex-1 min-h-0">
              {/* fades the stream out under the header instead of cutting it */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-8 z-10 bg-gradient-to-b from-cream to-transparent"
                aria-hidden="true"
              />

              <div
                ref={scrollRef}
                onScroll={onStreamScroll}
                className="h-full overflow-y-auto stream-scrollbar px-1 py-5 md:px-6 lg:px-10"
              >
                <div className="w-full md:max-w-[900px] md:mx-auto">
                  {loadError ? (
                    /* §9.5 - character was deleted */
                    <div className="flex flex-col items-center justify-center text-center px-6 py-20 chat-fade">
                      <div className="h-14 w-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center">
                        <WarnIcon />
                      </div>
                      <p className="mt-4 text-ink text-[1.15rem] font-medium">
                        this character was <span className="text-danger">deleted</span>.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/home")}
                        className="mt-5 rounded-full chat-accent text-[0.88rem] px-6 py-2.5 active:scale-[0.98] cursor-pointer"
                      >
                        go home →
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* c.1 - the thread arrives a page at a time. This sits
                          above the oldest message we hold: a way back when
                          there's more, and a full stop when there isn't. */}
                      {!isEmpty && (
                        <div className="flex justify-center mb-5">
                          {hasMore ? (
                            <button
                              type="button"
                              onClick={() => void loadOlder()}
                              disabled={loadingOlder}
                              aria-label="Load earlier messages"
                              className="rounded-full border border-hairline/70 bg-cream-light/70 px-3.5 py-1 text-[0.7rem] tracking-wide text-muted/80 hover:text-ink hover:border-hairline transition disabled:cursor-default disabled:opacity-70 cursor-pointer"
                            >
                              {loadingOlder ? chatErrorCopy.loadingOlder : `↑ ${chatErrorCopy.loadOlder}`}
                            </button>
                          ) : (
                            <span className="rounded-full border border-hairline/70 bg-cream-light/70 px-3 py-1 text-[0.7rem] tracking-wide text-muted/80">
                              {chatErrorCopy.threadStart}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-3">
                        {messages.map((m, i) => (
                          <Fragment key={`row-${m.id}`}>
                            {/* a real day divider, from the message's own date */}
                            {startsNewDay(m.createdAt, messages[i - 1]?.createdAt) && (
                              <div className="flex justify-center py-1.5">
                                <span className="rounded-full border border-hairline/70 bg-cream-light/70 px-3 py-1 text-[0.7rem] tracking-wide text-muted/80">
                                  {dayLabel(m.createdAt)}
                                </span>
                              </div>
                            )}
                            {m.sender === "you" ? (
                              editing === m.id ? (
                                /* c.5 - the bubble itself becomes the field */
                                <div key={m.id} className="flex justify-end chat-pop">
                                  <div className="w-[min(94%,560px)]">
                                    <InlineEditor
                                      initial={m.text}
                                      busy={sending}
                                      maxChars={4000}
                                      hint={EDIT_HINT}
                                      saveLabel="Save & regenerate"
                                      className="rounded-[20px] rounded-br-md chat-bubble-you text-[0.94rem] leading-relaxed px-4 py-2.5 placeholder:text-cream-light/60"
                                      onSave={(text) => void saveEdit(text)}
                                      onCancel={cancelEdit}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div key={m.id} className="group flex justify-end items-end gap-1.5 chat-rise">
                                  <MessageActions
                                    actions={[
                                      { key: "copy", label: "Copy", icon: CopyIcon, fn: () => void copyText(m) },
                                      ...(isPending(m)
                                        ? []
                                        : [{ key: "edit", label: "Edit", icon: EditIcon, fn: () => startEdit(m) }]),
                                      { key: "share", label: "Share", icon: ShareIcon, fn: () => void shareMessage(m) },
                                    ]}
                                  />
                                  <Stamp iso={m.createdAt} alwaysOn={isRunEnd(i)} />
                                  <div className="flex flex-col items-end gap-1.5 max-w-full">
                                    {m.attachments && m.attachments.length > 0 && (
                                      <AttachmentRow attachments={m.attachments} onOpen={openAttachment} />
                                    )}
                                    {m.text && (
                                      <button
                                        type="button"
                                        onClick={() => setMenu({ message: m })}
                                        className="text-left max-w-[min(80%,540px)] rounded-[20px] rounded-br-md chat-bubble-you text-[0.94rem] leading-relaxed px-4 py-2.5 cursor-pointer active:scale-[0.99] transition-transform whitespace-pre-line break-words"
                                      >
                                        {m.text}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            ) : m.blocked && !(stream && stream.id === m.id) ? (
                              /* c.8 - a reply the output classifier stopped */
                              <div key={m.id} className="flex justify-start items-end gap-1.5 chat-rise">
                                <div className="w-8 shrink-0">
                                  {isRunEnd(i) && (
                                    <Avatar
                                      initial={firstInitial}
                                      colour={avatarColour}
                                      src={avatarPhoto}
                                      className="h-8 w-8 text-[0.8rem] font-medium"
                                    />
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    // §12.2 - the pause belongs to the message and
                                    // comes down with it, so re-opening it shows
                                    // the reason that actually stopped the reply.
                                    // This used to be rebuilt here with the reason
                                    // hardcoded to "nsfw" and the copy inlined,
                                    // which misreported every other block.
                                    if (!m.moderation) return;
                                    setPause(m.moderation);
                                    setPauseMessageId(m.id);
                                  }}
                                  // a reply blocked before this shipped has no
                                  // stored reason; the bubble still reads, it just
                                  // doesn't open a sheet it can't fill in
                                  disabled={!m.moderation}
                                  className="text-left max-w-[min(80%,540px)] rounded-[20px] rounded-bl-md bg-[#b0842f]/[0.09] text-ink-soft text-[0.88rem] leading-relaxed px-4 py-2.5 border border-[#b0842f]/30 enabled:hover:bg-[#b0842f]/[0.14] transition enabled:cursor-pointer disabled:cursor-default"
                                >
                                  <span className="text-[#b0842f] mr-1">◌</span> didn't finish that thought.
                                </button>
                              </div>
                            ) : (
                              <div key={m.id} className="group flex justify-start items-end gap-1.5 chat-rise">
                                <div className="w-8 shrink-0 self-end">
                                  {isRunEnd(i) && (
                                    <Avatar
                                      initial={firstInitial}
                                      colour={avatarColour}
                                      src={avatarPhoto}
                                      className="h-8 w-8 text-[0.8rem] font-medium"
                                    />
                                  )}
                                </div>
                                <div className="max-w-[min(80%,560px)] flex flex-col items-start gap-2">
                                  {m.imageUrl && (
                                    <figure className="m-0 w-full">
                                      <button
                                        type="button"
                                        onClick={() => setLightbox(m)}
                                        aria-label={m.imageAlt ? `Open image: ${m.imageAlt}` : "Open image"}
                                        className="group/img relative block w-[min(76vw,340px)] rounded-[20px] rounded-bl-md overflow-hidden border border-hairline/70 bg-cream-dark shadow-[0_14px_30px_-18px_rgba(22,34,74,0.7)] active:scale-[0.99] transition cursor-zoom-in"
                                      >
                                        <img
                                          src={m.imageUrl}
                                          alt={m.imageAlt ?? "a scene the character imagined"}
                                          loading="lazy"
                                          className="block w-full aspect-[16/11] object-cover transition-transform duration-500 group-hover/img:scale-[1.03]"
                                        />
                                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                      </button>
                                      {m.imageAlt && (
                                        <figcaption className="text-ink-soft/70 text-[0.74rem] mt-1.5 px-1 italic">
                                          {m.imageAlt}
                                        </figcaption>
                                      )}
                                    </figure>
                                  )}
                                  {(m.text || (stream && stream.id === m.id)) && (
                                    <button
                                      type="button"
                                      onClick={() => setMenu({ message: m })}
                                      className="text-left rounded-[20px] rounded-bl-md chat-bubble-them text-ink text-[0.94rem] leading-relaxed px-4 py-2.5 cursor-pointer active:scale-[0.99] transition-transform whitespace-pre-line break-words"
                                    >
                                      {textFor(m)}
                                      {stream && stream.id === m.id && (
                                        <span className="chat-caret text-rust ml-0.5">▍</span>
                                      )}
                                    </button>
                                  )}
                                  {aborted && aborted.id === m.id && (
                                    <div className="flex items-center gap-2 pl-1 chat-fade">
                                      <span className="text-ink-soft/80 text-[0.8rem] italic">
                                        {chatErrorCopy.streamingAborted}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => finishStream(m)}
                                        className="rounded-full border border-rust/40 text-rust hover:bg-rust/10 text-[0.78rem] px-2.5 py-0.5 transition cursor-pointer"
                                      >
                                        {chatErrorCopy.finishIt}
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <Stamp iso={m.createdAt} alwaysOn={isRunEnd(i)} />
                                {/* held back while the words are still arriving */}
                                {!(stream && stream.id === m.id) && (
                                  <MessageActions
                                    actions={[
                                      ...(m.text
                                        ? [{ key: "copy", label: "Copy", icon: CopyIcon, fn: () => void copyText(m) }]
                                        : []),
                                      ...(m.text && !isPending(m)
                                        ? [
                                          {
                                            key: "speak",
                                            label: voiceCopy.speak,
                                            icon: SpeakIcon,
                                            fn: () => undefined,
                                            node: (
                                              <VoicePlayButton
                                                messageId={m.id}
                                                onRefusal={(r) => setRefusal(r)}
                                                onToast={showToast}
                                              />
                                            ),
                                          },
                                        ]
                                        : []),
                                      {
                                        key: "retry",
                                        label: m.imageUrl ? "Imagine again" : "Regenerate",
                                        icon: RetryIcon,
                                        fn: () => void regenerate(m.id),
                                      },
                                      { key: "share", label: "Share", icon: ShareIcon, fn: () => void shareMessage(m) },
                                    ]}
                                  />
                                )}
                              </div>
                            )}
                          </Fragment>
                        ))}

                        {showTypingBubble &&
                          (status === "drawing" ? (
                            <div className="flex justify-start items-end gap-1.5 chat-pop">
                              <Avatar
                                initial={firstInitial}
                                colour={avatarColour}
                                src={avatarPhoto}
                                className="h-8 w-8 text-[0.8rem] font-medium"
                              />
                              <div className="chat-shimmer relative w-[min(76vw,340px)] aspect-[16/11] rounded-[20px] rounded-bl-md overflow-hidden border border-hairline/70 bg-cream-dark">
                                <div
                                  className="absolute inset-0 opacity-70"
                                  style={{
                                    background: `linear-gradient(135deg, ${avatarColour}33 0%, transparent 55%, ${avatarColour}22 100%)`,
                                  }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center gap-2 text-ink-soft/80 text-[0.84rem]">
                                  <span className="text-rust">
                                    <ImagineIcon />
                                  </span>
                                  sketching…
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-start items-end gap-1.5 chat-pop">
                              <Avatar
                                initial={firstInitial}
                                colour={avatarColour}
                                src={avatarPhoto}
                                className="h-8 w-8 text-[0.8rem] font-medium"
                              />
                              <div className="rounded-[20px] rounded-bl-md chat-bubble-them px-4 py-3.5">
                                <span className="flex gap-1.5">
                                  <span className="chat-dot h-1.5 w-1.5 rounded-full bg-ink-soft/50" />
                                  <span className="chat-dot h-1.5 w-1.5 rounded-full bg-ink-soft/50 [animation-delay:0.16s]" />
                                  <span className="chat-dot h-1.5 w-1.5 rounded-full bg-ink-soft/50 [animation-delay:0.32s]" />
                                </span>
                              </div>
                            </div>
                          ))}

                        {/* c.9 - network error mid-send */}
                        {netError && (
                          <div className="flex justify-start pl-[2.375rem] chat-pop">
                            <div className="rounded-[20px] rounded-bl-md bg-[#b0842f]/[0.08] px-4 py-2.5 border border-[#b0842f]/40 flex flex-wrap items-center gap-2.5">
                              <span className="text-ink-soft text-[0.85rem]">{NETWORK_COPY}</span>
                              <button
                                type="button"
                                onClick={retrySend}
                                className="rounded-full chat-accent text-[0.78rem] px-3 py-1 active:scale-[0.98] cursor-pointer"
                              >
                                Retry
                              </button>
                              <button
                                type="button"
                                onClick={skipSend}
                                className="rounded-full border border-ink/15 text-[0.78rem] text-ink-soft/80 hover:text-ink-soft hover:bg-ink/5 px-3 py-1 transition cursor-pointer"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        )}

                        {stream && (
                          <div className="flex justify-start pl-[2.375rem] chat-fade">
                            <button
                              type="button"
                              onClick={stopStream}
                              className="rounded-full chat-tile px-3.5 py-1 text-[0.78rem] text-ink-soft/85 hover:text-rust active:scale-[0.98] cursor-pointer"
                            >
                              stop
                            </button>
                          </div>
                        )}
                      </div>

                      {/* c.1 - empty chat */}
                      {isEmpty && !initialLoading && !netError && !showTypingBubble && (
                        <div className="flex flex-col items-center justify-center text-center px-6 py-16 md:py-24 chat-fade">
                          <div className="relative lg:hidden">
                            <div
                              className="absolute -inset-5 rounded-full blur-2xl opacity-35"
                              style={{ background: `radial-gradient(circle, ${avatarColour} 0%, transparent 70%)` }}
                              aria-hidden="true"
                            />
                            <Avatar
                              initial={firstInitial}
                              colour={avatarColour}
                              src={avatarPhoto}
                              className="relative h-20 w-20 text-[2rem] font-medium"
                            />
                          </div>
                          <p className="mt-5 lg:mt-0 font-display text-ink text-[1.6rem] tracking-[-0.01em]">
                            {character?.name ?? "…"}
                          </p>
                          <p className="mt-1.5 text-muted text-[0.9rem]">{EMPTY_COPY}</p>

                          <div className="mt-7 flex flex-wrap justify-center gap-2 max-w-[26rem]">
                            {STARTERS.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => useStarter(s)}
                                className="rounded-full chat-tile px-4 py-2 text-[0.84rem] text-ink-soft hover:text-ink active:scale-[0.98] cursor-pointer"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {showJump && !loadError && (
                <div className="absolute inset-x-0 bottom-3 w-full md:max-w-[900px] md:mx-auto md:px-6 lg:px-10 flex justify-center pointer-events-none chat-pop">
                  <button
                    type="button"
                    aria-label="Scroll to latest message"
                    onClick={() => scrollToBottom()}
                    className="pointer-events-auto inline-flex items-center gap-1.5 h-9 rounded-full chat-glass border border-hairline/80 shadow-[0_12px_28px_-14px_rgba(22,34,74,0.6)] px-3.5 text-[0.8rem] text-ink-soft hover:text-rust active:scale-95 transition cursor-pointer"
                  >
                    <DownIcon /> latest
                  </button>
                </div>
              )}
            </div>

            {/* c.10 - the daily limit banner takes the composer's place */}
            <div className="w-full md:max-w-[900px] md:mx-auto md:px-6 lg:px-10">
              {!loadError && isFreeReached ? (
                <div className="shrink-0 pt-2 pb-3 chat-pop">
                  <div className="rounded-3xl border border-[#68775B]/30 bg-[#68775B]/[0.09] px-5 py-4 text-center shadow-[0_16px_36px_-26px_rgba(22,34,74,0.8)]">
                    <p className="text-ink text-[0.94rem] leading-relaxed">
                      {/* the count comes from usage, like the countdown beside
                          it hardcoding "30" meant changing the server's limit
                          left the banner quietly lying about it */}
                      {usage?.limit ?? 30} messages that's a good day's writing. the page comes back tomorrow.{" "}
                      <span className="text-ink-soft">or keep going on Plus.</span>
                    </p>
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 justify-center">
                      <span className="rounded-full border border-ink/15 text-ink-soft/75 text-[0.8rem] px-4 py-1.5">
                        {untilReset(usage?.resetAt ?? null, nowMs)}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate("/plans")}
                        className="rounded-full chat-accent text-[0.82rem] px-5 py-1.5 active:scale-[0.98] cursor-pointer"
                      >
                        See Plus →
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                !loadError && (
                  <div className="shrink-0 pt-2 pb-3">
                    {imagine && (
                      <div className="chat-fade mb-2 flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rust/35 bg-rust/[0.08] text-rust text-[0.76rem] px-3 py-1">
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
                            className="relative flex items-center gap-2 rounded-2xl border border-hairline bg-cream-light/80 pl-1.5 pr-7 py-1.5 max-w-[220px]"
                          >
                            {previews[i] ? (
                              <img src={previews[i] as string} alt="" className="h-10 w-10 rounded-xl object-cover" />
                            ) : (
                              <span className="h-10 w-10 rounded-xl bg-ink/5 text-ink-soft flex items-center justify-center">
                                <FileIcon />
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-[0.8rem] text-ink leading-snug">{f.name}</span>
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

                    <div
                      className={`relative flex items-end gap-1.5 rounded-[26px] chat-composer px-2 py-2 ${imagine ? "chat-composer--imagine" : ""}`}
                    >
                      {/* "+" → share a photo / file, or switch on imagine */}
                      {plusOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setPlusOpen(false)} />
                          <div className="absolute left-1 bottom-[calc(100%+8px)] z-40 w-56 rounded-2xl border border-hairline bg-cream-light shadow-[0_18px_40px_-20px_rgba(22,34,74,0.5)] p-1.5 chat-pop">
                            <button
                              type="button"
                              onClick={() => {
                                setPlusOpen(false);
                                fileInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[0.86rem] text-ink hover:bg-ink/5 cursor-pointer"
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
                                wakeFromQuiet();
                                requestAnimationFrame(() => textareaRef.current?.focus());
                              }}
                              className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[0.86rem] text-ink hover:bg-ink/5 cursor-pointer"
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
                          if (imagine) {
                            setImagine(false);
                            setPremium(false);
                            setPremiumOverflow(false);
                          } else {
                            setPlusOpen((v) => !v);
                          }
                          wakeFromQuiet();
                        }}
                        className={`h-9 w-9 rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0 ${imagine
                          ? "chat-accent"
                          : plusOpen
                            ? "border border-hairline text-ink bg-ink/5 rotate-45"
                            : "border border-hairline text-ink-soft hover:text-ink hover:bg-ink/5"
                          }`}
                      >
                        {imagine ? <ImagineIcon /> : <AttachIcon />}
                      </button>
                      {/* say it instead of typing it - the words land in the
                          composer, still yours to edit before sending */}
                      <VoiceRecorderButton
                        onTranscript={(text) => {
                          setInput((cur) => (cur ? `${cur.trimEnd()} ${text}` : text));
                          wakeFromQuiet();
                          requestAnimationFrame(() => textareaRef.current?.focus());
                        }}
                        onRefusal={(r) => setRefusal(r)}
                        onToast={showToast}
                        disabled={sending}
                      />

                      {/* the paid extras for this one send. Each hides itself
                          on a plan that does not have it, so the composer stays
                          quiet for someone who has never paid. */}
                      <PremiumToggle
                        on={premium}
                        onChange={(next, overflow) => {
                          setPremium(next);
                          setPremiumOverflow(next ? overflow : false);
                          wakeFromQuiet();
                        }}
                        disabled={sending}
                        className="shrink-0 hidden sm:inline-flex"
                      />
                      <PremiumVoiceToggle className="shrink-0 hidden lg:inline-flex" />
                      <ModelPicker
                        value={modelId}
                        onChange={(id) => {
                          setModelId(id);
                          wakeFromQuiet();
                        }}
                        disabled={sending}
                        className="shrink-0 hidden sm:block"
                      />

                      <textarea
                        ref={textareaRef}
                        rows={1}
                        value={input}
                        onChange={onInput}
                        onKeyDown={onKeyDown}
                        onFocus={wakeFromQuiet}
                        placeholder={imagine ? "imagine something…" : files.length ? "say something about it… (optional)" : "say something…"}
                        className="flex-1 resize-none bg-transparent outline-none text-[0.94rem] text-ink placeholder:text-ink-soft/50 py-2 px-1.5 leading-relaxed max-h-[132px] no-scrollbar"
                      />

                      {/* counter only shows near the ceiling */}
                      {trimmed.length > 3400 && (
                        <span
                          className={`self-center text-[0.72rem] tabular-nums shrink-0 pr-0.5 ${overLimit ? "text-rust" : "text-ink-soft/50"}`}
                        >
                          {(4000 - trimmed.length).toLocaleString()}
                        </span>
                      )}

                      <button
                        type="button"
                        aria-label="Send"
                        onClick={send}
                        disabled={!canSend}
                        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition active:scale-95 ${canSend
                          ? "chat-accent cursor-pointer"
                          : "border border-hairline text-ink-soft/40 cursor-default"
                          }`}
                      >
                        <SendIcon />
                      </button>
                    </div>

                    {overLimit && (
                      <p className="text-rust text-[0.74rem] text-right mt-1.5 pr-3">
                        {trimmed.length.toLocaleString()} / 4,000 - shorten?
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            {menu && (
              <div
                className="fixed inset-0 z-40 flex items-end justify-center md:items-center"
                onClick={() => setMenu(null)}
              >
                <div className="absolute inset-0 chat-scrim chat-fade" />
                <div
                  ref={menuDialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={menu.message.sender === "you" ? "Your message" : `Message from ${character?.name ?? "them"}`}
                  tabIndex={-1}
                  className="relative z-10 w-full max-w-[460px] md:max-w-[420px] mb-3 md:mb-0 mx-3 rounded-3xl chat-sheet border border-hairline/80 overflow-hidden shadow-[0_-10px_40px_-16px_rgba(22,34,74,0.5)] md:shadow-[0_28px_70px_-24px_rgba(22,34,74,0.5)] chat-sheet-up focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mx-auto mt-3 mb-1 h-1 w-10 rounded-full bg-ink/10 md:hidden" />
                  {(menu.message.sender === "you"
                    ? [
                      // Edit and Delete both address the message by its server
                      // id. An optimistic bubble ("tmp-…") doesn't have one yet,
                      // so those PATCH/DELETE a row that has never existed - the
                      // hover row already withheld Edit for exactly this reason.
                      ...(isPending(menu.message)
                        ? []
                        : [{ label: "Edit", fn: () => startEdit(menu.message) }]),
                      { label: "Copy", fn: () => copyText(menu.message) },
                      { label: "Share", fn: () => shareMessage(menu.message) },
                      ...(isPending(menu.message)
                        ? []
                        : [{ label: "Delete from here", fn: () => deleteFromHere(menu.message), danger: true }]),
                    ]
                    : [
                      ...(menu.message.imageUrl
                        ? [{ label: "Save image", fn: () => void saveImage(menu.message) }]
                        : []),
                      ...(menu.message.text
                        ? [{ label: "Copy", fn: () => copyText(menu.message) }]
                        : []),
                      // touch has no hover row, so the speak control lives here
                      // too - same message id, same server rules.
                      ...(menu.message.text && !isPending(menu.message)
                        ? [{ label: voiceCopy.speakShort, fn: () => speakFromSheet(menu.message.id) }]
                        : []),
                      {
                        label: menu.message.imageUrl ? "Imagine again" : "Regenerate response",
                        fn: () => regenerate(menu.message.id),
                      },
                      { label: "Share", fn: () => shareMessage(menu.message) },
                      {
                        label: "Report this",
                        fn: () => openReport(menu.message.id),
                      },
                      {
                        label: "Save to journal",
                        fn: () => {
                          setMenu(null);
                          showToast("saved to your journal.");
                        },
                      },
                    ]
                  ).map((a, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={a.fn}
                      className={`w-full text-left px-5 py-3.5 text-[0.92rem] border-b border-hairline/50 last:border-b-0 hover:bg-ink/[0.04] active:bg-ink/[0.07] transition cursor-pointer ${(a as { danger?: boolean }).danger ? "text-danger" : "text-ink"
                        }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* moderation pause sheet, §12.1 and §12.2 */}
            {pause && (
              <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-4">
                <div className="absolute inset-0 chat-scrim chat-fade" onClick={dismissPause} />
                <div
                  ref={pauseDialogRef}
                  role="alertdialog"
                  aria-modal="true"
                  aria-label={pause.headline}
                  tabIndex={-1}
                  className="relative z-10 w-full max-w-[460px] rounded-t-[28px] md:rounded-[28px] chat-sheet border-t border-x md:border border-hairline/80 px-6 pt-5 pb-8 md:pb-7 text-center shadow-[0_-12px_44px_-16px_rgba(22,34,74,0.55)] md:shadow-[0_30px_80px_-26px_rgba(22,34,74,0.55)] chat-sheet-up focus:outline-none"
                >
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/10 md:hidden" />
                  <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[#b0842f]/15 text-[#b0842f] flex items-center justify-center">
                    <WarnIcon />
                  </div>
                  <h2 className="text-ink text-[1.22rem] font-medium tracking-[-0.01em] leading-tight">
                    {pause.headline}
                  </h2>
                  <p className="text-ink-soft text-[0.92rem] leading-relaxed mt-2 whitespace-pre-line">
                    {pause.body}
                  </p>
                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={pausePrimary}
                      className="rounded-full chat-accent text-[0.92rem] px-5 py-2.5 active:scale-[0.98] cursor-pointer"
                    >
                      {pause.primary}
                    </button>
                    <button
                      type="button"
                      onClick={pauseSecondary}
                      className="rounded-full border border-hairline text-ink-soft text-[0.88rem] px-5 py-2.5 hover:bg-ink/5 hover:text-ink transition cursor-pointer"
                    >
                      {pause.secondary}
                    </button>
                    <button
                      type="button"
                      onClick={pauseTertiary}
                      className="rounded-full text-ink-soft/70 text-[0.84rem] px-5 py-2 hover:bg-ink/[0.04] hover:text-ink-soft transition cursor-pointer"
                    >
                      {pause.tertiary}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {report && (
              <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-4">
                <div className="absolute inset-0 chat-scrim chat-fade" onClick={closeReport} />
                <div
                  ref={reportDialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={reportCopy.headline}
                  tabIndex={-1}
                  className="relative z-10 w-full max-w-[460px] rounded-t-[28px] md:rounded-[28px] chat-sheet border-t border-x md:border border-hairline/80 px-6 pt-5 pb-8 md:pb-7 shadow-[0_-12px_44px_-16px_rgba(22,34,74,0.55)] md:shadow-[0_30px_80px_-26px_rgba(22,34,74,0.55)] chat-sheet-up focus:outline-none"
                >
                  <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/10" />
                  <h2 className="text-ink text-[1.2rem] font-medium tracking-[-0.01em] leading-tight">
                    {reportCopy.headline}
                  </h2>
                  <p className="text-ink-soft/80 text-[0.84rem] mt-1">{reportCopy.sub}</p>

                  <div className="mt-4 flex flex-col gap-1.5">
                    {reportCopy.reasons.map((r) => {
                      const checked = reportReason === r.value;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setReportReason(r.value)}
                          className={`w-full text-left flex items-center gap-3 rounded-2xl px-4 py-3 border transition cursor-pointer ${checked
                            ? "border-rust/60 bg-rust/[0.08] shadow-[0_8px_20px_-16px_rgba(22,34,74,0.8)]"
                            : "border-hairline/70 hover:bg-ink/[0.03] hover:border-hairline"
                            }`}
                        >
                          <span
                            className={`h-[1.05rem] w-[1.05rem] rounded-full border flex items-center justify-center shrink-0 transition ${checked ? "border-rust" : "border-ink/25"
                              }`}
                          >
                            {checked && <span className="h-2 w-2 rounded-full bg-rust chat-pop" />}
                          </span>
                          <span className="text-ink text-[0.9rem]">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder={reportCopy.notePlaceholder}
                    rows={2}
                    className="mt-3 w-full resize-none rounded-2xl bg-cream/70 text-ink text-[0.9rem] px-4 py-3 outline-none border border-hairline/70 focus:border-rust/50 focus:bg-cream-light transition-colors placeholder:text-ink-soft/50"
                  />

                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={submitReport}
                      disabled={!reportReason || reportSubmitting}
                      className="rounded-full chat-accent text-[0.92rem] px-5 py-2.5 active:scale-[0.98] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {reportSubmitting ? "sending…" : reportCopy.send}
                    </button>
                    <button
                      type="button"
                      onClick={closeReport}
                      className="rounded-full border border-hairline text-ink-soft text-[0.88rem] px-5 py-2.5 hover:bg-ink/5 hover:text-ink transition cursor-pointer"
                    >
                      {reportCopy.cancel}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {memoryOpen && (
              <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-4">
                <div className="absolute inset-0 chat-scrim chat-fade" onClick={() => setMemoryOpen(false)} />
                <div
                  ref={memoryDialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={MEMORY_HEADER.replace("{name}", character?.name ?? "they")}
                  tabIndex={-1}
                  className="relative z-10 w-full max-w-[460px] md:max-w-[520px] rounded-t-[28px] md:rounded-[28px] chat-sheet border-t border-x md:border border-hairline/80 px-5 pt-5 pb-8 md:pb-6 shadow-[0_-12px_44px_-16px_rgba(22,34,74,0.55)] md:shadow-[0_30px_80px_-26px_rgba(22,34,74,0.55)] max-h-[78%] md:max-h-[80vh] flex flex-col chat-sheet-up focus:outline-none"
                >
                  <div className="shrink-0">
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/10" />
                    <div className="flex items-center gap-3">
                      <Avatar
                        initial={firstInitial}
                        colour={avatarColour}
                        src={avatarPhoto}
                        className="h-10 w-10 text-[0.95rem] font-medium"
                      />
                      <div className="min-w-0">
                        <h2 className="text-ink text-[1.12rem] font-medium tracking-[-0.01em] truncate">
                          {MEMORY_HEADER.replace("{name}", character?.name ?? "they")}
                        </h2>
                        <p className="text-ink-soft/75 text-[0.8rem] mt-0.5">{MEMORY_SUB}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex-1 overflow-y-auto quiet-scrollbar flex flex-col gap-2.5 pr-1">
                    {memoryLoading ? (
                      <p className="text-muted text-[0.88rem] text-center py-10">reading…</p>
                    ) : memories.length === 0 ? (
                      <p className="text-muted text-[0.9rem] text-center py-12 px-6">{MEMORY_EMPTY}</p>
                    ) : (
                      memories.map((mem) => (
                        <div
                          key={mem.id}
                          className="rounded-2xl bg-[#68775B]/[0.08] border border-[#68775B]/25 px-4 py-3 flex items-start justify-between gap-3 hover:bg-[#68775B]/[0.12] transition chat-pop"
                        >
                          <div className="min-w-0">
                            <p className="text-ink text-[0.92rem] leading-snug">{mem.fact}</p>
                            <p className="text-ink-soft/60 text-[0.74rem] mt-1">{learnedWhen(mem.learnedAt)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForget(mem)}
                            className="shrink-0 rounded-full border border-transparent text-rust/80 text-[0.78rem] px-2.5 py-1 hover:text-rust hover:border-rust/35 hover:bg-rust/[0.07] transition cursor-pointer"
                          >
                            forget
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMemoryOpen(false)}
                    className="shrink-0 mt-4 rounded-full border border-hairline text-ink-soft text-[0.88rem] px-5 py-2.5 hover:bg-ink/5 hover:text-ink transition cursor-pointer"
                  >
                    close
                  </button>
                </div>
              </div>
            )}

            {/* forget-a-fact confirm */}
            {forget && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
                <div className="absolute inset-0 chat-scrim chat-fade" onClick={() => setForget(null)} />
                <div
                  ref={forgetDialogRef}
                  role="alertdialog"
                  aria-modal="true"
                  aria-label={FORGET_HEADLINE}
                  tabIndex={-1}
                  className="relative z-10 w-full max-w-[350px] rounded-[26px] chat-sheet border border-hairline/80 p-6 text-center shadow-[0_28px_70px_-24px_rgba(22,34,74,0.6)] chat-dialog-in focus:outline-none"
                >
                  <h3 className="text-ink text-[1.1rem] font-medium tracking-[-0.01em]">{FORGET_HEADLINE}</h3>
                  <p className="text-ink-soft text-[0.88rem] mt-2">{FORGET_BODY}</p>
                  <p className="text-ink text-[0.88rem] italic mt-3.5 rounded-2xl bg-ink/[0.04] px-3 py-2.5">
                    “{forget.fact}”
                  </p>
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={confirmForget}
                      className="rounded-full chat-accent text-[0.88rem] px-5 py-2.5 active:scale-[0.98] cursor-pointer"
                    >
                      yes, forget
                    </button>
                    <button
                      type="button"
                      onClick={() => setForget(null)}
                      className="rounded-full border border-hairline text-ink-soft text-[0.86rem] px-5 py-2.5 hover:bg-ink/5 hover:text-ink transition cursor-pointer"
                    >
                      keep it
                    </button>
                  </div>
                </div>
              </div>
            )}

            {lightbox && lightbox.imageUrl && (
              <div
                ref={lightboxDialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={lightbox.imageAlt || "Image"}
                tabIndex={-1}
                className="fixed inset-0 z-[65] flex flex-col items-center justify-center px-5 py-8 focus:outline-none"
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
                    src={lightbox.imageUrl}
                    alt={lightbox.imageAlt ?? "a scene the character imagined"}
                    className="w-full rounded-[22px] border border-white/15 shadow-[0_30px_80px_-22px_rgba(0,0,0,0.7)]"
                  />
                  {lightbox.imageAlt && (
                    <figcaption className="text-white/90 text-[0.9rem] mt-3.5 text-center px-4 italic">
                      {lightbox.imageAlt}
                    </figcaption>
                  )}
                  <button
                    type="button"
                    onClick={() => void saveImage(lightbox)}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream-light text-ink text-[0.86rem] px-5 py-2.5 hover:brightness-95 active:scale-[0.98] transition cursor-pointer"
                  >
                    <SaveIcon /> save image
                  </button>
                </figure>
              </div>
            )}

            {/* toast (§7.5) */}
            {/* Always mounted, so a screen reader has a region to announce
                into. Rendering the toast only when there's a message meant the
                live region appeared with its content and was often missed. */}
            <div role="status" aria-live="polite" className="sr-only">
              {toast}
            </div>
            {/* The reply itself, announced once the reveal has finished rather
                than a word at a time the streaming bubble is decorative to a
                screen reader, and reading it as it arrives is unusable. */}
            <div role="log" aria-live="polite" aria-atomic="true" className="sr-only">
              {!stream && lastMessage && lastMessage.sender === "them" && !lastMessage.blocked
                ? `${character?.name ?? "they"}: ${lastMessage.text}`
                : ""}
            </div>
            {toast && (
              <div
                aria-hidden="true"
                className="fixed bottom-7 left-1/2 z-[70] rounded-full bg-charcoal text-cream-light text-[0.84rem] px-5 py-2.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)] chat-toast-in"
              >
                {toast}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* one sheet for every way the server said no */}
      <UpgradePrompt refusal={refusal} onClose={() => setRefusal(null)} />
    </div>
  );
}
