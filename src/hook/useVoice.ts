import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { loadUsage } from "../redux/billingSlice";
import { voiceService, voiceIncludedIn, formatRemaining } from "../services/voiceService";
import type { VoiceStatus } from "../services/voiceService";
import type { PlanId } from "../services/billingService";
import type { Refusal } from "../components/UpgradePrompt";
import { voiceCopy } from "../copy";

/**
 * What voice can do for the person in front of us, as the SERVER describes it.
 *
 * GET /api/voice/status answers three separate questions at once - is voice
 * switched on at all, does this plan include it, and is the premium voice
 * available - and the usage snapshot says how much is left. Nothing here is a
 * rule of the client's own: `limits.voiceMinutesPerMonth === 0` is how a plan
 * without voice is recognised, exactly as the API enforces it.
 *
 * The status is fetched once per session and shared by every surface that asks
 * (chat, group rooms, the general bar), so opening three chats is one request.
 */

interface Cache {
  status: VoiceStatus | null;
  error: string | null;
  loading: boolean;
  promise: Promise<void> | null;
}

const cache: Cache = { status: null, error: null, loading: false, promise: null };
const listeners = new Set<() => void>();

function announce() {
  for (const fn of listeners) fn();
}

/** Forget the cached status - used when the session ends or a plan changes. */
export function resetVoiceStatus(): void {
  cache.status = null;
  cache.error = null;
  cache.loading = false;
  cache.promise = null;
  announce();
}

function fetchStatus(force = false): Promise<void> {
  if (!force && cache.status) return Promise.resolve();
  if (cache.promise) return cache.promise;
  cache.loading = true;
  announce();
  cache.promise = voiceService
    .getVoiceStatus()
    .then((s) => {
      cache.status = s;
      cache.error = null;
    })
    .catch(() => {
      // A status we could not read is not an error worth showing anyone: the
      // controls simply stay out of the way until it comes back.
      cache.error = voiceCopy.unavailable;
    })
    .finally(() => {
      cache.loading = false;
      cache.promise = null;
      announce();
    });
  return cache.promise;
}

export interface VoiceAvailability {
  /** The status has been answered once (either way). */
  ready: boolean;
  status: VoiceStatus | null;
  /** A provider is wired up AND this plan includes voice. */
  available: boolean;
  /** A provider is wired up on the server. */
  configured: boolean;
  /** Voice exists, but not on this plan - offer the upgrade instead. */
  needsUpgrade: boolean;
  /** Which plan to point at, from the catalogue - never a hardcoded name. */
  upgradeTo: PlanId | null;
  premiumAvailable: boolean;
  premiumCost: number;
  /** Seconds left this month (input and spoken replies share this pool). */
  remainingSeconds: number | null;
  remainingReplies: number | null;
  /** "12:35 of voice left · 84 spoken replies", or null while unknown. */
  usageLabel: string | null;
  /** The sheet to show when voice cannot be used at all, or null. */
  refusal: Refusal | null;
  refresh: () => void;
  /** Re-read the meters after a voice request (never decremented locally). */
  refreshUsage: () => void;
}

export function useVoice(): VoiceAvailability {
  const dispatch = useAppDispatch();
  const usage = useAppSelector((s) => s.billing.usage);
  const catalogue = useAppSelector((s) => s.billing.catalogue);
  const plan = useAppSelector((s) => s.billing.billing?.plan ?? null);
  const [, bump] = useState(0);

  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    void fetchStatus();
    return () => {
      listeners.delete(fn);
    };
  }, []);

  // The plan decides what voice is allowed, so a plan that changed under us
  // (an upgrade, a trial ending) gets a fresh answer rather than a stale one.
  useEffect(() => {
    if (plan && cache.status) void fetchStatus(true);
  }, [plan]);

  const refresh = useCallback(() => {
    void fetchStatus(true);
  }, []);

  const refreshUsage = useCallback(() => {
    void dispatch(loadUsage());
  }, [dispatch]);

  const status = cache.status;
  const configured = Boolean(status && status.configured);
  const included = voiceIncludedIn(status);
  const available = configured && included;
  const ready = Boolean(status) || Boolean(cache.error);

  // The cheapest plan in the catalogue that has any voice at all. If the
  // catalogue has not loaded, no plan is named and the sheet says "see plans".
  const upgradeTo =
    (catalogue?.plans ?? []).find((p) => p.limits.voiceMinutesPerMonth > 0)?.id ?? null;

  const secondsMeter = usage?.meters?.VOICE_SECONDS ?? null;
  const repliesMeter = usage?.meters?.SPOKEN_REPLIES ?? null;
  const remainingSeconds = secondsMeter ? secondsMeter.remaining : null;
  const remainingReplies = repliesMeter ? repliesMeter.remaining : null;

  const usageLabel =
    available && secondsMeter && repliesMeter && !secondsMeter.unlimited
      ? voiceCopy.usage(
          formatRemaining(secondsMeter.remaining ?? 0),
          repliesMeter.unlimited ? "unlimited" : String(repliesMeter.remaining ?? 0)
        )
      : null;

  // Meters are only fetched when there is voice to meter - a Free account
  // never makes the extra request.
  useEffect(() => {
    if (available && !usage) void dispatch(loadUsage());
  }, [available, usage, dispatch]);

  let refusal: Refusal | null = null;
  if (ready && !configured) {
    refusal = { code: "VOICE_UNAVAILABLE", message: voiceCopy.unavailable };
  } else if (ready && configured && !included) {
    refusal = {
      code: "PLAN_FEATURE",
      feature: "VOICE",
      message: voiceCopy.notOnPlan,
      upgradeTo,
    };
  }

  return {
    ready,
    status,
    available,
    configured,
    needsUpgrade: ready && configured && !included,
    upgradeTo,
    premiumAvailable: Boolean(status && status.premiumConfigured),
    premiumCost: status?.limits.premiumVoiceCost ?? 0,
    remainingSeconds,
    remainingReplies,
    usageLabel,
    refusal,
    refresh,
    refreshUsage,
  };
}
