import { request, authHeader } from "./authService";
import type { PlanId, PlanLimits } from "./billingService";

// The meters, straight from the server. Nothing here decides whether something
// is allowed - that is always the API's answer to the actual request. These
// numbers are for showing someone where they stand.

export type UsageMetric =
  | "MESSAGES"
  | "PREMIUM_REPLIES"
  | "IMAGES"
  | "HD_IMAGES"
  | "VOICE_SECONDS"
  | "SPOKEN_REPLIES"
  | "NEW_CHARACTERS"
  | "PERSONA_CHANGES"
  | "GROUPS_CREATED"
  | "DOCUMENT_UPLOADS";

export interface Meter {
  metric: UsageMetric;
  used: number;
  limit: number | null;
  remaining: number | null;
  unlimited: boolean;
  resetAt: string | null;
  period: string;
}

export interface UsageSnapshot {
  plan: PlanId;
  planSource: string;
  trialing: boolean;
  pastDue: boolean;
  periods: {
    daily: { key: string; start: string; resetAt: string };
    monthly: { key: string; start: string; resetAt: string };
  };
  limits: PlanLimits;
  meters: Record<UsageMetric, Meter>;
  credits: { total: number; purchased: number; granted: number; grants: unknown[] };
}

export const usageService = {
  snapshot(): Promise<UsageSnapshot> {
    return request(`/usage`, { headers: authHeader() });
  },
};

/** How the meters are labelled wherever they are shown. */
export const METER_LABELS: Record<UsageMetric, string> = {
  MESSAGES: "messages",
  PREMIUM_REPLIES: "premium replies",
  IMAGES: "images",
  HD_IMAGES: "HD images",
  // One pool, spent from both ends: dictation you speak in, and replies read
  // out to you. Calling it "voice messages" hid half of what it pays for.
  VOICE_SECONDS: "voice usage (spoken + heard)",
  SPOKEN_REPLIES: "spoken replies",
  NEW_CHARACTERS: "new characters",
  PERSONA_CHANGES: "persona changes",
  GROUPS_CREATED: "new rooms",
  DOCUMENT_UPLOADS: "document uploads",
};

/**
 * Voice is metered in seconds and read in time. The allowance is quoted in
 * minutes (that is how the plan sells it), but what has been used is shown as
 * m:ss - "0 min" was the answer for anything under half a minute, which reads
 * as "nothing yet" when it is not.
 */
export function meterDisplay(m: Meter): { used: string; limit: string } {
  if (m.metric === "VOICE_SECONDS") {
    const clock = (n: number) => `${Math.floor(n / 60)}:${String(Math.max(0, Math.floor(n)) % 60).padStart(2, "0")}`;
    return {
      used: clock(m.used),
      limit: m.limit === null ? "unlimited" : `${Math.round(m.limit / 60)} min`,
    };
  }
  return { used: String(m.used), limit: m.limit === null ? "unlimited" : String(m.limit) };
}

/** "resets tomorrow" / "resets 14 mar" - the calm version of a countdown. */
export function resetLabel(resetAt: string | null): string {
  if (!resetAt) return "";
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return "";
  const hours = (d.getTime() - Date.now()) / 36e5;
  if (hours <= 0) return "resets shortly";
  if (hours < 24) return "resets at midnight";
  if (hours < 48) return "resets tomorrow";
  return `resets ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toLowerCase()}`;
}
