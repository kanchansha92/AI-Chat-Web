import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "./hooks";
import { loadCatalogue } from "../redux/billingSlice";
import type { PlanId, PlanLimits } from "../services/billingService";

/**
 * What the current plan allows, as the SERVER describes it.
 *
 * The numbers come from GET /api/billing/plans (which reads the backend's
 * config/plans.js) or from the usage snapshot - never from a table in the
 * client. This is for showing and hiding things; the API still refuses
 * anything a plan does not allow, so a stale value here can only make the UI
 * briefly wrong, never let someone past a limit.
 */
export function usePlan(): {
  plan: PlanId;
  limits: PlanLimits | null;
  trialing: boolean;
  pastDue: boolean;
  ready: boolean;
} {
  const dispatch = useAppDispatch();
  const billing = useAppSelector((s) => s.billing.billing);
  const usage = useAppSelector((s) => s.billing.usage);
  const catalogue = useAppSelector((s) => s.billing.catalogue);

  useEffect(() => {
    if (!catalogue) dispatch(loadCatalogue());
  }, [dispatch, catalogue]);

  const plan: PlanId = billing?.plan ?? "FREE";

  const limits = useMemo(() => {
    // The usage snapshot carries the trial overlay already applied, so it wins
    // when we have it.
    if (usage && usage.plan === plan) return usage.limits;
    const fromCatalogue = catalogue?.plans.find((p) => p.id === plan);
    if (!fromCatalogue) return null;
    if (billing?.trialing && catalogue) {
      return { ...fromCatalogue.limits, messagesPerDay: catalogue.trial.messagesPerDay };
    }
    return fromCatalogue.limits;
  }, [usage, catalogue, plan, billing?.trialing]);

  return {
    plan,
    limits,
    trialing: Boolean(billing?.trialing),
    pastDue: Boolean(billing?.pastDue),
    ready: Boolean(billing),
  };
}

/** Does this plan include group roleplay at all? (Free does not.) */
export function useGroupsAllowed(): { allowed: boolean; maxMembers: number; ready: boolean } {
  const { limits, ready } = usePlan();
  const maxMembers = limits?.group.maxMembers ?? 0;
  return { allowed: maxMembers > 0, maxMembers, ready: ready && Boolean(limits) };
}
