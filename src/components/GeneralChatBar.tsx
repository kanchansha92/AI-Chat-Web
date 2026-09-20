import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { chatService, type AssistantTurn } from "../services/chatService";
import { ApiError } from "../services/authService";
import { useAppDispatch, useAppSelector, useAppStore } from "../hook/hooks";
import {
  appendTurn,
  newTurn,
  removeTurn,
  truncateFrom,
  replaceFrom,
  startNewChat as startNewChatAction,
  type ChatTurn,
  type AttachedTurnDocument,
} from "../redux/generalChatsSlice";
import MessageActions, {
  CopyIcon,
  EditIcon,
  PdfIcon,
  RetryIcon,
  ShareIcon,
  shareText,
} from "./MessageActions";
import InlineEditor from "./InlineEditor";
import Markdown from "./Markdown";

// inline dashboard assistant; conversation state lives in redux/generalChatsSlice

// on the inner blocks, not <main>, so the scrollbar sits against the window edge
const GUTTER = "px-5 sm:px-6 lg:px-10 2xl:px-12";

export default function GeneralChatBar({ children }: { children?: ReactNode }) {
  const dispatch = useAppDispatch();
  // Read directly, not through a selector: which chat a reply belongs to has to
  // be sampled at the instant the request goes out, not at the last render.
  const store = useAppStore();
  const currentId = useAppSelector((s) => s.generalChats.currentId);
  const sessions = useAppSelector((s) => s.generalChats.sessions);
  const startNewChat = () => dispatch(startNewChatAction());

  const messages = useMemo(
    () =>
      (currentId
        ? sessions.find((s) => s.id === currentId)?.messages
        : undefined) ?? [],
    [currentId, sessions]
  );

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // image is the downscaled Blob we upload, imagePreview its data-URL for the bubble
  const [image, setImage] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasConversation = messages.length > 0;
  const trimmed = input.trim();
  const canSend = (!!trimmed || !!image) && !sending;

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // context for a question at `upto` (exclusive); notes are local, not conversation
  const historyBefore = useCallback(
    (upto: number): AssistantTurn[] =>
      messages
        .slice(0, upto < 0 ? messages.length : upto)
        .filter((m) => m.kind === "user" || m.kind === "assistant")
        .map((m) => ({ role: m.kind as "user" | "assistant", text: m.text })),
    [messages]
  );

  const onPickImage = async (e: ReactChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // otherwise re-picking the same file fires no change event
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("that's not an image file.");
      return;
    }
    try {
      const prepared = await prepareImage(file);
      setImage(prepared.blob);
      setImagePreview(prepared.dataUrl);
      setError(null);
    } catch {
      setError("couldn't read that image. try another.");
    }
  };

  useEffect(() => {
    if (!hasConversation) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, hasConversation]);

  const onInput = (e: ReactChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const send = useCallback(
    async (raw: string, opts?: { history?: AssistantTurn[]; dropFromId?: string }) => {
      const text = raw.trim();
      // a rewrite comes from the bubble, so it must not eat the composer draft
      // or a pending image
      const rewriting = !!opts?.dropFromId;
      const img = rewriting ? null : image;
      const preview = rewriting ? null : imagePreview;
      if ((!text && !img) || sending) return;

      const history: AssistantTurn[] = opts?.history ?? historyBefore(-1);

      const userTurn = newTurn("user", text, { imageUrl: preview ?? undefined });
      setError(null);
      if (!rewriting) {
        setInput("");
        clearImage();
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      }
      // has to be one dispatch, not truncate-then-append; see replaceFrom
      if (opts?.dropFromId) dispatch(replaceFrom({ id: opts.dropFromId, turn: userTurn }));
      else dispatch(appendTurn(userTurn));

      // Which chat this answer belongs to, sampled AFTER the question landed -
      // a first message creates its session lazily, so this is the moment the
      // id exists. Every dispatch below carries it, and the reducer drops the
      // turn if the user has moved on. Without it, clicking "new chat" while
      // the dots were bouncing put the answer in the new, empty chat.
      const sessionId = store.getState().generalChats.currentId;
      setSending(true);

      try {
        const res = await chatService.ask(text, history, img);

        if (res.reply && !res.reply.blocked && (res.reply.text || res.reply.imageUrl)) {
          dispatch(
            appendTurn({
              sessionId,
              turn: newTurn("assistant", res.reply.text, {
                imageUrl: res.reply.imageUrl ?? undefined,
                imageAlt: res.reply.imageAlt ?? undefined,
                document: res.reply.document ?? undefined,
              }),
            })
          );
        } else if (res.moderation) {
          const note = `${res.moderation.headline} ${res.moderation.body}`.trim();
          dispatch(appendTurn({ sessionId, turn: newTurn("note", note) }));
        } else {
          dispatch(
            appendTurn({
              sessionId,
              turn: newTurn("note", "nothing came back. try once more?"),
            })
          );
        }
      } catch (e) {
        if (rewriting) {
          // the rewrite already replaced the old question, so keep it: removing
          // it would leave nothing for Retry to re-ask
        } else {
          // drop the optimistic turn and restore the draft, so a resend
          // rebuilds the right history - but only if we are still in the chat
          // it was asked in
          dispatch(removeTurn({ sessionId, id: userTurn.id }));
          setInput((cur) => (cur ? cur : text));
          if (img) {
            setImage(img);
            setImagePreview(preview);
          }
        }
        const msg =
          e instanceof ApiError
            ? e.message
            : "connection slipped. try again?";
        setError(msg);
      } finally {
        setSending(false);
      }
    },
    [historyBefore, sending, dispatch, store, image, imagePreview]
  );

  const copyTurn = async (m: ChatTurn) => {
    try {
      await navigator.clipboard.writeText(m.text);
      showToast("copied.");
    } catch {
      showToast("couldn't copy.");
    }
  };

  const shareTurn = async (m: ChatTurn) => {
    const who = m.kind === "user" ? "you" : "privateaile";
    const note = await shareText(m.text ? `${who}: ${m.text}` : who, "a note");
    if (note) showToast(note);
  };

  // Save an answer as a PDF. The document is titled after the question that
  // produced it, so a file sitting in Downloads still says what it is; the
  // server falls back to the reply's own first heading when there's no question.
  const [savingPdfId, setSavingPdfId] = useState<string | null>(null);

  const downloadTurn = async (m: ChatTurn) => {
    if (!m.text.trim() || savingPdfId) return;
    const idx = messages.findIndex((t) => t.id === m.id);
    const question = messages
      .slice(0, idx < 0 ? undefined : idx)
      .reverse()
      .find((t) => t.kind === "user" && t.text.trim());
    setSavingPdfId(m.id);
    try {
      const res = await chatService.downloadPdf(m.text, question?.text.trim());
      if (res.saved) showToast(`saved ${res.filename ?? "the pdf"}`);
      else if (res.moderation) showToast(res.moderation.headline.trim());
      else showToast("couldn't make that pdf.");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "couldn't make that pdf.");
    } finally {
      setSavingPdfId(null);
    }
  };

  // A PDF the assistant attached itself. It lives on the server behind an
  // owner-scoped route, so opening it is a fetch-with-token rather than a link.
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const openDocument = async (
    doc: AttachedTurnDocument,
    mode: "open" | "save"
  ) => {
    if (openingDocId) return;
    setOpeningDocId(doc.id);
    try {
      const ok = await chatService.openDocument(doc, mode);
      if (!ok) showToast("couldn't open that document.");
      else if (mode === "save") showToast(`saved ${doc.filename}`);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "couldn't open that document.");
    } finally {
      setOpeningDocId(null);
    }
  };

  const startEdit = (m: ChatTurn) => {
    setEditingId(m.id);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (text: string) => {
    if (!editingId || sending || !text) return;
    const idx = messages.findIndex((m) => m.id === editingId);
    if (idx < 0) {
      cancelEdit();
      return;
    }
    const id = editingId;
    setEditingId(null);
    await send(text, { history: historyBefore(idx), dropFromId: id });
  };

  // backs both retry-an-answer and Retry-a-failed-send. `dropFromId` is the
  // stale answer to cut first. Text only: an upload doesn't outlive its send.
  const askExisting = async (qIdx: number, dropFromId: string | null) => {
    if (sending) return;
    const question = messages[qIdx];
    if (!question || question.kind !== "user" || !question.text.trim()) {
      showToast("nothing to ask again.");
      return;
    }

    const history = historyBefore(qIdx);
    setError(null);
    if (dropFromId) dispatch(truncateFrom(dropFromId));
    // Same rule as `send`: the answer belongs to the chat it was asked in.
    const sessionId = store.getState().generalChats.currentId;
    setSending(true);
    try {
      const res = await chatService.ask(question.text, history);
      if (res.reply && !res.reply.blocked && (res.reply.text || res.reply.imageUrl)) {
        dispatch(
          appendTurn({
            sessionId,
            turn: newTurn("assistant", res.reply.text, {
              imageUrl: res.reply.imageUrl ?? undefined,
              imageAlt: res.reply.imageAlt ?? undefined,
              document: res.reply.document ?? undefined,
            }),
          })
        );
      } else if (res.moderation) {
        const note = `${res.moderation.headline} ${res.moderation.body}`.trim();
        dispatch(appendTurn({ sessionId, turn: newTurn("note", note) }));
      } else {
        dispatch(
          appendTurn({
            sessionId,
            turn: newTurn("note", "nothing came back. try once more?"),
          })
        );
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "connection slipped. try again?";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const retryTurn = (assistantId: string) => {
    const idx = messages.findIndex((m) => m.id === assistantId);
    if (idx < 0) return;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].kind === "user") {
        void askExisting(i, assistantId);
        return;
      }
    }
    showToast("nothing to ask again.");
  };

  // a failed send leaves a trailing user turn with no answer; Retry should
  // reach for that before the composer
  const lastTurn = messages.length ? messages[messages.length - 1] : null;
  const hanging = lastTurn?.kind === "user" && !!lastTurn.text.trim() ? lastTurn : null;
  const canRetry = !sending && (!!hanging || canSend);
  const retryLast = () => {
    if (hanging) void askExisting(messages.length - 1, null);
    else void send(input);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  return (
    <div className={`flex-1 min-h-0 w-full flex flex-col ${hasConversation ? "" : "justify-center"}`}>
      {hasConversation && (
        <div className={`shrink-0 w-full max-w-[760px] mx-auto flex items-center justify-between pb-1 ${GUTTER}`}>
          <span className="flex items-center gap-1.5 font-caveat  text-muted text-[0.95rem] leading-none">
            <SparkIcon className="h-3.5 w-3.5 text-rust/80" />
            Private Aile someone to think alongside, not a character
          </span>
          <button
            type="button"
            onClick={() => {
              startNewChat();
              setInput("");
              setError(null);
              setEditingId(null);
            }}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rust/30 bg-rust/10 font-serif font-semibold text-[0.8rem] text-rust shadow-sm hover:bg-rust/20 hover:border-rust/50 hover:text-rust-hover transition cursor-pointer"
          >
            <NewChatIcon />
            new note
          </button>
        </div>
      )}

      {/* both states scroll, otherwise tall content is clipped by the page's overflow-hidden */}
      <div
        ref={scrollRef}
        className={`w-full overflow-y-auto ${hasConversation ? "flex-1 min-h-0 py-4 stream-scrollbar" : "min-h-0 shrink quiet-scrollbar"
          }`}
      >
        {hasConversation ? (
          <div className={`w-full max-w-[760px] mx-auto ${GUTTER}`}>
            <p className="text-center font-caveat  text-muted/70 text-[0.72rem] mb-5">
              today
            </p>

            <div className="flex flex-col gap-6">
              {messages.map((m) =>
                m.kind === "user" ? (
                  editingId === m.id ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="w-[min(92%,560px)] flex flex-col items-end gap-1.5">
                        {m.imageUrl && (
                          <img
                            src={m.imageUrl}
                            alt="attached"
                            className="max-w-full max-h-64 rounded-2xl rounded-br-md border border-ink/[0.08] object-cover shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                          />
                        )}
                        <InlineEditor
                          initial={m.text}
                          busy={sending}
                          hint="this undoes every answer after it."
                          saveLabel="Save & ask again"
                          className="rounded-2xl rounded-br-md chat-bubble-you font-serif text-[0.92rem] leading-relaxed px-4 py-2.5"
                          onSave={(text) => void saveEdit(text)}
                          onCancel={cancelEdit}
                        />
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="group flex justify-end items-end gap-1">
                      <MessageActions
                        actions={[
                          ...(m.text
                            ? [
                              { key: "copy", label: "Copy", icon: CopyIcon, fn: () => void copyTurn(m) },
                              { key: "edit", label: "Edit", icon: EditIcon, fn: () => startEdit(m) },
                            ]
                            : []),
                          { key: "share", label: "Share", icon: ShareIcon, fn: () => void shareTurn(m) },
                        ]}
                      />
                      <div className="max-w-[80%] sm:max-w-[72%] flex flex-col items-end gap-1.5">
                        {m.imageUrl && (
                          <img
                            src={m.imageUrl}
                            alt="attached"
                            className="max-w-full max-h-64 rounded-2xl rounded-br-md border border-ink/[0.08] object-cover shadow-[0_2px_10px_-2px_rgba(0,0,0,0.18)]"
                          />
                        )}
                        {m.text && (
                          <div className="text-left rounded-2xl rounded-br-md chat-bubble-you font-serif text-[0.93rem] leading-[1.65] px-4 py-2.5 whitespace-pre-wrap break-words">
                            {m.text}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                ) : m.kind === "assistant" ? (
                  <div key={m.id} className="group flex items-start gap-3">
                    <AssistantMark />
                    <div className="min-w-0 flex-1">
                      {m.imageUrl && (
                        <a
                          href={m.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block mb-2 w-fit"
                        >
                          <img
                            src={m.imageUrl}
                            alt={m.imageAlt || "generated image"}
                            className="max-w-full max-h-80 rounded-2xl rounded-tl-md border border-ink/[0.08] object-cover shadow-[0_2px_10px_-2px_rgba(0,0,0,0.18)]"
                          />
                        </a>
                      )}
                      {m.imageAlt && (
                        <p className="font-caveat text-muted/80 text-[0.85rem] mb-2 -mt-1">
                          {m.imageAlt}
                        </p>
                      )}
                      {m.text && <Markdown text={m.text} />}
                      {m.document && (
                        <DocumentCard
                          doc={m.document}
                          busy={openingDocId === m.document.id}
                          onOpen={() => void openDocument(m.document!, "open")}
                          onSave={() => void openDocument(m.document!, "save")}
                        />
                      )}
                      {!sending && (
                        <div className="-ml-1.5 mt-1.5">
                          <MessageActions
                            actions={[
                              { key: "copy", label: "Copy", icon: CopyIcon, fn: () => void copyTurn(m) },
                              { key: "retry", label: "Ask again", icon: RetryIcon, fn: () => void retryTurn(m.id) },
                              ...(m.text.trim()
                                ? [
                                  {
                                    key: "pdf",
                                    label: savingPdfId === m.id ? "Saving PDF…" : "Download PDF",
                                    icon: PdfIcon,
                                    fn: () => void downloadTurn(m),
                                  },
                                ]
                                : []),
                              { key: "share", label: "Share", icon: ShareIcon, fn: () => void shareTurn(m) },
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex items-start gap-3">
                    <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-[#b0842f]/12 border border-[#b0842f]/30 flex items-center justify-center text-[#b0842f] text-[0.8rem]">
                      ◌
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl border border-[#b0842f]/25 bg-[#b0842f]/[0.07] px-3.5 py-2.5 font-serif  text-[0.88rem] leading-relaxed text-ink-soft whitespace-pre-wrap break-words">
                      {m.text}
                    </div>
                  </div>
                )
              )}

              {sending && (
                <div className="flex items-start gap-3">
                  <AssistantMark pulsing />
                  <span className="flex gap-1.5 pt-3">
                    <span className="h-2 w-2 rounded-full bg-rust/45 animate-bounce [animation-delay:-0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-rust/45 animate-bounce [animation-delay:-0.1s]" />
                    <span className="h-2 w-2 rounded-full bg-rust/45 animate-bounce" />
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-[#b0842f]/12 border border-[#b0842f]/30 flex items-center justify-center text-[#b0842f] text-[0.8rem]">
                    !
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-[#b0842f]/35 bg-[#b0842f]/[0.07] px-3.5 py-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="font-serif  text-ink-soft text-[0.86rem]">
                      {error}
                    </span>
                    <button
                      type="button"
                      onClick={retryLast}
                      disabled={!canRetry}
                      className="font-serif font-semibold text-[0.82rem] text-rust hover:text-rust-hover cursor-pointer disabled:opacity-50 disabled:cursor-default transition"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-2" />
          </div>
        ) : (
          children
        )}
      </div>

      <div className={`relative shrink-0 w-full max-w-[760px] mx-auto pt-2 pb-1 ${GUTTER}`}>
        {hasConversation && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-[linear-gradient(to_bottom,transparent,var(--app-grad-base))]"
          />
        )}
        {!hasConversation && (
          <p className="flex items-center gap-1.5 font-caveat  text-muted text-[0.8rem] mb-1.5 px-2">
            <SparkIcon className="h-3.5 w-3.5 text-rust/80" />
            write to Private Aile to think something through. not a character, and not in a hurry.
          </p>
        )}

        {imagePreview && (
          <div className="mb-2 pl-2">
            <div className="relative inline-block">
              <div className="rounded-2xl bg-cream-light border border-hairline p-1 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.18)]">
                <img
                  src={imagePreview}
                  alt="attachment preview"
                  className="h-16 w-16 rounded-xl object-cover"
                />
              </div>
              <button
                type="button"
                aria-label="Remove image"
                onClick={clearImage}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-ink text-cream-light flex items-center justify-center shadow-md hover:bg-rust active:scale-90 transition-all duration-200 cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="relative group">
          <div className="relative flex items-center gap-2 rounded-full bg-cream-light border border-hairline focus-within:border-rust/40 transition-colors px-3 py-2 shadow-[0_8px_24px_-18px_rgba(22,32,43,0.6)]">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickImage}
              className="hidden"
            />
            <button
              type="button"
              aria-label="Attach an image"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 rounded-full border border-ink/12 bg-ink/[0.03] text-ink-soft hover:bg-rust/10 hover:border-rust/30 hover:text-rust flex items-center justify-center shrink-0 active:scale-90 transition-all duration-200 cursor-pointer"
            >
              <AttachIcon />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={onInput}
              onKeyDown={onKeyDown}
              placeholder="What's on your mind?"
              className="composer-field flex-1 resize-none bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none shadow-none font-serif text-[0.92rem] text-ink placeholder:text-ink-soft/55 py-1.5 px-2 leading-relaxed max-h-[132px] no-scrollbar"
            />
            <button
              type="button"
              aria-label="Send"
              onClick={() => void send(input)}
              disabled={!canSend}
              className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 ${canSend
                ? "chat-accent cursor-pointer"
                : "bg-transparent border border-rust/30 text-rust/50 cursor-default"
                }`}
            >
              {sending ? (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-rust/30 border-t-rust animate-spin" />
              ) : (
                <SendIcon />
              )}
            </button>
          </div>
        </div>

      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] rounded-full bg-ink text-cream-soft font-serif text-[0.82rem] px-4 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// Client-side downscale to 1024px, re-encoded as JPEG, to keep uploads and the
// stored preview small. Returns the data-URL for the bubble and the Blob to post.
async function prepareImage(file: File): Promise<{ dataUrl: string; blob: Blob }> {
  const src = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode failed"));
    i.src = src;
  });

  const maxDim = 1024;
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > maxDim || h > maxDim) {
    const scale = Math.min(maxDim / w, maxDim / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: src, blob: file };
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85)
  );
  return { dataUrl, blob };
}

function AttachIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.05rem] w-[1.05rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10.6 17a1.6 1.6 0 0 1-2.3-2.3l7.4-7.4" />
    </svg>
  );
}

/** Human-readable size for the document card ("48 KB"). */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The attachment the assistant produced, shown under its reply. Tapping the
 * card opens the PDF; the Save button downloads it. Both go through the
 * service, because the document route needs an auth header.
 */
function DocumentCard({
  doc,
  busy,
  onOpen,
  onSave,
}: {
  doc: AttachedTurnDocument;
  busy: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  const size = formatBytes(doc.bytes);
  return (
    <div className="mt-3 flex items-center gap-3 max-w-[420px] rounded-xl border border-ink/[0.1] bg-ink/[0.03] px-3 py-2.5">
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60 cursor-pointer"
        title="Open the PDF"
      >
        <span className="shrink-0 h-9 w-9 rounded-lg bg-rust/12 border border-rust/25 flex items-center justify-center text-rust">
          <PdfIcon />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-[0.9rem] text-ink">
            {doc.title || doc.filename}
          </span>
          <span className="block font-caveat text-[0.78rem] text-muted/80">
            {busy ? "opening…" : ["PDF", size].filter(Boolean).join(" · ")}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className="shrink-0 rounded-full px-3 py-1 font-serif text-[0.8rem] text-rust hover:bg-rust/10 disabled:opacity-60 transition cursor-pointer"
      >
        Save
      </button>
    </div>
  );
}

function NewChatIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V11" />
      <path d="M18.4 3.1a1.9 1.9 0 0 1 2.7 2.7L12.8 14 9 15l1-3.8 8.4-8.1z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[1.05rem] w-[1.05rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h13M12 5l7 7-7 7" />
    </svg>
  );
}

function AssistantMark({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-rust/15 to-rust/5 border border-rust/25 flex items-center justify-center text-rust ${pulsing ? "animate-pulse" : ""
        }`}
    >
      <SparkIcon className="h-3.5 w-3.5" />
    </span>
  );
}

function SparkIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15.5l-1.6-4.9L5.5 9l4.9-1.1L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
