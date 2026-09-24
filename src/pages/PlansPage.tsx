import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadCatalogue, loadBilling } from "../redux/billingSlice";
import { sortPlans } from "../services/plans";
import PlanComparison from "../components/PlanComparison";
import {
  formatINR,
  priceFor,
  cycleSuffix,
  isUpgrade,
  planRank,
  formatDate,
} from "../services/billingService";
import type { Plan, PlanId, BillingCycle } from "../services/billingService";

// The pricing grid. Every price, every feature line and the trial's own terms
// come from GET /api/billing/plans - there is not a rupee hardcoded in this
// file, so what is shown is always what the server will charge.
//
// A Free user is never asked for a card here. The trial is one deliberate tap,
// and the checkout it opens takes ₹0 today.

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 6.5" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function FeatureRow({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="shrink-0 mt-[0.2rem] flex items-center justify-center h-[0.95rem] w-[0.95rem] text-rust">
        <CheckMark />
      </span>
      <span className="font-serif text-[0.92rem] leading-snug text-ink-soft">{label}</span>
    </li>
  );
}

/** The card that reads as active before the reader picks one. */
const DEFAULT_ACTIVE_PLAN: PlanId = "PLUS";

// True on every tier, so it is said once under the grid rather than repeated
// in four columns. Anything plan-specific stays in the server's marketing[].
const INCLUDED_EVERYWHERE = [
  "general ai assistant",
  "roleplay mode",
  "characters with memory",
  "unlimited messages on paid plans",
  "image generation",
  "journal",
  "encrypted at rest",
  "never used for training",
];

