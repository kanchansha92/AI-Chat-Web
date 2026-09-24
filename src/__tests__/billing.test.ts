import { describe, it, expect } from "vitest";
import { trialState } from "../lib/trial";
import { refusalFrom } from "../components/UpgradePrompt";
import { ApiError } from "../services/authService";
import {
  formatINR,
  formatPaise,
  formatBytes,
  isUpgrade,
  priceFor,
  cycleSuffix,
} from "../services/billingService";
import type { BillingState, Plan } from "../services/billingService";
import { formatCredits } from "../services/creditsService";
import { resetLabel, meterDisplay } from "../services/usageService";
import { planLabel, sortPlans, PLAN_ORDER } from "../services/plans";

// These cover the pure client logic only. Every rule that MATTERS - what a plan
// allows, what something costs, whether a payment landed - is enforced and
// tested on the server (backend/test/*). Nothing here can grant anything.

const base: BillingState = {
  plan: "FREE",
  planSource: "FREE",
  trialing: false,
  pastDue: false,
  trialUsedAt: null,
  trialAvailable: true,
  trialDaysRemaining: null,
  subscription: null,
  paymentsConfigured: true,
  keyId: "rzp_test_x",
};

const NOW = Date.parse("2026-09-15T00:00:00Z");

function trialSub(endsAt: string) {
  return {
    ...base,
    plan: "BASIC" as const,
    planSource: "TRIAL" as const,
    trialing: true,
    trialAvailable: false,
    subscription: {
      id: "s1",
      plan: "BASIC" as const,
      cycle: "MONTHLY" as const,
      status: "TRIALING" as const,
      mandateStatus: "ACTIVE" as const,
      paymentMethodType: "UPI" as const,
      paymentMethodLast4: null,
      trialStartsAt: null,
      trialEndsAt: endsAt,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      endedAt: null,
      graceUntil: null,
      pendingPlan: null,
      pendingCycle: null,
      renewalFailedCount: 0,
    },
  };
}

describe("trialState", () => {
  it("offers the trial to a free account that has never used one", () => {
    const s = trialState(base, NOW);
    expect(s.phase).toBe("available");
    expect(s.canStart).toBe(true);
    expect(s.showBanner).toBe(false);
  });

  it("offers nothing once the trial has been used", () => {
    const s = trialState({ ...base, trialAvailable: false, trialUsedAt: "2026-01-01T00:00:00Z" }, NOW);
    expect(s.phase).toBe("none");
    expect(s.canStart).toBe(false);
  });

  it("stays quiet in the early days and speaks up near the end", () => {
    expect(trialState(trialSub("2026-09-25T00:00:00Z"), NOW).showBanner).toBe(false);
    const day12 = trialState(trialSub("2026-09-18T00:00:00Z"), NOW);
    expect(day12.phase).toBe("lastDays");
    expect(day12.daysRemaining).toBe(3);
    expect(day12.showBanner).toBe(true);
    const last = trialState(trialSub("2026-09-15T12:00:00Z"), NOW);
    expect(last.phase).toBe("lastDay");
    expect(last.showBanner).toBe(true);
  });

  it("never reports a negative countdown", () => {
    const s = trialState(trialSub("2026-09-10T00:00:00Z"), NOW);
    expect(s.phase).toBe("ended");
    expect(s.daysRemaining).toBe(0);
  });

  it("is inert with no billing state at all", () => {
    expect(trialState(null).phase).toBe("none");
    expect(trialState(undefined).canStart).toBe(false);
  });
});

