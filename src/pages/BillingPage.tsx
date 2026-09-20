import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadBilling, loadCatalogue, awaitActivation, setBusy } from "../redux/billingSlice";
import {
  billingService,
  formatINR,
  formatPaise,
  formatDate,
  priceFor,
} from "../services/billingService";
import type { InvoiceRow, ProviderInvoice, PlanId } from "../services/billingService";
import { openCheckout, CheckoutDismissed, CheckoutFailed } from "../lib/razorpay";
import { ApiError } from "../services/authService";
import { formatCredits } from "../services/creditsService";
import PlanBadge from "../components/PlanBadge";

// Plan & billing. Everything on this page is the server's answer: the plan,
// the status, the renewal date, the card on file, the invoices. Cancelling
// waits for the backend to confirm before the screen changes - the old
// optimistic "set the plan to Free in Redux" told people a lie that a refresh
// then took back.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const STATUS_COPY: Record<string, string> = {
  INCOMPLETE: "not finished",
  TRIALING: "on trial",
  ACTIVE: "active",
  PAST_DUE: "payment due",
  CANCELLED: "ending",
  EXPIRED: "ended",
  PAUSED: "paused",
};

function methodLabel(type: string, last4: string | null): string {
  const base =
    type === "CARD" ? "card" : type === "UPI" ? "UPI" : type === "NETBANKING" ? "netbanking" : type === "WALLET" ? "wallet" : null;
  if (!base) return "none yet";
  return last4 ? `${base} ending ${last4}` : base;
}

