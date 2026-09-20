// A pub/sub bus so the fetch layer can trigger app-wide UI without importing
// React or the router. NetworkHost subscribes and does the actual rendering.

export type NetEvent =
  | { type: "toast"; message: string }
  | { type: "redirect"; to: string }
  // The server answered 401: the session is over. The fetch layer has already
  // cleared browser storage; store.ts listens for this and empties the slices
  // holding the signed-out person's content.
  | { type: "signedOut" };

type Listener = (e: NetEvent) => void;

const listeners = new Set<Listener>();

export function onNetEvent(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitNetEvent(e: NetEvent): void {
  for (const fn of listeners) {
    try {
      fn(e);
    } catch {
      /* a broken listener must not take down the request that emitted this */
    }
  }
}
