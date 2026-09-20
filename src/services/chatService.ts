import { request, requestFile, saveBlob, authHeader } from "./authService";

// Shapes match controllers/chat.js + lib/serialize.js. `sender` arrives as the
// UI's own words; the server never sends the Prisma enum or a blocked reply's text.

/** A photo or file the user shared with a message (lib/attachments.js). */
export interface Attachment {
  id: string;
  kind: "image" | "file";
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ChatMessage {
  id: string;
  characterId: string;
  sender: "you" | "them";
  text: string;
  // Set when a reply carries a generated image - currently a data-URI from the
  // stand-in generator. Withheld on blocked replies, like the text.
  imageUrl?: string | null;
  imageAlt?: string | null;
  // Photos / files the user attached to their own message. Empty on replies.
  attachments?: Attachment[];
  blocked: boolean;
  // Present only on a blocked reply: the §12.2 pause that belongs to THIS
  // message, built server-side from the reason that actually stopped it. Tapping
  // a blocked bubble shows this rather than a guess.
  moderation?: Moderation;
  createdAt: string;
}

/** What the character-chat composer accepts (mirrors the server's list). */
export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.md,.csv,.json,image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/json";
export const ATTACHMENT_MAX = 4;
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export interface Memory {
  id: string;
  characterId: string;
  fact: string;
  learnedAt: string;
}

/** Free-tier daily usage. Paid plans always come back with unlimited=true. */
export interface ChatUsage {
  plan: "FREE" | "PLUS" | "PRO";
  unlimited: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  resetAt: string | null;
  reached: boolean;
}

/** A crisis resource the pause offers, when it has one to offer. */
export interface Helpline {
  name: string;
  tel: string;
  hours?: string;
  region?: string;
}

export interface Moderation {
  stage: "input" | "output";
  // "other" is a block the classifier couldn't label - it still blocks.
  reason: "nsfw" | "realPerson" | "selfHarm" | "illegal" | "other" | string;
  headline: string;
  body: string;
  primary: string;
  secondary: string;
  tertiary: string;
  // What the secondary and tertiary buttons DO, sent alongside what they say.
  // The client used to read the labels to work this out, so a copy edit could
  // silently change behaviour - including breaking the helpline link.
  secondaryAction?: "policy" | "helpline" | string;
  tertiaryAction?: "discardDraft" | "close" | string;
  helpline?: Helpline;
}

export interface ChatCharacter {
  id: string;
  name: string;
  colour?: string;
  avatar?: string | null;
  tones?: string[];
}

/**
 * What the server charged for this send, when it charged anything (a premium
 * reply past the day's allowance, a chosen model, an image past the month's).
 * `balance` is authoritative - the client never works one out.
 */
export interface CreditsCharged {
  charged: number;
  balance: number;
}

export interface SendResult {
  userMessage?: ChatMessage;
  reply?: ChatMessage;
  learned?: Memory[];
  /** There was something to remember and the per-character cap left no room. */
  memoryFull?: boolean;
  usage?: ChatUsage;
  credits?: CreditsCharged;
  moderation?: Moderation;
}

export interface RegenerateResult {
  reply: ChatMessage;
  usage?: ChatUsage;
  credits?: CreditsCharged;
  moderation?: Moderation;
}

// The dashboard "ask anything" bar: a chat not tied to any character. Nothing is
// persisted server-side, so the client keeps the transcript and echoes it back
// as `history` to hold context.

export interface AssistantTurn {
  role: "user" | "assistant";
  text: string;
}

/**
 * A PDF the assistant attached to its reply, having decided the user wanted a
 * file (the server's `save_as_pdf` tool). `url` is an API path, not a public
 * link - fetching it needs the caller's token, and only its owner can read it.
 */
export interface AttachedDocument {
  id: string;
  url: string;
  title: string;
  filename: string;
  bytes: number;
}

export interface AskResult {
  // `blocked` means output moderation withheld the reply: text (and any
  // image) is empty and `moderation` carries the pause to show instead.
  reply?: {
    text: string;
    // Set when the message asked for a picture ("generate the image",
    // "draw…", or the `imagine` toggle) - a generated image + soft caption,
    // same shape as the character chat's image replies.
    imageUrl?: string | null;
    imageAlt?: string | null;
    blocked: boolean;
    // Set when the assistant attached a generated PDF to this reply.
    document?: AttachedDocument | null;
  };
  moderation?: Moderation;
}

/** The outcome of a PDF export (see `chatService.downloadPdf`). */
export interface PdfExportResult {
  /** True once the file has been handed to the browser as a download. */
  saved: boolean;
  /** The saved filename - present when `saved` is true. */
  filename?: string;
  /** The pause to show instead - present when the document was withheld. */
  moderation?: Moderation;
}

/** One page of a thread. `messages` is oldest-first within the page. */
export interface ThreadPage {
  character: ChatCharacter;
  messages: ChatMessage[];
  /** True when there are older messages above this page. */
  hasMore: boolean;
  /** The oldest message's timestamp - pass it back as `before` for the page above. */
  cursor: string | null;
  usage: ChatUsage;
}

/**
 * The paid extras a send can ask for. All of them are REQUESTS, not
 * decisions: the server checks the plan, the daily allowance and the credit
 * balance, and answers PLAN_FEATURE / PLAN_LIMIT / CREDITS_REQUIRED when the
 * answer is no. Nothing here unlocks anything.
 *
 *   premium          use a premium reply
 *   premiumOverflow  ...and spend a credit if the daily allowance is gone
 *   modelId          a model from GET /api/models (always costs credits)
 *   storyId          which thread of a character this belongs to
 */
export interface SendOptions {
  premium?: boolean;
  premiumOverflow?: boolean;
  modelId?: string | null;
  storyId?: string | null;
}

function sendExtras(opts: SendOptions): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  if (opts.premium) out.premium = true;
  if (opts.premium && opts.premiumOverflow) out.premiumOverflow = true;
  if (opts.modelId) out.modelId = opts.modelId;
  if (opts.storyId) out.storyId = opts.storyId;
  return out;
}

