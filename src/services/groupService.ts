import { request, authHeader } from "./authService";
import {
  ATTACHMENT_MAX,
  type Attachment,
  type ChatUsage,
  type Memory,
  type Moderation,
} from "./chatService";

// Shapes match controllers/group.js + lib/serialize.js.

/** Must stay in sync with ALLOWED_TONES on the server. */
export const GROUP_TONES = ["warm", "dry", "playful", "quiet", "curious", "sharp"] as const;

/**
 * Top-level fields are the effective values; `overrides` marks what this room
 * pinned (null = inherited) and `original` is what a reset restores.
 */
export interface GroupMember {
  characterId: string;
  order: number;
  name: string | null;
  colour: string | null;
  // Always inherited: a room can rename or re-tint a seat but not reface it,
  // which is why there's no overrides.avatar.
  avatar: string | null;
  quickLine: string;
  tones: string[];
  overrides: {
    name: string | null;
    colour: string | null;
    quickLine: string | null;
    tones: string[] | null;
  };
  original: {
    name: string | null;
    colour: string | null;
    avatar: string | null;
    quickLine: string;
    tones: string[];
  };
}

/** Send only what changed. `null` clears one override, `reset: true` clears all. */
export interface MemberOverrideInput {
  name?: string | null;
  colour?: string | null;
  quickLine?: string | null;
  tones?: string[] | null;
  reset?: boolean;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  sender: "you" | "them";
  senderCharacterId: string | null;
  senderName: string | null;
  senderColour: string | null;
  text: string;
  // Set when a character line carries a generated picture (lib/image.js).
  // Withheld on blocked lines, like the text.
  imageUrl?: string | null;
  imageAlt?: string | null;
  // Photos / files you shared with your own line. Empty on character lines.
  attachments?: Attachment[];
  blocked: boolean;
  // Present only on a blocked line: the §12.2 pause built server-side from the
  // reason that actually stopped it.
  moderation?: Moderation;
  createdAt: string;
}

/** A room without its transcript, as the list endpoint returns it. */
export interface GroupSummary {
  id: string;
  name: string;
  backstory: string;
  scene: string;
  members: GroupMember[];
  messageCount: number;
  lastPreview: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  backstory: string;
  scene: string;
  members: GroupMember[];
  messages: GroupMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NewGroupInput {
  characterIds: string[];
  order?: string[];
  backstory?: string;
  scene?: string;
  name?: string;
}

export interface GroupSendResult {
  /** What this send cost in credits, and what is left. Server-computed. */
  credits?: { charged: number; balance: number };
  userMessage?: GroupMessage;
  reply?: GroupMessage;
  speaker?: { characterId: string; name: string; colour: string | null };
  /** Facts the room learned from this message - every member learns them. */
  learned?: Memory[];
  /** There was something to remember and a member's cap left no room. */
  memoryFull?: boolean;
  /** Shared with 1:1 chat: one daily allowance across both surfaces. */
  usage?: ChatUsage;
  moderation?: Moderation;
}

export interface GroupRegenerateResult {
  reply: GroupMessage;
  speaker?: { characterId: string; name: string; colour: string | null };
  moderation?: Moderation;
}

export interface GroupSendOptions {
  /** Pins who replies; omit it and the room picks. */
  speaker?: string;
  /** Force a picture in the reply, even if the words alone wouldn't ask for one. */
  imagine?: boolean;
  /** Up to ATTACHMENT_MAX photos / files; text may be empty when present. */
  files?: File[];
}

/** One page of a room's transcript, plus the room itself. */
export interface GroupPage {
  group: Group;
  messages: GroupMessage[];
  hasMore: boolean;
  cursor: string | null;
  usage: ChatUsage;
}

/** What `update` accepts. Omit a field to leave it; `""` clears scene/backstory. */
export interface RoomPatch {
  name?: string;
  scene?: string;
  backstory?: string;
}

export const groupService = {
  /** Newest activity first. */
  list(): Promise<{ groups: GroupSummary[] }> {
    return request(`/groups`, { headers: authHeader() });
  },

  /** `name` is optional - blank means the server generates the title. */
  create(input: NewGroupInput): Promise<{ group: Group }> {
    return request(`/groups`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(input),
    });
  },

