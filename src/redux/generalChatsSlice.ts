import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loadPersisted } from "./persist";
import { sessionEnded } from "./sessionEnded";
import { GENERAL_CHATS_STORAGE_KEY as SHARED_GENERAL_CHATS_KEY } from "../lib/storageKeys";

// Saved sessions for the dashboard "ask anything" assistant (brief §6.14) -
// the general helper, not a character, so it's kept apart from the character
// threads. Persisted to localStorage by persist.ts; no backend involved.

export type ChatRole = "user" | "assistant" | "note";

export interface ChatTurn {
  id: string;
  kind: ChatRole;
  text: string;
  // For a "user" turn: the attached image preview (data-URL, downscaled
  // client-side). For an "assistant" turn: a generated image reply. Memory
  // only - stripped from the persisted copy so images can't blow the
  // localStorage quota (see persist.ts).
  imageUrl?: string;
  // The soft caption under a generated (assistant) image.
  imageAlt?: string;
  // A PDF the assistant attached to this reply. Small (an id, a title, a
  // path), so unlike an image it persists to localStorage intact - and the
  // file itself lives on the server, so a saved chat can still open it later.
  document?: AttachedTurnDocument;
}

/** The stored shape of an attached PDF - mirrors the server's document handle. */
export interface AttachedTurnDocument {
  id: string;
  url: string;
  title: string;
  filename: string;
  bytes: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatTurn[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}

let __seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(__seq++).toString(36)}`;

const DEFAULT_TITLE = "New chat";

/** A short, stable title taken from the first thing the user asked. */
function titleFrom(messages: ChatTurn[]): string {
  const firstUser = messages.find((m) => m.kind === "user");
  const raw = (firstUser?.text ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return firstUser?.imageUrl ? "Image" : DEFAULT_TITLE;
  return raw.length > 42 ? `${raw.slice(0, 42).trimEnd()}…` : raw;
}

export interface GeneralChatsState {
  sessions: ChatSession[];
  currentId: string | null;
}

/** localStorage key - unchanged from the old zustand store, so saved chats
 * carry over without a migration. */
export const GENERAL_CHATS_STORAGE_KEY = SHARED_GENERAL_CHATS_KEY;

const initialState: GeneralChatsState = loadPersisted<GeneralChatsState>(
  GENERAL_CHATS_STORAGE_KEY
) ?? {
  sessions: [],
  currentId: null,
};

/**
 * NOT `initialState`: that is read from localStorage when this module is first
 * evaluated, so resetting to it at sign-out would hand the next person the
 * transcripts the sign-out was supposed to remove.
 */
const emptyState: GeneralChatsState = { sessions: [], currentId: null };

/** Applies a new turn list to the open chat. The session is created lazily on
 * the first turn and deleted again if emptied; touched sessions move to top. */
function applyMessages(state: GeneralChatsState, next: ChatTurn[]) {
  const current = state.currentId
    ? state.sessions.find((s) => s.id === state.currentId) ?? null
    : null;

  // Nothing open yet - only create a session if there's something to keep.
  if (!current) {
    if (next.length === 0) return;
    const id = uid("chat");
    const session: ChatSession = {
      id,
      title: titleFrom(next),
      messages: next,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state.sessions.unshift(session);
    state.currentId = id;
    return;
  }

  // Emptied, so drop the session.
  if (next.length === 0) {
    state.sessions = state.sessions.filter((s) => s.id !== current.id);
    state.currentId = null;
    return;
  }

  const updated: ChatSession = {
    ...current,
    messages: next,
    updatedAt: Date.now(),
    // Keep the first-message title once set; only (re)derive a default.
    title:
      current.title && current.title !== DEFAULT_TITLE
        ? current.title
        : titleFrom(next),
  };
  state.sessions = [updated, ...state.sessions.filter((s) => s.id !== current.id)];
  state.currentId = current.id;
}

const generalChatsSlice = createSlice({
  name: "generalChats",
  initialState,
  reducers: {
    /** Clear the open chat and show a fresh, empty composer (nothing saved yet). */
    startNewChat: (state) => {
      state.currentId = null;
    },

    openChat: (state, action: PayloadAction<string>) => {
      state.currentId = action.payload;
    },

    /** Settles which chat is open at boot; dispatched once from App.tsx. A fresh
     * tab starts empty, a reload keeps the open chat, and a currentId pointing at
     * a session that's gone is cleared so the next message starts a real one. */
    bootGeneralChats: (state, action: PayloadAction<{ freshVisit: boolean }>) => {
      if (action.payload.freshVisit) {
        state.currentId = null;
        return;
      }
      const openIsValid =
        !!state.currentId && state.sessions.some((s) => s.id === state.currentId);
      if (!openIsValid) state.currentId = null;
    },

    deleteChat: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      if (state.currentId === action.payload) state.currentId = null;
    },

    /** Give a saved chat a new title (blank input is ignored). */
    renameChat: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const clean = action.payload.title.trim().replace(/\s+/g, " ").slice(0, 80);
      if (!clean) return;
      const session = state.sessions.find((s) => s.id === action.payload.id);
      if (session) session.title = clean;
    },

    togglePin: (state, action: PayloadAction<string>) => {
      const session = state.sessions.find((s) => s.id === action.payload);
      if (session) session.pinned = !session.pinned;
    },

    /**
     * Add a turn to the chat it belongs to.
     *
     * `sessionId` is which chat the caller meant, captured when the request went
     * out. Passing a bare turn means "wherever we are now", which is only safe
     * for a dispatch that happens synchronously with the user's own action.
     *
     * The distinction matters because a reply arrives long after it was asked
     * for, and this reducer used to append to whatever `state.currentId` was at
     * that moment. Clicking "new chat" - or opening a saved one - while the dots
     * were still bouncing put the answer in the wrong place: a brand-new session
     * holding nothing but an assistant turn, or grafted onto an unrelated
     * transcript.
     */
    appendTurn: (
      state,
      action: PayloadAction<ChatTurn | { sessionId: string | null; turn: ChatTurn }>
    ) => {
      const payload = action.payload;
      const scoped = "turn" in payload;
      // The caller named a chat and we have since moved: drop the turn.
      if (scoped && payload.sessionId !== state.currentId) return;
      const turn = scoped ? payload.turn : payload;

      const current = state.currentId
        ? state.sessions.find((s) => s.id === state.currentId)
        : null;
      applyMessages(state, [...(current?.messages ?? []), turn]);
    },

    /** Drop a turn by id (e.g. roll back an optimistic send that failed). */
    removeTurn: (
      state,
      action: PayloadAction<string | { sessionId: string | null; id: string }>
    ) => {
      const payload = action.payload;
      const scoped = typeof payload !== "string";
      // Same guard as appendTurn: rolling back a failed send must not reach into
      // whichever chat the user moved to while it was in flight.
      if (scoped && payload.sessionId !== state.currentId) return;
      const id = scoped ? payload.id : payload;

      const current = state.currentId
        ? state.sessions.find((s) => s.id === state.currentId)
        : null;
      if (!current) return;
      applyMessages(
        state,
        current.messages.filter((m) => m.id !== id)
      );
    },

    /** Cuts the thread at a turn: that turn and everything after it go. What
     * "retry" is built on - later turns answer something that was never said.
     * An id not in the open chat is a no-op. */
    truncateFrom: (state, action: PayloadAction<string>) => {
      const current = state.currentId
        ? state.sessions.find((s) => s.id === state.currentId)
        : null;
      if (!current) return;
      const idx = current.messages.findIndex((m) => m.id === action.payload);
      if (idx < 0) return;
      applyMessages(state, current.messages.slice(0, idx));
    },

    /** Same cut with a replacement turn - what "edit" is built on. Must be one
     * step: truncate-then-append momentarily empties the chat when editing the
     * first question, and an empty chat is a deleted chat (applyMessages). */
    replaceFrom: (state, action: PayloadAction<{ id: string; turn: ChatTurn }>) => {
      const current = state.currentId
        ? state.sessions.find((s) => s.id === state.currentId)
        : null;
      if (!current) return;
      const idx = current.messages.findIndex((m) => m.id === action.payload.id);
      if (idx < 0) return;
      applyMessages(state, [...current.messages.slice(0, idx), action.payload.turn]);
    },
  },
  extraReducers: (builder) => {
    // These transcripts are one person's. They must not survive into the next
    // person's session on a shared machine - the Home "Recent" rail and the
    // command-palette search both read straight out of this slice.
    builder.addCase(sessionEnded, () => emptyState);
  },
});

export const {
  startNewChat,
  openChat,
  bootGeneralChats,
  deleteChat,
  renameChat,
  togglePin,
  appendTurn,
  removeTurn,
  truncateFrom,
  replaceFrom,
} = generalChatsSlice.actions;

export default generalChatsSlice.reducer;

/**
 * Build a fresh turn. Past the first two arguments everything is optional and
 * order-independent, because a turn can now carry an image, a caption, an
 * attached PDF, or any combination - a positional list would be all commas.
 */
export function newTurn(
  kind: ChatRole,
  text: string,
  extra: { imageUrl?: string; imageAlt?: string; document?: AttachedTurnDocument } = {}
): ChatTurn {
  return {
    id: uid("t"),
    kind,
    text,
    ...(extra.imageUrl ? { imageUrl: extra.imageUrl } : {}),
    ...(extra.imageAlt ? { imageAlt: extra.imageAlt } : {}),
    ...(extra.document ? { document: extra.document } : {}),
  };
}
