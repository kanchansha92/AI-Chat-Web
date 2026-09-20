// sessionStorage, not localStorage: it survives F5 and route changes but dies
// with the tab, which is exactly what "fresh visit" means here.

const VISIT_KEY = "ember_visit_started";

let cached: boolean | null = null;

/**
 * Cached because the first call writes the key - without this, StrictMode's
 * double-run of the boot effect would get "fresh" then "not fresh". Defaults to
 * fresh if sessionStorage throws (private mode).
 */
export function isFreshVisit(): boolean {
  if (cached !== null) return cached;
  try {
    const seen = sessionStorage.getItem(VISIT_KEY);
    sessionStorage.setItem(VISIT_KEY, "1");
    cached = seen === null;
  } catch {
    cached = true;
  }
  return cached;
}
