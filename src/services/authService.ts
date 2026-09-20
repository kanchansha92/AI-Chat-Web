import { networkCopy } from "../copy";
import { emitNetEvent } from "../lib/netStatus";
import { TOKEN_STORAGE_KEY, clearSessionScopedStorage } from "../lib/storageKeys";

// No localhost fallback. A production build made without VITE_API_BASE used to
// ship pointing at whoever built it: every call failed as a CORS/connection
// error, normalised to ApiError(..., 0), so users saw "connection slipped" on a
// perfectly healthy network with nothing to explain it - and under HTTPS the
// browser blocked it as mixed content before that. Same-origin "/api" is the
// right default for a deployed build; a dev server proxies or sets the var.
const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

// Ceiling on a single request. `fetch` has no timeout of its own, so a
// connection the server accepted and then never answered left `sending`/
// `loading` true forever: in ChatPage the composer stays disabled and the
// typing indicator bounces indefinitely, with no way out but a reload.
// Generous, because a long-form reply legitimately takes tens of seconds.
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * `options.signal` if the caller passed one, otherwise a timeout. Callers that
 * bring their own signal are expected to bound it themselves.
 */
function withTimeout(options: RequestInit): RequestInit {
  if (options.signal) return options;
  return { ...options, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) };
}

/** An aborted request is a timeout here, not a mystery. */
function isAbort(e: unknown): boolean {
  return e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError");
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  // null on Google/Facebook accounts until the user fills it in at onboarding.
  dob: string | null;
  avatar: string | null;
  plan: "FREE" | "BASIC" | "PLUS" | "ULTRA";
  theme: "PAPER" | "LAMPLIGHT";
  onboardingDone: boolean;
  intent: "COMPANY" | "ROLEPLAY" | "JOURNAL" | "LOOKING" | null;
  language: string;
  // Legacy. The Basic trial lives on the subscription now (billingService);
  // this column is no longer written or read.
  roleplayTrialEndsAt?: string | null;
  // Set while the account is in the 30-day deletion grace. Signing in clears it.
  deletionScheduledAt?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  // Sign-in carries the effective plan and the credit balance, both derived
  // server-side, so the app never has to guess at them before the first
  // billing request lands.
  billing?: import("./billingService").BillingState | null;
  credits?: { total: number; purchased: number; granted: number };
}

/**
 * Errors come back as { error: { message, fields?, code? } }. On 400s `fields`
 * maps field name -> the message to render beside that input.
 */
export class ApiError extends Error {
  fields?: Record<string, string>;
  status: number;
  // Set when the error carries a machine-readable code plus extra payload, e.g.
  // the Free daily chat limit sends code "PLAN_LIMIT" and usage.resetAt.
  code?: string;
  payload?: unknown;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>,
    code?: string,
    payload?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.code = code;
    this.payload = payload;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * End the session in browser storage: the token AND everything belonging to the
 * person who was signed in.
 *
 * Clearing only the token left the previous user's chat transcripts and pins in
 * localStorage, where the next person to sign in on the same machine found them
 * in the "Recent" rail and in search. The in-memory half of that is handled by
 * the `sessionEnded` action, which store.ts dispatches when this fires from a
 * 401 and authSlice dispatches on an explicit sign-out.
 */
export function clearSession(): void {
  setToken(null);
  clearSessionScopedStorage();
}

/**
 * What a JSON response can look like once parsed. Errors are the only shape the
 * fetch layer itself reads; everything else is the caller's business and is
 * handed back as T.
 */
type ResponseBody = {
  error?: { message?: string; fields?: Record<string, string>; code?: string };
  [key: string]: unknown;
};

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // FormData sets its own multipart boundary; forcing a JSON content-type on it
  // breaks the upload.
  const isFormData = options.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...withTimeout(options),
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch (e) {
    // fetch only rejects on a real network failure (offline, DNS, CORS, aborted
    // socket) or our own timeout, never on an HTTP error status. Normalise to
    // status 0 so callers can tell "no connection" from "the server said no".
    if (isAbort(e)) throw new ApiError(networkCopy.tookTooLong, 0);
    throw new ApiError(networkCopy.failedMidStream, 0);
  }

