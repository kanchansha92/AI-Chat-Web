import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadCatalogue, awaitActivation, setBusy } from "../redux/billingSlice";
import {
  billingService,
  formatINR,
  formatPaise,
  formatDate,
  priceFor,
  cycleSuffix,
} from "../services/billingService";
import type { BillingCycle, PlanId, Checkout } from "../services/billingService";
import { openCheckout, CheckoutDismissed, CheckoutFailed } from "../lib/razorpay";
import { ApiError } from "../services/authService";
import { useSlowRequest } from "../hooks/useSlowRequest";
import { networkCopy } from "../copy";

// Checkout. Two shapes, one page:
//
//   ?trial=1                the 15-day Basic trial. The server creates a
//                           subscription whose first charge is 15 days out, so
//                           the card/UPI mandate is set up and ₹0 is taken now.
//   ?plan=..&cycle=..       a paid subscription, charged today.
//
// Nothing here decides that a payment succeeded. Razorpay's callback is handed
// straight to POST /api/billing/verify, which checks the signature and then
// re-reads the subscription from Razorpay's own API before anything is
// activated; the page then waits for /billing/me to catch up.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.85rem] w-[0.85rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.9rem] w-[0.9rem]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();

  const catalogue = useAppSelector((s) => s.billing.catalogue);
  const billing = useAppSelector((s) => s.billing.billing);
  const user = useAppSelector((s) => s.auth.user);
  const busy = useAppSelector((s) => s.billing.busy);

  const isTrial = params.get("trial") === "1";
  const rawPlan = (params.get("plan") ?? "BASIC").toUpperCase();
  const planId: PlanId = (["BASIC", "PLUS", "ULTRA"] as const).includes(rawPlan as "BASIC")
    ? (rawPlan as PlanId)
    : "BASIC";
  const cycle: BillingCycle = params.get("cycle") === "MONTHLY" ? "MONTHLY" : "ANNUAL";

  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"ready" | "opening" | "confirming">("ready");
  const slow = useSlowRequest(stage === "confirming");

  useEffect(() => {
    if (!catalogue) dispatch(loadCatalogue());
  }, [dispatch, catalogue]);

  const plan = useMemo(
    () => catalogue?.plans.find((p) => p.id === (isTrial ? "BASIC" : planId)) ?? null,
    [catalogue, isTrial, planId]
  );
  const trialDays = catalogue?.trial.days ?? 15;

  // Trial: ₹0 today, the Basic monthly price on the day after it ends.
  const dueToday = isTrial ? 0 : plan ? priceFor(plan, cycle) : 0;
  const firstChargeOn = useMemo(
    () => new Date(Date.now() + (trialDays + 1) * 86400000),
    [trialDays]
  );

  const paymentsOff = catalogue ? !catalogue.paymentsConfigured : false;

  async function begin() {
    if (busy || !plan) return;
    setError(null);
    setStage("opening");
    dispatch(setBusy(true));
    const was = billing?.subscription?.status ?? null;
    try {
      // 1. the server opens the subscription at the provider
      const created: { checkout: Checkout } = isTrial
        ? await billingService.startTrial()
        : await billingService.subscribe(planId, cycle);

      // 2. the customer completes it in Razorpay's own window
      const result = await openCheckout({
        checkout: created.checkout,
        name: user?.name,
        email: user?.email,
        description: isTrial
          ? `${plan.name} trial — ₹0 today`
          : `${plan.name} · ${cycle === "ANNUAL" ? "yearly" : "monthly"}`,
      });

      // 3. the server verifies the signature and re-reads the truth
      setStage("confirming");
      await billingService.verify({
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_subscription_id: result.razorpay_subscription_id ?? created.checkout.subscriptionId ?? "",
        razorpay_signature: result.razorpay_signature,
      });

      // 4. and we wait for the webhook to land before claiming anything
      await dispatch(awaitActivation({ was })).unwrap();
      navigate(`/plans/success?plan=${isTrial ? "BASIC" : planId}&cycle=${cycle}${isTrial ? "&trial=1" : ""}`, {
        replace: true,
      });
    } catch (e) {
      if (e instanceof CheckoutDismissed) {
        setError(null); // they closed the window on purpose
      } else if (e instanceof CheckoutFailed) {
        setError(e.message);
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("— that didn't go through. nothing was charged.");
      }
      setStage("ready");
    } finally {
      dispatch(setBusy(false));
    }
  }

  const summary = (
    <section className="rounded-[1.4rem] bg-cream-light border border-hairline/60 p-5 md:p-7">
      <div className="inline-block rounded-full border border-dashed border-hairline px-3 py-0.5 font-caveat text-muted text-[0.82rem]">
        {isTrial ? `${trialDays}-day trial` : cycle === "ANNUAL" ? "yearly plan" : "monthly plan"}
      </div>

      <h1 className="font-display text-ink text-[2rem] md:text-[2.3rem] leading-none mt-3">
        {plan ? plan.name : "…"}
      </h1>

      {plan && (
        <p className="mt-1">
          <span className="font-display text-rust text-[1.6rem] md:text-[1.85rem] leading-none">
            {isTrial ? formatINR(0) : formatINR(dueToday)}
          </span>
          <span className="font-caveat text-muted text-[0.85rem] ml-1.5">
            {isTrial ? "today" : cycleSuffix(cycle)}
          </span>
        </p>
      )}

      {plan && (
        <ul className="hidden md:flex flex-col gap-2.5 mt-5">
          {plan.marketing.slice(0, 6).map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <span className="shrink-0 mt-[0.15rem] text-rust flex items-center justify-center h-[0.9rem] w-[0.9rem]">
                <CheckMark />
              </span>
              <span className="font-serif text-[0.92rem] text-ink-soft">{f}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="dashed-divider" />

      <dl className="flex flex-col gap-2.5 font-serif text-[0.95rem]">
        {isTrial ? (
          <>
            <div className="flex items-center justify-between">
              <dt className="text-muted">today</dt>
              <dd className="text-ink-soft">{formatINR(0)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">then {plan ? formatINR(plan.price.monthly) : ""} on</dt>
              <dd className="text-ink-soft">{formatDate(firstChargeOn)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">cancel</dt>
              <dd className="text-ink-soft">any time before then</dd>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <dt className="text-muted">renews</dt>
              <dd className="text-ink-soft">
                {formatDate(new Date(Date.now() + (cycle === "ANNUAL" ? 365 : 30) * 86400000))}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted">tax (GST 18%)</dt>
              <dd className="text-ink-soft">included</dd>
            </div>
          </>
        )}
        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-hairline/50">
          <dt className="text-ink font-medium">total today</dt>
          <dd className="text-ink font-display text-[1.25rem]">{formatINR(dueToday)}</dd>
        </div>
      </dl>
    </section>
  );

  const pane = (
    <section className="flex flex-col flex-1 w-full">
      {isTrial ? (
        <div className="rounded-[1rem] border border-sage/30 bg-sage/8 px-4 py-3">
          <p className="font-serif text-[0.95rem] text-ink-soft">
            you're setting up a payment method, not paying.
          </p>
          <ul className="mt-2 flex flex-col gap-1 font-caveat text-muted text-[0.9rem]">
            <li>· {formatINR(0)} is taken today</li>
            <li>· we'll remind you on day 12 and day 14</li>
            <li>· cancel any time and you stay on Free</li>
          </ul>
        </div>
      ) : (
        <p className="text-center md:text-left font-caveat text-muted text-[0.9rem]">
          card, UPI, netbanking or a wallet — <span className="text-rust">Razorpay</span> handles it.
        </p>
      )}

      {paymentsOff && (
        <div role="alert" className="mt-5 rounded-[0.95rem] border border-hairline bg-cream px-4 py-3 font-serif text-muted text-[0.92rem]">
          — payments aren't switched on for this server yet, so there's nothing to pay with. nothing was charged.
        </div>
      )}

      {error && (
        <div role="alert" className="mt-5 rounded-[0.95rem] border border-rust/30 bg-rust/5 px-4 py-3 font-serif text-rust text-[0.95rem]">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={begin}
        disabled={busy || !plan || paymentsOff || stage === "confirming"}
        className="mt-6 w-full rounded-[0.95rem] bg-rust text-cream-soft font-serif text-[1.05rem] py-3.5 md:py-4 hover:bg-rust-hover hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer shadow-[0_16px_30px_-16px_rgba(0,0,0,0.6)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
      >
        {stage === "confirming"
          ? "confirming…"
          : stage === "opening"
            ? "opening…"
            : isTrial
              ? `start the ${trialDays}-day trial — ${formatINR(0)} today`
              : `pay ${formatINR(dueToday)} →`}
      </button>

      {stage === "confirming" && (
        <p className="mt-3 text-center font-caveat text-muted text-[0.85rem]">
          {slow ? networkCopy.slow : "checking with the bank…"}
        </p>
      )}

      <p className="mt-6 md:mt-auto md:pt-6 flex items-center justify-center gap-1.5 font-caveat text-muted/70 text-[0.8rem]">
        <LockIcon /> secured by Razorpay · cancel any time
      </p>
    </section>
  );

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <div className="mx-auto w-full max-w-[440px] md:max-w-[920px] flex flex-col">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate(-1)}
            disabled={busy}
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center md:text-left md:pl-1 font-caveat text-rust text-[1.02rem]">
            {isTrial ? "start your trial" : "confirm payment"}
          </p>
          <span className="h-9 w-9 shrink-0 md:hidden" aria-hidden="true" />
        </div>

        <header className="hidden md:block mt-8 mb-1">
          <h2 className="font-display text-ink text-[2.1rem] leading-tight">
            {isTrial ? "nothing today." : "almost there."}
          </h2>
          <p className="font-serif text-muted text-[1.05rem] mt-1">
            {isTrial
              ? `${trialDays} days of ${plan ? plan.name : "Basic"}, then it's your call.`
              : `one confirmation and ${plan ? plan.name : "it"} is yours.`}
          </p>
        </header>

        <div className="mt-6 md:mt-7 grid grid-cols-1 md:grid-cols-[1.05fr_0.95fr] gap-5 md:gap-8 md:items-stretch">
          {summary}
          <div className="rounded-[1.4rem] md:bg-cream-light/50 md:border md:border-hairline/50 md:p-7 flex">{pane}</div>
        </div>

        <p className="mt-6 text-center font-caveat text-muted/70 text-[0.8rem]">
          {formatPaise(dueToday * 100)} due today
        </p>
      </div>
    </div>
  );
}