export const chatService = {
  /**
   * The newest page of the thread (oldest-first within the page), plus the
   * caller's current Free usage.
   *
   * The server caps this: a long conversation carries every generated image
   * with it, so the whole thread is no longer sent on open. Pass `before` (a
   * cursor from a previous page) to walk backwards through older messages.
   */
  listMessages(
    characterId: string,
    opts: { before?: string | null; limit?: number } = {}
  ): Promise<ThreadPage> {
    const params = new URLSearchParams();
    if (opts.before) params.set("before", opts.before);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request(`/chat/${characterId}/messages${qs ? `?${qs}` : ""}`, {
      headers: authHeader(),
    });
  },

  /**
   * Resolves with { moderation } on an input pause - nothing was saved, so keep
   * the draft. Note the daily limit is a *rejection*, not a resolve: an ApiError
   * with code "PLAN_LIMIT" and payload.usage holding the reset time.
   */
  send(
    characterId: string,
    text: string,
    imagine = false,
    files: File[] = [],
    opts: SendOptions = {}
  ): Promise<SendResult> {
    const extras = sendExtras(opts);
    if (files.length > 0) {
      // With files the body goes multipart (`files`, up to 4). Text may be
      // empty - a photo on its own is a message too.
      const form = new FormData();
      form.append("text", text ?? "");
      if (imagine) form.append("imagine", "true");
      // Multipart carries everything as strings; the server reads both shapes.
      for (const [k, v] of Object.entries(extras)) form.append(k, String(v));
      for (const f of files.slice(0, ATTACHMENT_MAX)) form.append("files", f, f.name);
      return request(`/chat/${characterId}/messages`, {
        method: "POST",
        headers: authHeader(), // request() omits Content-Type for FormData bodies
        body: form,
      });
    }
    return request(`/chat/${characterId}/messages`, {
      method: "POST",
      headers: authHeader(),
      // Omitted when unset so a plain send keeps its original body shape.
      body: JSON.stringify({ text, ...(imagine ? { imagine: true } : {}), ...extras }),
    });
  },

  /**
   * `history` is oldest-first. Multipart so an attached image can ride along.
   * `imagine`, when true, forces an image reply even if the words alone
   * wouldn't trigger one (mirrors the character composer's toggle).
   */
  ask(
    text: string,
    history: AssistantTurn[] = [],
    image?: Blob | null,
    imagine = false,
    opts: SendOptions = {}
  ): Promise<AskResult> {
    const form = new FormData();
    form.append("text", text ?? "");
    form.append("history", JSON.stringify(history));
    if (image) form.append("image", image, "upload.jpg");
    if (imagine) form.append("imagine", "true");
    for (const [k, v] of Object.entries(sendExtras(opts))) form.append(k, String(v));
    return request(`/chat/ask`, {
      method: "POST",
      headers: authHeader(), // request() omits Content-Type for FormData bodies
      body: form,
    });
  },

  regenerate(messageId: string, nonce?: number, opts: SendOptions = {}): Promise<RegenerateResult> {
    return request(`/chat/messages/${messageId}/regenerate`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ ...(nonce === undefined ? {} : { nonce }), ...sendExtras(opts) }),
    });
  },

  /** Edit your own message and regenerate from it. Drops everything after it. */
  editMessage(messageId: string, text: string): Promise<SendResult> {
    return request(`/chat/messages/${messageId}`, {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify({ text }),
    });
  },

  /** Removes this message and every one after it. */
  deleteFromHere(
    messageId: string
  ): Promise<{ message: string; removed: number; forgotten?: number }> {
    return request(`/chat/messages/${messageId}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },

  /** Newest first. */
  listMemories(
    characterId: string
  ): Promise<{ character: ChatCharacter; memories: Memory[] }> {
    return request(`/chat/${characterId}/memories`, { headers: authHeader() });
  },

  forget(memoryId: string): Promise<{ message: string }> {
    return request(`/chat/memories/${memoryId}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },

  usage(): Promise<{ usage: ChatUsage }> {
    return request(`/chat/usage`, { headers: authHeader() });
  },

  /**
   * Fetch a PDF the assistant attached and hand it to the browser.
   *
   * It has to go through fetch rather than an `<a href>`: the document route is
   * owner-scoped and needs the Authorization header, which a plain link can't
   * send. `open` shows it in a new tab instead of saving it.
   */
  async openDocument(
    doc: Pick<AttachedDocument, "url" | "filename">,
    mode: "save" | "open" = "save"
  ): Promise<boolean> {
    const res = await requestFile(doc.url.replace(/^\/api/, ""), {
      headers: authHeader(),
    });
    if (res.kind !== "file") return false;
    if (mode === "open") {
      const url = URL.createObjectURL(res.blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return true;
    }
    saveBlob(res.blob, res.filename || doc.filename || "document.pdf");
    return true;
  },

  /**
   * Turn a reply into a PDF and save it. The text is posted back to the server
   * (general chat is stateless, so there's no message id to reference) and the
   * finished document comes straight back as a download.
   *
   * `saved` is true when the file reached the browser; `moderation` is set
   * instead when the server withheld the document.
   *
   * One flat shape rather than a `{saved:true}|{saved:false}` union on purpose:
   * a union needs the caller to narrow before touching `filename` or
   * `moderation`, and editors don't all narrow a boolean discriminant the same
   * way - which showed up as a phantom "Property 'moderation' does not exist"
   * in the editor while `tsc` on the command line was perfectly happy. Both
   * fields optional on one object costs a little precision and removes a whole
   * class of confusion.
   */
  async downloadPdf(content: string, title?: string): Promise<PdfExportResult> {
    const res = await requestFile(`/chat/export/pdf`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(title ? { content, title } : { content }),
    });

    if (res.kind === "json") {
      const data = res.data as { moderation?: Moderation };
      return { saved: false, moderation: data?.moderation };
    }

    const filename = res.filename || "document.pdf";
    saveBlob(res.blob, filename);
    return { saved: true, filename };
  },

  /** `reason` must be one of the server's ReportReason values. */
  reportMessage(
    messageId: string,
    reason: string,
    note?: string
  ): Promise<{ reported: boolean; message: string }> {
    return request(`/chat/messages/${messageId}/report`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(note ? { reason, note } : { reason }),
    });
  },
};