  /**
   * The room plus the newest page of its transcript. Pass `before` (a cursor
   * from a previous page) to walk backwards - a room writes two rows per turn,
   * so the whole transcript is no longer sent on open.
   */
  get(id: string, opts: { before?: string | null; limit?: number } = {}): Promise<GroupPage> {
    const params = new URLSearchParams();
    if (opts.before) params.set("before", opts.before);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request(`/groups/${id}${qs ? `?${qs}` : ""}`, { headers: authHeader() });
  },

  /**
   * Resolves with { moderation } on an input pause - nothing was saved, so
   * keep the draft. With files the body goes multipart (`files`, up to 4),
   * the same shape as the 1:1 chat composer.
   */
  send(id: string, text: string, opts: GroupSendOptions = {}): Promise<GroupSendResult> {
    const { speaker, imagine = false, files = [] } = opts;
    if (files.length > 0) {
      const form = new FormData();
      form.append("text", text ?? "");
      if (speaker) form.append("speaker", speaker);
      if (imagine) form.append("imagine", "true");
      for (const f of files.slice(0, ATTACHMENT_MAX)) form.append("files", f, f.name);
      return request(`/groups/${id}/messages`, {
        method: "POST",
        headers: authHeader(), // request() omits Content-Type for FormData bodies
        body: form,
      });
    }
    return request(`/groups/${id}/messages`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({
        text,
        ...(speaker ? { speaker } : {}),
        ...(imagine ? { imagine: true } : {}),
      }),
    });
  },

  /** A fresh take on one character line - "imagine again" for a picture. */
  regenerate(id: string, messageId: string, nonce?: number): Promise<GroupRegenerateResult> {
    return request(`/groups/${id}/messages/${messageId}/regenerate`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(nonce === undefined ? {} : { nonce }),
    });
  },

  /**
   * Name, scene and backstory. Send only what changed; `""` clears scene or
   * backstory. All three used to be write-once - the server hardcoded `name`,
   * so a new scene answered "— nothing to change yet."
   */
  update(id: string, patch: RoomPatch): Promise<{ group: Group }> {
    return request(`/groups/${id}`, {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(patch),
    });
  },

  rename(id: string, name: string): Promise<{ group: Group }> {
    return groupService.update(id, { name });
  },

  /** The cast and its speaking order in one call - ids in speaking order. */
  setMembers(id: string, characterIds: string[]): Promise<{ group: Group; message: string }> {
    return request(`/groups/${id}/members`, {
      method: "PUT",
      headers: authHeader(),
      body: JSON.stringify({ characterIds }),
    });
  },

  addMember(id: string, characterId: string): Promise<{ group: Group; message: string }> {
    return request(`/groups/${id}/members`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({ characterId }),
    });
  },

  /** Refused at two members - §6.10 says a room is 2 to 5. */
  removeMember(id: string, characterId: string): Promise<{ group: Group; message: string }> {
    return request(`/groups/${id}/members/${characterId}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },

  /** This line and everything after it, with its files and the facts it taught. */
  deleteFromHere(
    id: string,
    messageId: string
  ): Promise<{ message: string; removed: number; forgotten?: number }> {
    return request(`/groups/${id}/messages/${messageId}`, {
      method: "DELETE",
      headers: authHeader(),
    });
  },

  /** §12.6 - `reason` must be one of the server's ReportReason values. */
  reportMessage(
    id: string,
    messageId: string,
    reason: string,
    note?: string
  ): Promise<{ reported: boolean; message: string }> {
    return request(`/groups/${id}/messages/${messageId}/report`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify(note ? { reason, note } : { reason }),
    });
  },

  /**
   * Scoped to this room's seat only - it never touches the character itself or
   * the same character's seat in another group.
   */
  updateMember(
    id: string,
    characterId: string,
    input: MemberOverrideInput
  ): Promise<{ group: Group }> {
    return request(`/groups/${id}/members/${characterId}`, {
      method: "PATCH",
      headers: authHeader(),
      body: JSON.stringify(input),
    });
  },

  remove(id: string): Promise<{ message: string }> {
    return request(`/groups/${id}`, { method: "DELETE", headers: authHeader() });
  },
};