export default function PlansPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const catalogue = useAppSelector((s) => s.billing.catalogue);
  const billing = useAppSelector((s) => s.billing.billing);
  const [cycle, setCycle] = useState<BillingCycle>("ANNUAL");
  // Which card the user has tapped. Null means they have not chosen yet, and
  // the default below is the one shown as active.
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    if (!catalogue) dispatch(loadCatalogue());
    if (!billing) dispatch(loadBilling());
  }, [dispatch, catalogue, billing]);

  const plans = useMemo(() => (catalogue ? sortPlans(catalogue.plans) : []), [catalogue]);
  const currentPlan: PlanId = billing?.plan ?? "FREE";
  const trialAvailable = Boolean(billing?.trialAvailable);
  const trialDays = catalogue?.trial.days ?? 15;
  const trialMessagesPerDay = catalogue?.trial.messagesPerDay ?? 0;
  const basic = plans.find((p) => p.id === "BASIC");
  // Plus opens as the active card; every other card takes over the moment it
  // is tapped. Nothing here changes what the account is actually on.
  const activePlan: PlanId = selectedPlan ?? DEFAULT_ACTIVE_PLAN;

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/settings/billing"));

  const startCheckout = (plan: Plan) => {
    if (plan.id === "FREE") return;
    navigate(`/plans/checkout?plan=${plan.id}&cycle=${cycle}`);
  };

  const startTrial = () => navigate("/plans/checkout?trial=1");

  const planCard = (plan: Plan) => {
    const isCurrent = plan.id === currentPlan;
    const upgrade = isUpgrade(currentPlan, plan.id);
    const price = priceFor(plan, cycle);
    const isFree = plan.id === "FREE";
    const featured = plan.highlighted;
    // Basic is where the optional trial starts, and only for someone who has
    // never used one.
    const offersTrial = plan.id === "BASIC" && trialAvailable;
    const isActive = plan.id === activePlan;

    // One border rule per state, so the card the user picked is the only one
    // wearing the rust outline.
    const shell = isActive
      ? `border-rust ring-2 ring-rust/45 shadow-[0_24px_54px_-30px_rgba(37,49,94,0.55)] ${featured ? "bg-gradient-to-b from-cream-light to-cream lg:z-10" : "bg-cream-light"
      }`
      : featured
        ? // Same border as every other card - the featured plan is marked by
        // its badge and backing, never by a rust outline it has not earned.
        "border-hairline/60 bg-gradient-to-b from-cream-light to-cream shadow-[0_26px_60px_-32px_rgba(37,49,94,0.55)] hover:border-hairline lg:z-10"
        : "border-hairline/60 bg-cream-light hover:border-hairline hover:shadow-[0_20px_44px_-30px_rgba(0,0,0,0.45)]";

    return (
      <div
        key={plan.id}
        role="button"
        tabIndex={0}
        aria-pressed={isActive}
        aria-label={`select ${plan.name}`}
        onClick={() => setSelectedPlan(plan.id)}
        onKeyDown={(e) => {
          // Only the card itself - never a key press meant for the buttons
          // inside it, whose own activation must not be swallowed here.
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelectedPlan(plan.id);
          }
        }}
        className={`group relative flex h-full w-full cursor-pointer flex-col rounded-[1.5rem] border p-5 md:p-6 text-left transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rust/60 ${shell}`}
      >
        {plan.badge && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 rounded-full bg-rust text-cream-soft font-caveat text-[0.82rem] px-3.5 py-0.5 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.6)] whitespace-nowrap">
            {plan.badge}
          </span>
        )}

        {/* Fixed-height header slots so every card's rule, price and feature
            list sit on the same line, whatever the plan has to say. */}
        <p className="font-caveat text-muted text-[0.85rem] leading-[1.15rem] h-[1.15rem] line-clamp-1">
          {plan.tagline}
        </p>
        <h2 className="font-display text-ink text-[1.75rem] leading-none h-[1.75rem] mt-0.5 line-clamp-1">
          {plan.name}
        </h2>

        <p className="mt-2 h-[1.7rem] flex items-baseline">
          <span className="font-display text-rust text-[1.7rem] leading-none">{formatINR(price)}</span>
          {!isFree && <span className="font-caveat text-muted text-[0.85rem] ml-1.5">{cycleSuffix(cycle)}</span>}
        </p>

        <p className="font-caveat text-[0.82rem] leading-[1.1rem] h-[1.1rem] mt-0.5 line-clamp-1">
          {isFree ? (
            <span className="text-muted">free forever · no card</span>
          ) : (
            <span aria-hidden="true">&nbsp;</span>
          )}
        </p>

        <div className="dotted-rule my-4" />

        <ul className="flex flex-col gap-2 flex-1">
          {plan.marketing.map((label) => (
            <FeatureRow key={label} label={label} />
          ))}
        </ul>

        <div className="mt-5 flex flex-col gap-2 shrink-0">
          {isCurrent ? (
            <span className="rounded-full border border-hairline/70 bg-cream text-muted font-serif text-[0.88rem] px-5 py-2.5 text-center">
              your plan
            </span>
          ) : isFree ? (
            <span className="rounded-full border border-dashed border-hairline text-muted font-caveat text-[0.85rem] px-5 py-2.5 text-center">
              always here to come back to
            </span>
          ) : (
            <>
              {offersTrial && (
                <button
                  type="button"
                  onClick={startTrial}
                  className="rounded-full bg-rust text-cream-soft font-serif text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
                >
                  start {trialDays}-day {plan.name} trial
                </button>
              )}
              <button
                type="button"
                onClick={() => startCheckout(plan)}
                className={
                  offersTrial
                    ? "rounded-full border border-ink/15 text-ink-soft font-serif text-[0.86rem] px-5 py-2 hover:bg-ink/5 transition cursor-pointer"
                    : "rounded-full bg-rust text-cream-soft font-serif text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
                }
              >
                {offersTrial
                  ? `subscribe now instead`
                  : upgrade || planRank(currentPlan) === 0
                    ? `choose ${plan.name} →`
                    : `switch to ${plan.name} →`}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <div className="mx-auto w-full max-w-[1180px]">
        {/* Mobile only: on a large screen the page is reached from the nav and
            carries its own title, so this row would just be a second one. */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={goBack}
            className="h-9 w-9 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center font-caveat text-rust text-[1.02rem]">plans</p>
          <span className="h-9 w-9 shrink-0" aria-hidden="true" />
        </div>

        <header className="mt-6 md:mt-8 text-center">
          <h1 className="font-display text-ink text-[2rem] md:text-[2.5rem] leading-tight">
            your stories. your characters. your way.
          </h1>
          <p className="font-serif text-muted text-[1rem] md:text-[1.05rem] mt-3 max-w-[620px] mx-auto">
            a private ai for writing, roleplay and everyday chat. characters that remember, replies
            that feel human, and a space that's yours alone. no ads.
          </p>
          <p className="font-caveat text-rust text-[0.95rem] mt-2.5">
            free forever, with no card. the rest is there when you want more room.
          </p>
        </header>

        {/* monthly / annual, priced by the server either way */}
        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-full border border-hairline/70 bg-cream-light p-1">
            {(["MONTHLY", "ANNUAL"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                aria-pressed={cycle === c}
                className={`rounded-full px-4 py-1.5 font-serif text-[0.88rem] transition cursor-pointer ${cycle === c ? "bg-rust text-cream-soft" : "text-ink-soft hover:bg-ink/5"
                  }`}
              >
                {c === "MONTHLY" ? "monthly" : "yearly"}
              </button>
            ))}
          </div>
        </div>

        {!catalogue ? (
          <p className="mt-12 text-center font-caveat text-muted text-[1rem]">bringing up the plans…</p>
        ) : (
          <>
            {/* auto-rows-fr + items-stretch: every card in the grid gets the
                same height and the same width, in every breakpoint. */}
            <div className="mt-8 md:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr items-stretch gap-5 lg:gap-6">
              {plans.map(planCard)}
            </div>

            {/* Said once, under the grid - these hold on every tier. */}
            <section className="mt-9 rounded-[1.5rem] border border-hairline/60 bg-cream-light/70 px-5 py-5 md:px-7 md:py-6">
              <p className="text-center font-caveat text-rust text-[0.95rem]">every plan includes</p>
              <ul className="mt-3.5 flex flex-wrap justify-center gap-x-3 gap-y-2.5">
                {INCLUDED_EVERYWHERE.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-full border border-hairline/50 bg-cream px-3.5 py-1.5"
                  >
                    <span className="shrink-0 flex items-center justify-center h-[0.95rem] w-[0.95rem] text-rust">
                      <CheckMark />
                    </span>
                    <span className="font-serif text-[0.88rem] leading-none text-ink-soft">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* The whole grid, line by line - opened only if asked for. */}
            <div className="mt-9">
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowCompare((v) => !v)}
                  aria-expanded={showCompare}
                  aria-controls="plan-comparison"
                  className="rounded-full border border-hairline/70 bg-cream-light text-ink-soft font-serif text-[0.9rem] px-5 py-2 hover:border-hairline hover:bg-cream transition cursor-pointer"
                >
                  {showCompare ? "hide the comparison ↑" : "compare plans ↓"}
                </button>
              </div>

              {showCompare && (
                <div id="plan-comparison">
                  <PlanComparison plans={plans} activePlan={activePlan} trialMessagesPerDay={trialMessagesPerDay} />
                </div>
              )}
            </div>

            {trialAvailable && basic && (
              <p className="mt-8 text-center font-serif text-muted text-[0.92rem] max-w-[560px] mx-auto">
                the {trialDays}-day {basic.name} trial takes{" "}
                <span className="text-ink-soft">₹0 today</span> you add a card or UPI to set it up, and{" "}
                {formatINR(basic.price.monthly)} is charged on{" "}
                {formatDate(new Date(Date.now() + (trialDays + 1) * 86400000))} unless you cancel first.
                nothing starts on its own.
              </p>
            )}

            {catalogue.packs.length > 0 && (
              <div className="mt-10 text-center">
                <p className="font-caveat text-muted text-[0.95rem]">
                  need a little extra? credits top up anything you have run out of —{" "}
                  {catalogue.packs.map((p, i) => (
                    <span key={p.id}>
                      {i > 0 ? " · " : ""}
                      {formatINR(p.priceRupees)} for {p.credits}
                    </span>
                  ))}
                  , and they never expire.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/settings/credits")}
                  className="mt-2 font-serif text-[0.9rem] text-rust hover:underline underline-offset-2 cursor-pointer"
                >
                  see credits →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
