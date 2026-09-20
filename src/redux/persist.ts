// localStorage persistence for the client-only slices (general chats, sidebar
// pins). Same `{ state, version }` envelope and same keys the old zustand
// persist middleware used, so saved data carries over with no migration.

import type { Store } from "@reduxjs/toolkit";
import type { RootState } from "./store";
import {
  GENERAL_CHATS_STORAGE_KEY,
  type GeneralChatsState,
} from "./generalChatsSlice";
import { PINS_STORAGE_KEY } from "./pinsSlice";

/** Accepts both the `{ state, version }` envelope and a bare object. */
export function loadPersisted<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "state" in parsed) {
      return parsed.state as T;
    }
    return parsed as T;
  } catch {
    // Corrupt JSON or storage unavailable - start fresh rather than crash.
    return undefined;
  }
}

function save(key: string, state: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify({ state, version: 0 }));
    return true;
  } catch {
    // Quota exceeded or private mode; persisting is best-effort.
    return false;
  }
}

// An image reference small enough to keep in localStorage. A generated image
// from the provider is an ordinary https URL - a couple of hundred bytes, and
// the whole point of a saved chat is that the picture is still there when you
// come back. An uploaded attachment is an inline data: URL running to megabytes,
// which is what would actually exhaust the 5MB quota. So the rule is size, not
// scheme: keep the reference when it's cheap, drop it when it isn't.
const MAX_PERSISTED_IMAGE_URL = 4096;

function isCheapImageUrl(url: string | undefined): url is string {
  return !!url && url.length <= MAX_PERSISTED_IMAGE_URL;
}

/**
 * Persists the transcript, keeping short image URLs (generated pictures) and
 * dropping oversized inline data-URLs (uploads), which stay in memory only.
 * `dropAllImages` is the retry path when a save is refused for quota.
 */
function partializeGeneralChats(state: GeneralChatsState, dropAllImages = false) {
  return {
    sessions: state.sessions.map((s) => ({
      ...s,
      messages: s.messages.map((turn) => {
        if (!turn.imageUrl) return turn;
        if (!dropAllImages && isCheapImageUrl(turn.imageUrl)) return turn;
        // Drop the caption alongside the picture - a caption with no image
        // above it reads as a bug.
        const copy = { ...turn };
        delete copy.imageUrl;
        delete copy.imageAlt;
        return copy;
      }),
    })),
    currentId: state.currentId,
  };
}

/** Call once, right after configureStore. */
export function setupPersistence(store: Store<RootState>) {
  let prevGeneralChats = store.getState().generalChats;
  let prevPins = store.getState().pins;

  store.subscribe(() => {
    const { generalChats, pins } = store.getState();

    if (generalChats !== prevGeneralChats) {
      prevGeneralChats = generalChats;
      // If the browser refuses the write (quota), retry without any images
      // rather than silently giving up on persisting the conversation itself.
      if (!save(GENERAL_CHATS_STORAGE_KEY, partializeGeneralChats(generalChats))) {
        save(GENERAL_CHATS_STORAGE_KEY, partializeGeneralChats(generalChats, true));
      }
    }
    if (pins !== prevPins) {
      prevPins = pins;
      save(PINS_STORAGE_KEY, pins);
    }
  });
}
