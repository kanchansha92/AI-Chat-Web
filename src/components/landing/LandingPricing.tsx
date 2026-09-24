import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PlanComparison from "../PlanComparison";
import { sortPlans } from "../../services/plans";
import { cycleSuffix, formatINR, priceFor } from "../../services/billingService";
import type { BillingCycle, Plan, PlanCatalogue } from "../../services/billingService";

/* Pricing and credits for the signed-out landing page.

   Same rule as PlansPage: every rupee, limit, pack and credit cost comes from
   GET /api/billing/plans (public). There is no fallback price table - if the
   catalogue can't be fetched the section says so and offers a retry, because a
   stale price on the front door is worse than none. Every CTA here goes to
   /signup; choosing and paying happens on /plans once there's an account. */

export type CatalogueState = "loading" | "error" | "ready";

/** Feature lines a card shows before "+ N more features". */
const FEATURE_PREVIEW = 8;

function Check() {
    return (
        <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 6.5" />
        </svg>
    );
}

/** Whole-percent saving of a year paid up front vs twelve monthly payments. */
function annualSaving(plan: Plan): number {
    const twelve = plan.price.monthly * 12;
    if (!twelve || !plan.price.annual) return 0;
    return Math.max(0, Math.round((1 - plan.price.annual / twelve) * 100));
}

function Unavailable({ state, onRetry }: { state: CatalogueState; onRetry: () => void }) {
    if (state === "loading") {
        return <p className="mt-10 text-center font-caveat text-muted text-[1rem]">bringing up the plans…</p>;
    }
    return (
        <div className="mt-10 text-center">
            <p className="text-muted text-[0.95rem]">the plans didn’t load just now.</p>
            <button
                type="button"
                onClick={onRetry}
                className="mt-3 lp-btn-outline cursor-pointer rounded-full px-5 py-2 text-[0.9rem] text-ink-soft hover:text-ink"
            >
                try again
            </button>
        </div>
    );
}

// ─── pricing ─────────────────────────────────────────────────────────────────

