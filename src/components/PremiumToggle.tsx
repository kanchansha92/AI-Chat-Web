import { useAppSelector } from "../hook/hooks";
import { usePlan } from "../hook/usePlan";
import { formatCredits } from "../services/creditsService";

// "answer this one properly."
//
// The toggle only says what the user wants. Whether they get it is the
// server's call: the daily allowance first, then a credit if they said to
// spend one, and a plain PLAN_FEATURE refusal on a plan without premium
// replies at all. This draws the state it is told about and nothing more.

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[0.95rem] w-[0.95rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3z" />
      <path d="M18.5 15.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9z" />
    </svg>
  );
}

export default function PremiumToggle({
  on,
  onChange,
  disabled = false,
  className = "",
}: {
  on: boolean;
  onChange: (next: boolean, overflow: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { limits } = usePlan();
  const usage = useAppSelector((s) => s.billing.usage);
  const credits = useAppSelector((s) => s.billing.credits);
  const costs = useAppSelector((s) => s.billing.catalogue?.creditCosts);

  const allowance = limits?.premiumRepliesPerDay ?? 0;
  // Not part of this plan at all - the composer shouldn't offer it.
  if (limits && allowance === 0) return null;

  const meter = usage?.meters?.PREMIUM_REPLIES ?? null;
  const left = meter && !meter.unlimited ? (meter.remaining ?? 0) : null;
  const spent = left !== null && left <= 0;
  const cost = costs?.PREMIUM_REPLY ?? 1;
  const canAffordCredit = (credits?.total ?? 0) >= cost;

  // Once the day's allowance is gone, turning it on is also a decision to
  // spend a credit - so the label says so before the tap, not after.
  const overflow = spent;
  const blocked = spent && !canAffordCredit;

  const label = spent
    ? canAffordCredit
      ? `premium · ${formatCredits(cost)} credit`
      : "premium · no credits"
    : left !== null
      ? `premium · ${left} left today`
      : "premium";

  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled || blocked}
      title={
        spent
          ? canAffordCredit
            ? `today's premium replies are used up — this one costs ${formatCredits(cost)} credit`
            : "today's premium replies are used up, and there are no credits left"
          : "answer this one on the better model"
      }
      onClick={() => onChange(!on, overflow)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-serif text-[0.78rem] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        on
          ? "border-rust bg-rust text-cream-soft"
          : "border-hairline/70 bg-cream-light text-ink-soft hover:border-rust/50"
      } ${className}`}
    >
      <SparkIcon />
      {label}
    </button>
  );
}
