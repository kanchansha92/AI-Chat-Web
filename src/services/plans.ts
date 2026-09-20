// Plan helpers for the UI.
//
// There is deliberately NO plan table here any more. Prices, limits and
// feature lists live in the backend's config/plans.js and reach the client
// through GET /api/billing/plans (services/billingService.ts). A hardcoded
// price in the client is a price that drifts from the one actually charged.
//
// What remains is presentation: formatting, ordering, and the display names -
// and even those prefer the catalogue when it has loaded.

export type { PlanId, BillingCycle, Plan, PlanLimits } from "./billingService";
export {
  formatINR,
  formatPaise,
  formatDate as formatBillingDate,
  formatBytes,
  priceFor,
  cycleSuffix,
  isUpgrade,
  planRank,
} from "./billingService";

import type { PlanId, Plan, BillingCycle } from "./billingService";

/**
 * Display names, for the moments a label is needed before the catalogue has
 * loaded (the account menu on a cold start). Never prices - a stale name is a
 * cosmetic bug, a stale price is a lie.
 */
const PLAN_NAMES: Record<PlanId, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PLUS: "Plus",
  ULTRA: "Ultra",
};

export function planLabel(id: PlanId | undefined | null, catalogue?: Plan[] | null): string {
  const plan = (id ?? "FREE") as PlanId;
  const fromServer = catalogue?.find((p) => p.id === plan);
  return fromServer ? fromServer.name : PLAN_NAMES[plan] ?? "Free";
}

/** The order the pricing grid reads in. */
export const PLAN_ORDER: PlanId[] = ["FREE", "BASIC", "PLUS", "ULTRA"];

export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => PLAN_ORDER.indexOf(a.id) - PLAN_ORDER.indexOf(b.id));
}

/** When the next charge falls, for a plan being bought today. */
export function renewalDate(cycle: BillingCycle, from: Date = new Date()): Date {
  const d = new Date(from);
  if (cycle === "ANNUAL") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}
