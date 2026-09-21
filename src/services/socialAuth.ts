// Loads each provider SDK on first click and hands back a short-lived provider
// access token, which authService POSTs to the backend to verify.

// Vite reads .env once at startup, so filling it in under a running dev server
// changes nothing - hence the fallbacks. Both values are public by design: a
// Google client ID and a Facebook app ID ship to the browser anyway. (The
// Facebook app *secret* does not, and stays server-side.)
const GOOGLE_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
  "89189424954-tgfs3hg4tsdg82tdovmgitj61l5fji0v.apps.googleusercontent.com";
const FACEBOOK_APP_ID =
  (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined) ||
  "1352433299729937";
// Bump alongside the version selected in the Facebook console.
const FACEBOOK_GRAPH_VERSION = "v19.0";

// `any` rather than pulling in the providers' full type packages for the three
// methods we call.
declare global {
  interface Window {
    google?: any;
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

/** Inject a <script> once and resolve when it has loaded (idempotent by id). */
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error(`Failed to load ${src}`))
        );
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.id = id;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(script);
  });
}

/**
 * Thrown when the person closes the provider popup themselves. That's a choice,
 * not a failure, so the pages swallow it instead of showing an error box.
 */
export class SocialAuthCancelled extends Error {
  constructor(provider: "Google" | "Facebook") {
    super(`${provider} sign-in was cancelled.`);
    this.name = "SocialAuthCancelled";
  }
}

export function isSocialAuthCancelled(err: unknown): boolean {
  return err instanceof SocialAuthCancelled;
}

let googleTokenClient: any = null;

/** Rejects if Google isn't configured or the user dismisses the popup. */
export async function signInWithGoogle(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google sign-in isn’t set up yet.");
  }
  await loadScript("https://accounts.google.com/gsi/client", "google-gsi-script");

  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google sign-in couldn’t load. Check your connection and try again.");
  }

  return new Promise<string>((resolve, reject) => {
    // One token client, reused across clicks - only the callback changes.
    googleTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response: any) => {
        if (response && response.access_token) {
          resolve(response.access_token);
        } else if (response?.error === "access_denied") {
          reject(new SocialAuthCancelled("Google"));
        } else {
          reject(new Error("Google sign-in didn’t go through. Please try again."));
        }
      },
      // Google's raw messages ("Popup window closed") aren't meant for people.
      error_callback: (err: any) => {
        if (err?.type === "popup_closed") {
          reject(new SocialAuthCancelled("Google"));
        } else if (err?.type === "popup_failed_to_open") {
          reject(new Error("Your browser blocked the sign-in popup. Allow popups for this site and try again."));
        } else {
          reject(new Error("Google sign-in didn’t go through. Please try again."));
        }
      },
    });
    googleTokenClient.requestAccessToken();
  });
}

let facebookReady: Promise<void> | null = null;

/** Load and initialise the Facebook SDK exactly once. */
function ensureFacebook(): Promise<void> {
  if (!FACEBOOK_APP_ID) {
    return Promise.reject(new Error("Facebook sign-in isn’t set up yet."));
  }
  if (facebookReady) return facebookReady;

  const pending = new Promise<void>((resolve, reject) => {
    // The SDK fires this as soon as it parses, so set it before loading.
    window.fbAsyncInit = () => {
      try {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: FACEBOOK_GRAPH_VERSION,
        });
        resolve();
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Facebook init failed."));
      }
    };
    loadScript("https://connect.facebook.net/en_US/sdk.js", "facebook-jssdk").catch(reject);
  });

  // Clear the cache if it fails, so the NEXT click retries. Caching the
  // rejected promise meant one flaky moment - a slow network, an ad blocker
  // eating connect.facebook.net - disabled Facebook sign-in for the rest of the
  // session: every later click re-returned the same rejection instantly, with
  // no request attempted, until a full page reload.
  facebookReady = pending.catch((e) => {
    facebookReady = null;
    throw e;
  });
  return facebookReady;
}

/** Rejects if Facebook isn't configured or the user cancels. */
export async function signInWithFacebook(): Promise<string> {
  await ensureFacebook();

  return new Promise<string>((resolve, reject) => {
    window.FB.login(
      (response: any) => {
        if (response && response.authResponse && response.authResponse.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new SocialAuthCancelled("Facebook"));
        }
      },
      { scope: "public_profile,email" }
    );
  });
}

export const socialAuthConfigured = {
  google: Boolean(GOOGLE_CLIENT_ID),
  facebook: Boolean(FACEBOOK_APP_ID),
};