export default function BillingPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const billing = useAppSelector((s) => s.billing.billing);
  const credits = useAppSelector((s) => s.billing.credits);
  const catalogue = useAppSelector((s) => s.billing.catalogue);
  const user = useAppSelector((s) => s.auth.user);
  const busy = useAppSelector((s) => s.billing.busy);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [invoices, setInvoices] = useState<{ payments: InvoiceRow[]; providerInvoices: ProviderInvoice[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(loadBilling());
    if (!catalogue) dispatch(loadCatalogue());
    billingService
      .invoices()
      .then(setInvoices)
      .catch(() => setInvoices({ payments: [], providerInvoices: [] }));
  }, [dispatch, catalogue]);

  const sub = billing?.subscription ?? null;
  const plan: PlanId = billing?.plan ?? "FREE";
  const planFromCatalogue = catalogue?.plans.find((p) => p.id === plan) ?? null;
  const isPaid = plan !== "FREE";

  async function run(work: () => Promise<void>) {
    setError(null);
    setNotice(null);
    dispatch(setBusy(true));
    try {
      await work();
    } catch (e) {
      if (e instanceof CheckoutDismissed) {
        /* they closed the window - nothing to say */
      } else if (e instanceof CheckoutFailed || e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("— that didn't work just now. try again?");
      }
    } finally {
      dispatch(setBusy(false));
    }
  }

  const cancel = () =>
    run(async () => {
      const { billing: after } = await billingService.cancel();
      setConfirmingCancel(false);
      await dispatch(loadBilling()).unwrap();
      setNotice(
        after.subscription?.cancelAtPeriodEnd && after.subscription.currentPeriodEnd
          ? `cancelled. ${planFromCatalogue?.name ?? "your plan"} stays on until ${formatDate(after.subscription.currentPeriodEnd)}.`
          : "cancelled. you're back on Free — everything you made is still here."
      );
    });

  const resume = () =>
    run(async () => {
      const { checkout } = await billingService.resume();
      if (checkout) {
        const was = sub?.status ?? null;
        const result = await openCheckout({
          checkout,
          name: user?.name,
          email: user?.email,
          description: "resume your plan",
        });
        await billingService.verify({
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_subscription_id: result.razorpay_subscription_id ?? checkout.subscriptionId ?? "",
          razorpay_signature: result.razorpay_signature,
        });
        await dispatch(awaitActivation({ was })).unwrap();
      } else {
        await dispatch(loadBilling()).unwrap();
      }
      setNotice("resumed.");
    });

  const updatePaymentMethod = () =>
    run(async () => {
      const { checkout } = await billingService.paymentMethod();
      const result = await openCheckout({
        checkout,
        name: user?.name,
        email: user?.email,
        description: "update your payment method",
      });
      await billingService.verify({
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_subscription_id: result.razorpay_subscription_id ?? checkout.subscriptionId ?? "",
        razorpay_signature: result.razorpay_signature,
      });
      await dispatch(loadBilling()).unwrap();
      setNotice("payment method updated.");
    });

  const heroCard = (
    <section
      className={`rounded-[1.4rem] border p-5 md:p-7 ${
        isPaid ? "border-rust/70 bg-gradient-to-b from-cream-light to-cream ring-1 ring-rust/10" : "border-hairline/60 bg-cream-light"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-caveat text-muted text-[0.85rem]">current plan</p>
          <h2 className="font-display text-ink text-[1.8rem] md:text-[2.1rem] leading-none mt-0.5">
            {planFromCatalogue?.name ?? plan}
          </h2>
        </div>
        <PlanBadge plan={plan} trialing={Boolean(billing?.trialing)} pastDue={Boolean(billing?.pastDue)} />
      </div>

      {billing?.trialing && billing.trialDaysRemaining !== null && (
        <p className="mt-2 font-serif text-ink-soft text-[0.95rem]">
          {billing.trialDaysRemaining === 0
            ? "your trial ends today."
            : `${billing.trialDaysRemaining} ${billing.trialDaysRemaining === 1 ? "day" : "days"} of your trial left.`}
          {sub?.trialEndsAt && planFromCatalogue && (
            <span className="text-muted">
              {" "}
              {formatINR(planFromCatalogue.price.monthly)} on {formatDate(sub.trialEndsAt)} unless you cancel.
            </span>
          )}
        </p>
      )}

      {isPaid && !billing?.trialing && planFromCatalogue && sub && (
        <p className="mt-2 font-display text-rust text-[1.35rem] leading-none">
          {formatINR(priceFor(planFromCatalogue, sub.cycle))}
          <span className="font-caveat text-muted text-[0.82rem] ml-1.5">
            {sub.cycle === "ANNUAL" ? "/ year" : "/ month"}
          </span>
        </p>
      )}

      <div className="dotted-rule my-4 md:my-5" />

      <dl className="flex flex-col gap-2.5 font-serif text-[0.94rem]">
        {sub && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">status</dt>
            <dd className="text-ink-soft">{STATUS_COPY[sub.status] ?? sub.status.toLowerCase()}</dd>
          </div>
        )}
        {sub?.currentPeriodEnd && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">{sub.cancelAtPeriodEnd ? "access until" : "renews"}</dt>
            <dd className="text-ink-soft">{formatDate(sub.currentPeriodEnd)}</dd>
          </div>
        )}
        {sub?.pendingPlan && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">changes to</dt>
            <dd className="text-ink-soft">
              {sub.pendingPlan.toLowerCase()} {sub.currentPeriodEnd ? `on ${formatDate(sub.currentPeriodEnd)}` : "next cycle"}
            </dd>
          </div>
        )}
        {sub && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">payment method</dt>
            <dd className="text-ink-soft">{methodLabel(sub.paymentMethodType, sub.paymentMethodLast4)}</dd>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted">credits</dt>
          <dd className="text-ink-soft">{credits ? formatCredits(credits.total) : "—"}</dd>
        </div>
      </dl>

      {billing?.pastDue && (
        <div className="mt-4 rounded-[0.95rem] border border-rust/30 bg-rust/5 px-4 py-3 font-serif text-rust text-[0.92rem]">
          your last payment didn't go through
          {sub?.graceUntil ? ` — your plan stays on until ${formatDate(sub.graceUntil)}.` : "."}
        </div>
      )}
    </section>
  );

  const actions = (
    <section className="rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7 flex flex-col gap-3">
      <p className="font-caveat text-muted text-[0.85rem]">manage</p>

      {billing?.trialAvailable && (
        <button
          type="button"
          onClick={() => navigate("/plans/checkout?trial=1")}
          className="w-full rounded-full bg-rust text-cream-soft font-serif text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
        >
          start the {catalogue?.trial.days ?? 15}-day Basic trial — ₹0 today
        </button>
      )}

      <button
        type="button"
        onClick={() => navigate("/plans")}
        className="w-full rounded-full border border-hairline/70 bg-cream text-ink-soft font-serif text-[0.9rem] px-5 py-2.5 hover:brightness-95 transition cursor-pointer flex items-center justify-center gap-2"
      >
        {isPaid ? "change plan" : "see plans"} <ArrowIcon />
      </button>

      <button
        type="button"
        onClick={() => navigate("/settings/credits")}
        className="w-full rounded-full border border-hairline/70 bg-cream text-ink-soft font-serif text-[0.9rem] px-5 py-2.5 hover:brightness-95 transition cursor-pointer flex items-center justify-center gap-2"
      >
        credits &amp; top-ups <ArrowIcon />
      </button>

      <button
        type="button"
        onClick={() => navigate("/settings/usage")}
        className="w-full rounded-full border border-hairline/70 bg-cream text-ink-soft font-serif text-[0.9rem] px-5 py-2.5 hover:brightness-95 transition cursor-pointer flex items-center justify-center gap-2"
      >
        what you've used <ArrowIcon />
      </button>

      {sub && ["TRIALING", "ACTIVE", "PAST_DUE"].includes(sub.status) && (
        <button
          type="button"
          onClick={updatePaymentMethod}
          disabled={busy}
          className="w-full rounded-full border border-hairline/70 bg-cream text-ink-soft font-serif text-[0.9rem] px-5 py-2.5 hover:brightness-95 transition cursor-pointer disabled:opacity-60"
        >
          update payment method
        </button>
      )}

      {sub && (sub.cancelAtPeriodEnd || sub.status === "PAUSED") && sub.status !== "EXPIRED" && (
        <button
          type="button"
          onClick={resume}
          disabled={busy}
          className="w-full rounded-full bg-sage text-cream-soft font-serif text-[0.9rem] px-5 py-2.5 hover:brightness-95 transition cursor-pointer disabled:opacity-60"
        >
          resume my plan
        </button>
      )}

      {sub && ["TRIALING", "ACTIVE", "PAST_DUE"].includes(sub.status) && !sub.cancelAtPeriodEnd && (
        <div className="mt-1">
          {confirmingCancel ? (
            <div className="rounded-[0.95rem] border border-rust/25 bg-rust/5 p-4">
              <p className="font-serif text-ink-soft text-[0.92rem]">
                {billing?.trialing
                  ? "cancel the trial? you'll go back to Free right away — nothing was charged, and nothing you made goes anywhere."
                  : sub.currentPeriodEnd
                    ? `cancel? you keep ${planFromCatalogue?.name ?? "your plan"} until ${formatDate(sub.currentPeriodEnd)}, then move to Free. nothing is deleted.`
                    : "cancel your plan?"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  disabled={busy}
                  className="flex-1 rounded-full bg-rust text-cream-soft font-serif text-[0.88rem] px-4 py-2 hover:bg-rust-hover transition cursor-pointer disabled:opacity-60"
                >
                  {busy ? "cancelling…" : "yes, cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={busy}
                  className="flex-1 rounded-full border border-ink/15 text-ink-soft font-serif text-[0.88rem] px-4 py-2 hover:bg-ink/5 transition cursor-pointer"
                >
                  keep it
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="w-full font-serif text-[0.88rem] text-muted hover:text-rust transition cursor-pointer py-1"
            >
              cancel {billing?.trialing ? "trial" : "subscription"}
            </button>
          )}
        </div>
      )}

      {notice && <p role="status" className="font-caveat text-sage-deep text-[0.9rem]">{notice}</p>}
      {error && <p role="alert" className="font-serif text-rust text-[0.9rem]">{error}</p>}
    </section>
  );

  const history = (
    <section className="rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
      <p className="font-caveat text-muted text-[0.85rem]">billing history</p>
      {!invoices ? (
        <p className="mt-3 font-caveat text-muted text-[0.9rem]">looking…</p>
      ) : invoices.payments.length === 0 ? (
        <p className="mt-3 font-serif text-muted text-[0.92rem]">nothing yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-hairline/50">
          {invoices.payments.map((p) => {
            const invoice = invoices.providerInvoices.find((i) => i.paymentId === p.providerPaymentId);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-serif text-[0.92rem] text-ink-soft truncate">
                    {p.kind === "CREDIT_PACK"
                      ? `${p.creditsGranted ?? ""} credits`
                      : `${(p.plan ?? "").toLowerCase()} · ${p.cycle === "ANNUAL" ? "yearly" : "monthly"}`}
                  </p>
                  <p className="font-caveat text-muted text-[0.8rem]">
                    {formatDate(p.createdAt)}
                    {p.status !== "CAPTURED" ? ` · ${p.status.toLowerCase().replace(/_/g, " ")}` : ""}
                    {p.refundedPaise > 0 ? ` · ${formatPaise(p.refundedPaise)} refunded` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-serif text-[0.92rem] text-ink">{formatPaise(p.amountPaise)}</p>
                  {invoice?.shortUrl && (
                    <a
                      href={invoice.shortUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-caveat text-[0.8rem] text-rust hover:underline underline-offset-2"
                    >
                      invoice
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings"))}
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center md:text-left md:pl-1 font-caveat text-rust text-[1.02rem]">plan &amp; billing</p>
          <span className="h-9 w-9 shrink-0 md:hidden" aria-hidden="true" />
        </div>

        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          <div className="flex flex-col gap-5 md:gap-6">
            {heroCard}
            {history}
          </div>
          {actions}
        </div>
      </div>
    </div>
  );
}