export function PricingSection({
    catalogue,
    state,
    onRetry,
}: {
    catalogue: PlanCatalogue | null;
    state: CatalogueState;
    onRetry: () => void;
}) {
    const navigate = useNavigate();
    const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
    // Which card the visitor has tapped - same behaviour as PlansPage: Plus
    // reads as active until another card is chosen.
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [showCompare, setShowCompare] = useState(false);
    // Long feature lists are cut to FEATURE_PREVIEW lines until the visitor
    // asks for the rest. One switch for every card, so the cards stay level.
    const [showAllFeatures, setShowAllFeatures] = useState(false);

    const plans = useMemo(() => (catalogue ? sortPlans(catalogue.plans) : []), [catalogue]);
    const bestSaving = useMemo(() => Math.max(0, ...plans.map(annualSaving)), [plans]);
    const trial = catalogue?.trial ?? null;
    const trialPlan = trial ? plans.find((p) => p.id === trial.plan) : undefined;
    const featured = plans.find((p) => p.highlighted)?.id ?? "PLUS";

    /* The card is PlansPage's card, line for line (tagline, name, price,
       dotted rule, the server's feature list, CTA at the foot), so the
       landing page and /plans show the same thing. Only the buttons differ:
       a visitor has no account yet, so every choice goes to sign-up. */
    const card = (plan: Plan) => {
        const isFree = plan.price.monthly === 0;
        const price = priceFor(plan, cycle);
        const offersTrial = Boolean(trial && trial.plan === plan.id && trial.days > 0);
        const featuredCard = plan.highlighted;
        const isActive = plan.id === (selectedPlan ?? featured);
        // The landing page mentions no AI models, so a feature line about them
        // (e.g. "Model selection with credits") is left off here only.
        const features = plan.marketing.filter((l) => !/\bmodels?\b/i.test(l));
        const extra = features.length - FEATURE_PREVIEW;
        const shown = showAllFeatures || extra <= 0 ? features : features.slice(0, FEATURE_PREVIEW);

        const shell = isActive
            ? `border-rust ring-2 ring-rust/45 shadow-[0_24px_54px_-30px_rgba(37,49,94,0.55)] ${featuredCard ? "bg-gradient-to-b from-cream-light to-cream lg:z-10" : "bg-cream-light"}`
            : featuredCard
              ? "border-hairline/60 bg-gradient-to-b from-cream-light to-cream shadow-[0_26px_60px_-32px_rgba(37,49,94,0.55)] hover:border-hairline lg:z-10"
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
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPlan(plan.id);
                    }
                }}
                className={`group relative flex h-full w-full cursor-pointer flex-col rounded-[1.5rem] border p-5 md:p-6 text-left transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-rust/60 ${shell}`}
            >
                {plan.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0 rounded-full bg-rust text-cream-soft text-[0.82rem] px-3.5 py-0.5 shadow-[0_8px_18px_-8px_rgba(0,0,0,0.6)] whitespace-nowrap">
                        {plan.badge}
                    </span>
                )}

                <p className="text-muted text-[0.85rem] leading-[1.15rem] h-[1.15rem] line-clamp-1">{plan.tagline}</p>
                <h3 className="text-ink text-[1.75rem] leading-none h-[1.75rem] mt-0.5 line-clamp-1">{plan.name}</h3>

                <p className="mt-2 h-[1.7rem] flex items-baseline">
                    <span className="text-rust text-[1.7rem] leading-none">{formatINR(price)}</span>
                    {!isFree && <span className="text-muted text-[0.85rem] ml-1.5">{cycleSuffix(cycle)}</span>}
                </p>

                <p className="text-[0.82rem] leading-[1.1rem] h-[1.1rem] mt-0.5 line-clamp-1">
                    {isFree ? <span className="text-muted">free forever · no card</span> : <span aria-hidden="true">&nbsp;</span>}
                </p>

                <div className="dotted-rule my-4" />

                <ul id={`features-${plan.id}`} className="flex flex-col gap-2">
                    {shown.map((label) => (
                        <li key={label} className="flex items-start gap-2.5">
                            <span className="shrink-0 mt-[0.2rem] flex items-center justify-center h-[0.95rem] w-[0.95rem] text-rust">
                                <Check />
                            </span>
                            <span className="text-[0.92rem] leading-snug text-ink-soft">{label}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex-1">
                    {extra > 0 && (
                        <button
                            type="button"
                            aria-expanded={showAllFeatures}
                            aria-controls={`features-${plan.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAllFeatures((v) => !v);
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2 -ml-2 py-1 text-[0.86rem] text-rust hover:bg-rust/5 transition-colors cursor-pointer"
                        >
                            {showAllFeatures ? "show less" : `+ ${extra} more feature${extra === 1 ? "" : "s"}`}
                            <svg
                                viewBox="0 0 24 24"
                                className={"h-3.5 w-3.5 transition-transform duration-200 " + (showAllFeatures ? "rotate-180" : "")}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="mt-5 flex flex-col gap-2 shrink-0">
                    {isFree ? (
                        <button
                            type="button"
                            onClick={() => navigate("/signup")}
                            className="rounded-full border border-hairline/70 bg-cream text-ink-soft text-[0.88rem] px-5 py-2.5 text-center hover:text-ink hover:border-hairline transition cursor-pointer"
                        >
                            start free →
                        </button>
                    ) : (
                        <>
                            {offersTrial && (
                                <button
                                    type="button"
                                    onClick={() => navigate("/signup")}
                                    className="rounded-full bg-rust text-cream-soft text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
                                >
                                    start {trial!.days}-day {plan.name} trial
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => navigate("/signup")}
                                className={
                                    offersTrial
                                        ? "rounded-full border border-ink/15 text-ink-soft text-[0.86rem] px-5 py-2 hover:bg-ink/5 transition cursor-pointer"
                                        : "rounded-full bg-rust text-cream-soft text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
                                }
                            >
                                {offersTrial ? "subscribe now instead" : `choose ${plan.name} →`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* monthly / yearly */}
            <div className="mt-8 flex flex-col items-center gap-2">
                <div role="group" aria-label="billing cycle" className="inline-flex rounded-full border border-hairline/70 bg-cream-light p-1">
                    {(["MONTHLY", "ANNUAL"] as BillingCycle[]).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCycle(c)}
                            aria-pressed={cycle === c}
                            className={`rounded-full px-4 py-1.5 text-[0.88rem] transition cursor-pointer ${cycle === c ? "bg-rust text-cream-soft" : "text-ink-soft hover:bg-ink/5"}`}
                        >
                            {c === "MONTHLY" ? "monthly" : "yearly"}
                        </button>
                    ))}
                </div>
                <p className="font-caveat text-rust text-[0.92rem] min-h-[1.2rem]">
                    {bestSaving > 0 ? `pay yearly and save up to ${bestSaving}%` : " "}
                </p>
            </div>

            {state !== "ready" || !catalogue ? (
                <Unavailable state={state} onRetry={onRetry} />
            ) : (
                <>
                    {/* equal-height cards from lg, as on /plans; on phones each card is only as tall as its list */}
                    <div className="lp-app-font mt-8 md:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:auto-rows-fr items-stretch gap-5 lg:gap-6">
                        {plans.map(card)}
                    </div>

                    {trial && trialPlan && trial.days > 0 && (
                        <p className="mt-8 text-center text-muted text-[0.92rem] max-w-[36rem] mx-auto text-pretty">
                            {trialPlan.name} can be tried free for {trial.days} days, once per account.{" "}
                            <span className="text-ink-soft">₹0 today</span> - you add a card or UPI to set it up, and
                            nothing is charged if you cancel before it renews.
                        </p>
                    )}

                    <div className="mt-8 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setShowCompare((v) => !v)}
                            aria-expanded={showCompare}
                            aria-controls="landing-plan-comparison"
                            className="lp-btn-outline cursor-pointer rounded-full px-5 py-2 text-[0.9rem] text-ink-soft hover:text-ink"
                        >
                            {showCompare ? "hide the full comparison ↑" : "compare every feature ↓"}
                        </button>
                    </div>
                    {showCompare && (
                        <div id="landing-plan-comparison">
                            <PlanComparison
                                plans={plans}
                                activePlan={featured}
                                trialMessagesPerDay={trial?.messagesPerDay ?? 0}
                                hideModelRows
                            />
                        </div>
                    )}
                </>
            )}
        </>
    );
}

// ─── credits ─────────────────────────────────────────────────────────────────

/** Human names for config/plans.js CREDIT_COSTS keys. Unknown keys fall back
    to a tidied version of the key, so a new cost still shows up. */
const COST_LABELS: Record<string, string> = {
    PREMIUM_REPLY: "a premium reply, past your daily allowance",
    IMAGE: "an image, past your plan’s allowance",
    HD_IMAGE: "an HD image",
    REFERENCE_EDIT: "an edit from a reference image",
    PREMIUM_VOICE: "a premium voice reply",
};

const costLabel = (key: string) =>
    COST_LABELS[key] ?? key.toLowerCase().replace(/_/g, " ");

const credits = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} credit${n === 1 ? "" : "s"}`;

export function CreditsSection({
    catalogue,
    state,
    onRetry,
}: {
    catalogue: PlanCatalogue | null;
    state: CatalogueState;
    onRetry: () => void;
}) {
    const navigate = useNavigate();
    if (state !== "ready" || !catalogue) return <Unavailable state={state} onRetry={onRetry} />;

    const plans = sortPlans(catalogue.plans).filter((p) => p.limits.monthlyCredits > 0);
    const packs = [...catalogue.packs].sort((a, b) => a.priceRupees - b.priceRupees);
    const costs = Object.entries(catalogue.creditCosts);
    // The pack with the best credits-per-rupee is the one worth pointing at.
    const bestPack = packs.reduce<string | null>(
        (best, p) => {
            const cur = packs.find((x) => x.id === best);
            return !cur || p.credits / p.priceRupees > cur.credits / cur.priceRupees ? p.id : best;
        },
        null
    );

    return (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-5 lg:gap-6 items-start">
            {/* left: packs + what comes with a plan */}
            <div className="flex flex-col gap-5">
                {packs.length > 0 && (
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                        {packs.map((p) => {
                            const extra = Math.round((p.credits / p.priceRupees - 1) * 100);
                            const best = p.id === bestPack && packs.length > 1;
                            return (
                                <div
                                    key={p.id}
                                    className={
                                        "lp-card relative rounded-[1.1rem] sm:rounded-[1.3rem] px-3 sm:px-5 py-4 sm:py-5 flex flex-col " +
                                        (best ? "ring-1 ring-rust/40" : "")
                                    }
                                >
                                    {best && (
                                        <span className="absolute -top-2.5 right-4 rounded-full bg-rust text-cream-soft font-caveat text-[0.75rem] px-2.5 py-0.5">
                                            best value
                                        </span>
                                    )}
                                    <p className="font-display text-ink text-[1.45rem] sm:text-[1.9rem] leading-none">{p.credits.toLocaleString("en-IN")}</p>
                                    <p className="font-caveat text-muted text-[0.85rem] mt-1">credits</p>
                                    <p className="text-ink-soft text-[1rem] mt-4">{formatINR(p.priceRupees)}</p>
                                    <p className="font-caveat text-rust text-[0.82rem] min-h-[1.1rem]">
                                        {extra >= 2 ? `+${extra}% extra` : " "}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="lp-card rounded-[1.3rem] px-5 sm:px-6 py-5">
                    <p className="lp-label">how credits work</p>
                    <ul className="mt-3 flex flex-col gap-2.5 text-ink-soft text-[0.9rem] leading-[1.6]">
                        <li className="flex gap-2.5">
                            <span className="mt-[0.2rem] text-rust shrink-0"><Check /></span>
                            <span>Credits you buy <span className="text-ink">never expire</span>, and work on every plan - Free included.</span>
                        </li>
                        <li className="flex gap-2.5">
                            <span className="mt-[0.2rem] text-rust shrink-0"><Check /></span>
                            <span>Paid plans add credits every month. They’re spent first, before anything you bought.</span>
                        </li>
                        <li className="flex gap-2.5">
                            <span className="mt-[0.2rem] text-rust shrink-0"><Check /></span>
                            <span>Your balance, what’s expiring and every spend are listed in settings → credits.</span>
                        </li>
                    </ul>

                    {plans.length > 0 && (
                        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-2.5">
                            {plans.map((p) => (
                                <div key={p.id} className="rounded-[0.9rem] border border-hairline bg-cream/60 px-2.5 sm:px-3.5 py-2.5">
                                    <p className="text-muted text-[0.78rem]">{p.name}</p>
                                    <p className="text-ink text-[0.92rem]">
                                        {p.limits.monthlyCredits} / month
                                    </p>
                                    <p className="font-caveat text-muted text-[0.76rem]">
                                        {p.limits.rolloverMonths > 0
                                            ? `rolls over ${p.limits.rolloverMonths} month${p.limits.rolloverMonths === 1 ? "" : "s"}`
                                            : "resets each month"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* right: what a credit buys */}
            <div className="lp-card rounded-[1.3rem] px-5 sm:px-6 py-5">
                <p className="lp-label">what credits are for</p>
                {costs.length > 0 && (
                    <ul className="mt-3 divide-y divide-hairline/80">
                        {costs.map(([key, n]) => (
                            <li key={key} className="flex items-baseline justify-between gap-4 py-2.5">
                                <span className="text-ink-soft text-[0.9rem] first-letter:uppercase">{costLabel(key)}</span>
                                <span className="text-ink text-[0.9rem] whitespace-nowrap">{credits(n)}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <button
                    type="button"
                    onClick={() => navigate("/signup")}
                    className="mt-6 cursor-pointer text-[0.9rem] text-rust hover:underline underline-offset-2"
                >
                    open a notebook, top up later →
                </button>
            </div>
        </div>
    );
}
