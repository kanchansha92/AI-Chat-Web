import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { loadPersisted } from "./persist";
import { sessionEnded } from "./sessionEnded";
import { PINS_STORAGE_KEY as SHARED_PINS_KEY } from "../lib/storageKeys";

// Journal threads, characters and groups all live on the server and the API has
// no `pinned` field, so a pin is a local preference kept in localStorage. Keys
// are namespaced ("journal:<id>", "character:<id>", "group:<id>") so ids from
// different collections can't collide.

export type PinKind = "journal" | "character" | "group";

export const pinKey = (kind: PinKind, id: string) => `${kind}:${id}`;

export interface PinsState {
  pinned: Record<string, boolean>;
}

/**
 * localStorage key - unchanged from the old store, so existing pins carry over.
 * Re-exported from lib/storageKeys, which is now the single list of what a
 * sign-out has to clear; every existing importer keeps working.
 */
export const PINS_STORAGE_KEY = SHARED_PINS_KEY;

const initialState: PinsState = loadPersisted<PinsState>(PINS_STORAGE_KEY) ?? {
  pinned: {},
};

/**
 * NOT `initialState` - that is read from localStorage when this module is first
 * evaluated, so resetting to it would restore the very pins the sign-out is
 * meant to remove.
 */
const emptyState: PinsState = { pinned: {} };

const pinsSlice = createSlice({
  name: "pins",
  initialState,
  reducers: {
    togglePin: (state, action: PayloadAction<{ kind: PinKind; id: string }>) => {
      const key = pinKey(action.payload.kind, action.payload.id);
      if (state.pinned[key]) delete state.pinned[key];
      else state.pinned[key] = true;
    },

    /** Drop a pin when the underlying thing is deleted, so it can't linger. */
    clearPin: (state, action: PayloadAction<{ kind: PinKind; id: string }>) => {
      delete state.pinned[pinKey(action.payload.kind, action.payload.id)];
    },
  },
  extraReducers: (builder) => {
    // Pins are one person's preferences. They must not survive into the next
    // person's session on a shared machine.
    builder.addCase(sessionEnded, () => emptyState);
  },
});

export const { togglePin, clearPin } = pinsSlice.actions;
export default pinsSlice.reducer;

/** Pinned first, otherwise the list's own order (which is newest-first). */
export function sortPinned<T extends { id: string }>(
  items: T[],
  kind: PinKind,
  pinned: Record<string, boolean>
): T[] {
  return [...items].sort(
    (a, b) =>
      Number(!!pinned[pinKey(kind, b.id)]) - Number(!!pinned[pinKey(kind, a.id)])
  );
}
