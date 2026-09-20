import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadBilling } from "../redux/billingSlice";
import { formatBytes, formatDate } from "../services/billingService";
import { formatCredits } from "../services/creditsService";
import type { Meter, UsageMetric } from "../services/usageService";
import UsageMeter from "../components/UsageMeter";
import PlanBadge from "../components/PlanBadge";

// Where you stand, this day and this month. Everything is the server's count -
// the client keeps no tallies of its own, so what is shown is exactly what the
// API will enforce on the next request.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

const DAILY: UsageMetric[] = ["MESSAGES", "PREMIUM_REPLIES"];
const MONTHLY: UsageMetric[] = [
  "IMAGES",
  "HD_IMAGES",
  "VOICE_SECONDS",
  "SPOKEN_REPLIES",
  "NEW_CHARACTERS",
  "PERSONA_CHANGES",
  "GROUPS_CREATED",
  "DOCUMENT_UPLOADS",
];

export default function UsagePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const usage = useAppSelector((s) => s.billing.usage);
  const billing = useAppSelector((s) => s.billing.billing);
  const credits = useAppSelector((s) => s.billing.credits);

  useEffect(() => {
    dispatch(loadBilling());
  }, [dispatch]);

  const meters = usage?.meters ?? null;
  const pick = (keys: UsageMetric[]): Meter[] =>
    meters ? keys.map((k) => meters[k]).filter(Boolean) : [];

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <div className="mx-auto w-full max-w-[760px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings/billing"))}
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center md:text-left md:pl-1 font-caveat text-rust text-[1.02rem]">what you've used</p>
          <span className="h-9 w-9 shrink-0 md:hidden" aria-hidden="true" />
        </div>

        {!usage ? (
          <p className="mt-12 text-center font-caveat text-muted text-[1rem]">counting…</p>
        ) : (
          <>
            <header className="mt-6 md:mt-8 flex items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-ink text-[1.8rem] leading-none">your allowances</h1>
                <p className="font-caveat text-muted text-[0.88rem] mt-1">
                  nothing here is a guess — it's the same count the app checks against.
                </p>
              </div>
              <PlanBadge plan={billing?.plan} trialing={Boolean(billing?.trialing)} pastDue={Boolean(billing?.pastDue)} />
            </header>

            <section className="mt-6 rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
              <div className="flex items-baseline justify-between">
                <p className="font-caveat text-muted text-[0.85rem]">today</p>
                <p className="font-caveat text-muted/70 text-[0.8rem]">
                  resets at midnight · {formatDate(usage.periods.daily.resetAt)}
                </p>
              </div>
              <div className="mt-2 flex flex-col divide-y divide-hairline/40">
                {pick(DAILY).map((m) => (
                  <UsageMeter key={m.metric} meter={m} />
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
              <div className="flex items-baseline justify-between">
                <p className="font-caveat text-muted text-[0.85rem]">this month</p>
                <p className="font-caveat text-muted/70 text-[0.8rem]">
                  resets {formatDate(usage.periods.monthly.resetAt)}
                </p>
              </div>
              <div className="mt-2 flex flex-col divide-y divide-hairline/40">
                {pick(MONTHLY).map((m) => (
                  <UsageMeter key={m.metric} meter={m} />
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
              <p className="font-caveat text-muted text-[0.85rem]">always on</p>
              <dl className="mt-2 flex flex-col divide-y divide-hairline/40 font-serif text-[0.92rem]">
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-soft">active characters</dt>
                  <dd className="text-muted">
                    {usage.limits.activeCharacters === null ? "unlimited" : usage.limits.activeCharacters}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-soft">personas</dt>
                  <dd className="text-muted">{usage.limits.personas === null ? "unlimited" : usage.limits.personas}</dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-soft">journal storage</dt>
                  <dd className="text-muted">
                    {usage.limits.journal.storageBytes ? formatBytes(usage.limits.journal.storageBytes) : "text only"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2">
                  <dt className="text-ink-soft">credits</dt>
                  <dd className="text-muted">{credits ? formatCredits(credits.total) : "—"}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => navigate("/plans")}
                className="mt-4 font-serif text-[0.9rem] text-rust hover:underline underline-offset-2 cursor-pointer"
              >
                need more room? see plans →
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
