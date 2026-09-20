// Every localStorage key the app owns, in one place.
//
// They used to be scattered - the token in services/authService, the chat and
// pin keys in their slices - and the consequence was that signing out cleared
// only the token. The previous user's entire general-chat transcripts and pins
// stayed in localStorage AND in the Redux store, so the next person to sign in
// on the same machine saw them in the "Recent" rail and in the search index.
//
// Listing them together makes "what belongs to the signed-in person" a single
// answer, and gives the fetch layer something it can clear without importing a
// slice (which would be a cycle: the slices import the fetch layer).

/** The session JWT. */
export const TOKEN_STORAGE_KEY = "ember_token";

/** Saved "ask anything" transcripts. Unchanged from the old zustand store. */
export const GENERAL_CHATS_STORAGE_KEY = "ember_general_chats_v1";

/** Sidebar pins. Unchanged from the old zustand store. */
export const PINS_STORAGE_KEY = "ember_sidebar_pins_v1";

/**
 * Keys holding one person's content. Cleared whenever a session ends, however
 * it ends - an explicit sign-out, or a 401 telling us the session is over.
 * The token is separate because it is cleared through setToken().
 */
export const SESSION_SCOPED_STORAGE_KEYS = [
  GENERAL_CHATS_STORAGE_KEY,
  PINS_STORAGE_KEY,
] as const;

/** Best-effort: storage throws in private mode and is unavailable in tests. */
export function clearSessionScopedStorage(): void {
  for (const key of SESSION_SCOPED_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* nothing useful to do - the in-memory reset still happens */
    }
  }
}