  // A 204 has no body, so don't hand an empty string to JSON.parse.
  //
  // Parse defensively for the same reason requestFile does: an error body
  // should be JSON, but nginx or Cloudflare answers a 502 with HTML. An
  // unguarded JSON.parse threw a SyntaxError - not an ApiError - so every
  // `catch (e) { if (e instanceof ApiError) ... }` in the app fell through to
  // its generic branch and the real status code was lost, including for the
  // 429/503 handling just below.
  const text = await res.text();
  let data: ResponseBody;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    // 401, 429 and 503 are handled app-wide via the bus so no caller has to
    // wire them.
    if (res.status === 401) {
      // The session is over - expired, or revoked server-side. Without this the
      // app stayed "authenticated" forever: auth.status never changed, so
      // RequireAuth kept rendering pages while every request 401'd and each one
      // showed its own generic "that didn't work", with no way out but clearing
      // storage by hand. Clearing the token first means the redirect lands on a
      // sign-in screen that will not bounce straight back.
      clearSession();
      emitNetEvent({ type: "signedOut" });
      emitNetEvent({ type: "redirect", to: "/signin" });
    }
    if (res.status === 429) {
      emitNetEvent({ type: "toast", message: networkCopy.rateLimited });
    }
    if (res.status === 503) {
      emitNetEvent({ type: "redirect", to: "/maintenance" });
    }

    // data.error is an object, not a string - new Error(data.error) would give
    // you "[object Object]" instead of the message.
    const message: string =
      data?.error?.message ?? "— something didn't look right.";
    const fields: Record<string, string> | undefined = data?.error?.fields;
    const code: string | undefined = data?.error?.code;
    throw new ApiError(message, res.status, fields, code, data);
  }

  return data as T;
}

/** What a file endpoint gives back: the file itself, or a JSON body instead. */
export type FileResponse =
  | { kind: "file"; blob: Blob; filename: string | null }
  | { kind: "json"; data: unknown };

/** Pull the filename out of `attachment; filename="notes.pdf"`. */
function filenameFrom(disposition: string | null): string | null {
  if (!disposition) return null;
  const quoted = disposition.match(/filename\*?=(?:UTF-8'')?"([^"]+)"/i);
  if (quoted) return decodeURIComponent(quoted[1]);
  const bare = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
  return bare ? decodeURIComponent(bare[1].trim()) : null;
}

/**
 * Like `request`, but for endpoints that answer with a file. `request` reads
 * every response as text and JSON.parses it, which corrupts binary and throws
 * on the first byte of a PDF - so downloads need their own path.
 *
 * A success can still legitimately be JSON (the PDF export answers 200 with
 * { moderation } when the content is withheld), so the caller is told which of
 * the two it got rather than having to sniff the blob.
 */
export async function requestFile(
  path: string,
  options: RequestInit = {}
): Promise<FileResponse> {
  const isFormData = options.body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...withTimeout(options),
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch (e) {
    if (isAbort(e)) throw new ApiError(networkCopy.tookTooLong, 0);
    throw new ApiError(networkCopy.failedMidStream, 0);
  }

  if (!res.ok) {
    // An error body should be JSON, but a proxy or gateway can return HTML -
    // so parse defensively and fall back to a generic message.
    const text = await res.text();
    let data: { error?: { message?: string; fields?: Record<string, string>; code?: string } } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
    if (res.status === 429) {
      emitNetEvent({ type: "toast", message: networkCopy.rateLimited });
    }
    if (res.status === 503) {
      emitNetEvent({ type: "redirect", to: "/maintenance" });
    }
    throw new ApiError(
      data?.error?.message ?? "— something didn't look right.",
      res.status,
      data?.error?.fields,
      data?.error?.code,
      data
    );
  }

  if ((res.headers.get("content-type") ?? "").includes("application/json")) {
    return { kind: "json", data: await res.json() };
  }
  return {
    kind: "file",
    blob: await res.blob(),
    filename: filenameFrom(res.headers.get("content-disposition")),
  };
}

/** Hand a downloaded blob to the browser as a save. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const authService = {
  register(payload: {
    name: string;
    email: string;
    password: string;
    dob: string; // "YYYY-MM-DD"
  }): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Trades a Google access token for our own JWT; the server verifies it. */
  google(accessToken: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    });
  },

  /** Same as `google`, for a Facebook access token. */
  facebook(accessToken: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/facebook", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    });
  },

  /**
   * The response is deliberately identical whether or not the email exists, so
   * show the returned message as-is rather than branching on it.
   */
  forgotPassword(email: string): Promise<{ message: string }> {
    return request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /** Takes the one-time token from the reset email. No session is issued. */
  resetPassword(payload: { token: string; password: string }): Promise<{ message: string }> {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Carries the billing snapshot and credit balance alongside the user. */
  me(): Promise<{ user: AuthUser; billing?: AuthResponse["billing"]; credits?: AuthResponse["credits"] }> {
    return request<{ user: AuthUser; billing?: AuthResponse["billing"]; credits?: AuthResponse["credits"] }>(
      "/auth/me",
      { headers: authHeader() }
    );
  },

  logout(): Promise<{ message: string }> {
    return request<{ message: string }>("/auth/logout", {
      method: "POST",
      headers: authHeader(),
    });
  },
};
