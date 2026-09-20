import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadBilling, loadCatalogue } from "../redux/billingSlice";
import { formatINR, formatDate, priceFor } from "../services/billingService";
import type { BillingCycle, PlanId } from "../services/billingService";
import { formatCredits } from "../services/creditsService";

// What actually happened, read back from the server.
//
// The query string only says what was attempted. Everything shown here comes
// from /billing/me, so if the webhook has not landed yet the page says so
// rather than congratulating someone on a plan they do not have.

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();
  const billing = useAppSelector((s) => s.billing.billing);
  const credits = useAppSelector((s) => s.billing.credits);
  const catalogue = useAppSelector((s) => s.billing.catalogue);

  const askedTrial = params.get("trial") === "1";
  const askedCycle: BillingCycle = params.get("cycle") === "MONTHLY" ? "MONTHLY" : "ANNUAL";

  useEffect(() => {
    dispatch(loadBilling());
    if (!catalogue) dispatch(loadCatalogue());
  }, [dispatch, catalogue]);

  const plan: PlanId = billing?.plan ?? "FREE";
  const planFromCatalogue = useMemo(
    () => catalogue?.plans.find((p) => p.id === plan) ?? null,
    [catalogue, plan]
  );
  const sub = billing?.subscription ?? null;

  // The only claim worth making is one the server has confirmed.
  const landed = plan !== "FREE";
  const trialing = Boolean(billing?.trialing);

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[480px] text-center">
        <span
          aria-hidden="true"
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${landed ? "bg-sage/15 text-sage-deep" : "bg-cream text-muted border border-hairline"
            }`}
        >
          {landed ? <CheckMark /> : <ClockIcon />}
        </span>

        {landed ? (
          <>
            <h1 className="font-display text-ink text-[2rem] md:text-[2.3rem] leading-tight">
              {trialing ? "your trial has started." : `${planFromCatalogue?.name ?? plan} is yours.`}
            </h1>
            <p className="font-serif text-muted text-[1rem] mt-3">
              {trialing ? (
                <>
                  nothing was charged today.
                  {sub?.trialEndsAt && planFromCatalogue && (
                    <>
                      {" "}
                      {formatINR(planFromCatalogue.price.monthly)} on {formatDate(sub.trialEndsAt)} unless you cancel
                      — we'll remind you first.
                    </>
                  )}
                </>
              ) : (
                <>
                  thanks. your receipt is on its way by email
                  {sub?.currentPeriodEnd && <> and it renews on {formatDate(sub.currentPeriodEnd)}</>}.
                </>
              )}
            </p>

            {!trialing && planFromCatalogue && sub && (
              <p className="font-caveat text-muted text-[0.9rem] mt-2">
                {formatINR(priceFor(planFromCatalogue, sub.cycle ?? askedCycle))}{" "}
                {sub.cycle === "ANNUAL" ? "a year" : "a month"}
              </p>
            )}

            {credits && credits.total > 0 && (
              <p className="font-caveat text-sage-deep text-[0.92rem] mt-2">
                {formatCredits(credits.total)} credits are in your account.
              </p>
            )}

            {planFromCatalogue && (
              <ul className="mt-6 flex flex-col gap-2 text-left mx-auto max-w-[340px]">
                {planFromCatalogue.marketing.slice(0, 5).map((f: string) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="shrink-0 mt-[0.2rem] text-rust">·</span>
                    <span className="font-serif text-[0.92rem] text-ink-soft">{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h1 className="font-display text-ink text-[1.8rem] md:text-[2rem] leading-tight">
              {askedTrial ? "just finishing up…" : "we're confirming that…"}
            </h1>
            <p className="font-serif text-muted text-[1rem] mt-3">
              your bank has answered and we're waiting on the last word from the payment provider. this usually takes a
              few seconds — nothing is lost either way, and your plan will show up in settings.
            </p>
            <button
              type="button"
              onClick={() => dispatch(loadBilling())}
              className="mt-5 font-serif text-[0.92rem] text-rust hover:underline underline-offset-2 cursor-pointer"
            >
              check again
            </button>
          </>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="rounded-full bg-rust text-cream-soft font-serif text-[0.95rem] px-6 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
          >
            back to privateaile →
          </button>
          <button
            type="button"
            onClick={() => navigate("/settings/billing")}
            className="rounded-full border border-ink/15 text-ink-soft font-serif text-[0.88rem] px-6 py-2 hover:bg-ink/5 transition cursor-pointer"
          >
            plan &amp; billing
          </button>
        </div>
      </div>
    </div>
  );
}
