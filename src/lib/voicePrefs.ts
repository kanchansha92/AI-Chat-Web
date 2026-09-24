import { useCallback, useSyncExternalStore } from "react";
import { VOICE_PREMIUM_STORAGE_KEY } from "./storageKeys";

// One preference, shared by every speak button on the page: read replies in the
// premium voice or the ordinary one. It is remembered per device and means
// only "ask for the premium voice" - the server decides whether that voice
// exists, what it costs and whether the credit can be spent.

let premium = read();
const listeners = new Set<(v: boolean) => void>();

function read(): boolean {
  try {
    return localStorage.getItem(VOICE_PREMIUM_STORAGE_KEY) === "1";
  } catch {
    // private mode, or no storage at all - the preference just does not stick
    return false;
  }
}

export function getPremiumVoice(): boolean {
  return premium;
}

export function setPremiumVoice(next: boolean): void {
  premium = next;
  try {
    if (next) localStorage.setItem(VOICE_PREMIUM_STORAGE_KEY, "1");
    else localStorage.removeItem(VOICE_PREMIUM_STORAGE_KEY);
  } catch {
    /* nothing to do - it simply won't be remembered next time */
  }
  for (const fn of listeners) fn(next);
}

/** `[on, setOn]` for the toggle, and a live value for every speak button. */
export function usePremiumVoice(): [boolean, (next: boolean) => void] {
  const subscribe = useCallback((notify: () => void) => {
    const fn = () => notify();
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  const value = useSyncExternalStore(subscribe, getPremiumVoice, getPremiumVoice);
  return [value, setPremiumVoice];
}
