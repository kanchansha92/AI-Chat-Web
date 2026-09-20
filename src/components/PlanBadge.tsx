import type { PlanId } from "../services/billingService";
import { planLabel } from "../services/plans";

// The little plan chip. `trialing` and `pastDue` come from the server's
// billing snapshot, never from anything worked out here.

const TONE: Record<PlanId, string> = {
  FREE: "bg-cream text-muted border border-hairline/70",
  BASIC: "bg-sage/15 text-sage-deep border border-sage/30",
  PLUS: "bg-rust text-cream-soft",
  ULTRA: "bg-ink text-cream-soft",
};

export default function PlanBadge({
  plan,
  trialing = false,
  pastDue = false,
  className = "",
}: {
  plan: PlanId | undefined | null;
  trialing?: boolean;
  pastDue?: boolean;
  className?: string;
}) {
  const id = (plan ?? "FREE") as PlanId;
  const label = trialing ? `${planLabel(id)} trial` : planLabel(id);
  const tone = pastDue ? "bg-rust/15 text-rust border border-rust/30" : TONE[id] ?? TONE.FREE;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.72rem] font-serif tracking-wide whitespace-nowrap ${tone} ${className}`}
    >
      {pastDue && <span aria-hidden="true">·</span>}
      {pastDue ? "payment due" : label}
    </span>
  );
}
