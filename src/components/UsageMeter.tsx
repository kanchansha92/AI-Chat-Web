import type { Meter } from "../services/usageService";
import { METER_LABELS, meterDisplay, resetLabel } from "../services/usageService";

// A single allowance, drawn from the server's snapshot. Unlimited draws no bar
// at all - a full bar would read as "nearly out" when it means the opposite.

export default function UsageMeter({ meter, compact = false }: { meter: Meter; compact?: boolean }) {
  const { used, limit } = meterDisplay(meter);
  const label = METER_LABELS[meter.metric] ?? meter.metric.toLowerCase();

  if (meter.unlimited) {
    return (
      <div className="flex items-baseline justify-between gap-3 py-1.5">
        <span className="font-serif text-[0.92rem] text-ink-soft">{label}</span>
        <span className="font-caveat text-[0.9rem] text-sage-deep">unlimited</span>
      </div>
    );
  }

  const cap = meter.limit ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((meter.used / cap) * 100)) : 100;
  const spent = cap > 0 && meter.used >= cap;
  const nearlyOut = !spent && pct >= 80;
  const bar = spent ? "bg-rust" : nearlyOut ? "bg-rust-light" : "bg-sage";
  const reset = resetLabel(meter.resetAt);

  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-[0.92rem] text-ink-soft">{label}</span>
        <span className={`font-caveat text-[0.9rem] ${spent ? "text-rust" : "text-muted"}`}>
          {cap === 0 ? "not on this plan" : `${used} / ${limit}`}
        </span>
      </div>
      {cap > 0 && (
        <div className="mt-1.5 h-1 w-full rounded-full bg-ink/8 overflow-hidden" role="presentation">
          <div className={`h-full rounded-full transition-[width] duration-500 ${bar}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {!compact && reset && cap > 0 && (
        <p className="mt-1 font-caveat text-[0.8rem] text-muted/80">{reset}</p>
      )}
    </div>
  );
}
