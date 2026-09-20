import type { BillingState } from "../services/billingService";

// The trial, derived from the SUBSCRIPTION the server reports - never from a
// date on the user row, and never from anything the client decides. The old
// 7-day roleplay trial (user.roleplayTrialEndsAt) is gone: the Basic trial is
// a real subscription in TRIALING, and roleplay itself is on every plan.
//
// Nothing here gates a feature. The API refuses what a plan does not allow;
// this only decides what the banner says.

export type TrialPhase = "none" | "available" | "active" | "lastDays" | "lastDay" | "ended";

export interface TrialState {
  phase: TrialPhase;
  endsAt: Date | null;
  /** Whole days left, rounded up. Null when there is no trial running. */
  daysRemaining: number | null;
  /** The trial has never been used on this account and the plan is Free. */
  canStart: boolean;
  /** Worth interrupting for: the day-12 and day-14 reminders. */
  showBanner: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const NONE: TrialState = {
  phase: "none",
  endsAt: null,
  daysRemaining: null,
  canStart: false,
  showBanner: false,
};

/** `now` is injectable for tests. */
export function trialState(billing: BillingState | null | undefined, now: number = Date.now()): TrialState {
  if (!billing) return NONE;

  if (!billing.trialing) {
    // Never started, still eligible: the pricing page offers it.
    if (billing.trialAvailable) return { ...NONE, phase: "available", canStart: true };
    return NONE;
  }

  const sub = billing.subscription;
  const endsAt = sub && sub.trialEndsAt ? new Date(sub.trialEndsAt) : null;
  if (!endsAt || Number.isNaN(endsAt.getTime())) return { ...NONE, phase: "active" };

  const msRemaining = endsAt.getTime() - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / DAY_MS));

  let phase: TrialPhase;
  if (msRemaining <= 0) phase = "ended";
  else if (msRemaining <= DAY_MS) phase = "lastDay";
  else if (daysRemaining <= 3) phase = "lastDays";
  else phase = "active";

  return {
    phase,
    endsAt,
    daysRemaining,
    canStart: false,
    // The reminders the backend emails on day 12 and day 14 are the same
    // moments this banner appears, so the two never contradict each other.
    showBanner: phase === "lastDays" || phase === "lastDay",
  };
}

/**
 * Roleplay is part of every plan now, so nothing is locked by a trial ending.
 * Kept so the screens that asked can keep asking while they are updated.
 */
export function roleplayLocked(): boolean {
  return false;
}