describe("refusalFrom", () => {
  it("reads a PLAN_LIMIT with the server's own numbers", () => {
    const err = new ApiError("that's today's messages used up.", 403, undefined, "PLAN_LIMIT", {
      error: {
        code: "PLAN_LIMIT",
        metric: "MESSAGES",
        limit: 10,
        used: 10,
        remaining: 0,
        resetAt: "2026-09-16T18:30:00.000Z",
        upgradeTo: "BASIC",
      },
    });
    const r = refusalFrom(err);
    expect(r?.metric).toBe("MESSAGES");
    expect(r?.limit).toBe(10);
    expect(r?.upgradeTo).toBe("BASIC");
    expect(r?.message).toBe("that's today's messages used up.");
  });

  it("reads CREDITS_REQUIRED, PLAN_FEATURE and the provider 503s", () => {
    for (const code of [
      "CREDITS_REQUIRED",
      "PLAN_FEATURE",
      "SUBSCRIPTION_PAST_DUE",
      "VOICE_UNAVAILABLE",
      "MODEL_UNAVAILABLE",
      "PREMIUM_UNAVAILABLE",
      "IMAGE_FEATURE_UNAVAILABLE",
      "PAYMENTS_UNAVAILABLE",
    ]) {
      expect(refusalFrom(new ApiError("no", 403, undefined, code, { error: { code } }))?.code).toBe(code);
    }
  });

  it("ignores errors that are not entitlement refusals", () => {
    expect(refusalFrom(new ApiError("boom", 500))).toBeNull();
    expect(refusalFrom(new ApiError("bad file", 400, undefined, "SOMETHING_ELSE"))).toBeNull();
    expect(refusalFrom(new Error("network"))).toBeNull();
    expect(refusalFrom(null)).toBeNull();
  });
});

describe("money and meter formatting", () => {
  it("formats rupees the Indian way, without decimals", () => {
    expect(formatINR(1499)).toBe("₹1,499");
    expect(formatINR(24999)).toBe("₹24,999");
    expect(formatPaise(79900)).toBe("₹799");
  });

  it("formats credits without trailing zeroes", () => {
    expect(formatCredits(12)).toBe("12");
    expect(formatCredits(1.5)).toBe("1.5");
    expect(formatCredits(0)).toBe("0");
  });

  it("formats storage in the units the plans are sold in", () => {
    expect(formatBytes(500 * 1024 * 1024)).toBe("500 MB");
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe("2 GB");
    expect(formatBytes(0)).toBe("0 MB");
  });

  it("reads voice as time used against an allowance in minutes", () => {
    const m = {
      metric: "VOICE_SECONDS" as const,
      used: 120,
      limit: 3600,
      remaining: 3480,
      unlimited: false,
      resetAt: null,
      period: "M:2026-09-01",
    };
    expect(meterDisplay(m)).toEqual({ used: "2:00", limit: "60 min" });
    // a short first recording still shows as something, not as "0 min"
    expect(meterDisplay({ ...m, used: 20 }).used).toBe("0:20");
  });

  it("says when an allowance comes back", () => {
    const soon = new Date(Date.now() + 3 * 3600_000).toISOString();
    expect(resetLabel(soon)).toBe("resets at midnight");
    expect(resetLabel(new Date(Date.now() + 30 * 3600_000).toISOString())).toBe("resets tomorrow");
    expect(resetLabel(null)).toBe("");
  });
});

describe("plan helpers", () => {
  const plan = (id: Plan["id"], monthly: number, annual: number): Plan => ({
    id,
    name: id[0] + id.slice(1).toLowerCase(),
    tagline: "",
    badge: null,
    highlighted: false,
    price: { monthly, annual },
    marketing: [],
    limits: {} as Plan["limits"],
  });

  it("orders the grid free → basic → plus → ultra", () => {
    const shuffled = [plan("ULTRA", 2499, 24999), plan("FREE", 0, 0), plan("PLUS", 1499, 14999), plan("BASIC", 799, 7999)];
    expect(sortPlans(shuffled).map((p) => p.id)).toEqual(PLAN_ORDER);
  });

  it("knows which way is up", () => {
    expect(isUpgrade("FREE", "BASIC")).toBe(true);
    expect(isUpgrade("PLUS", "ULTRA")).toBe(true);
    expect(isUpgrade("ULTRA", "BASIC")).toBe(false);
    expect(isUpgrade("BASIC", "BASIC")).toBe(false);
  });

  it("prices by cycle", () => {
    const p = plan("BASIC", 799, 7999);
    expect(priceFor(p, "MONTHLY")).toBe(799);
    expect(priceFor(p, "ANNUAL")).toBe(7999);
    expect(cycleSuffix("ANNUAL")).toBe("/ year");
  });

  it("names every plan, and prefers the server's own names", () => {
    expect(planLabel("ULTRA")).toBe("Ultra");
    expect(planLabel(undefined)).toBe("Free");
    expect(planLabel("BASIC", [{ ...plan("BASIC", 799, 7999), name: "Starter" }])).toBe("Starter");
  });
});
