import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hook/hooks";
import { trialState } from "../lib/trial";
import { trialCopy } from "../copy";

// Only shows in the final 24h of the trial; past T-0 the paywall takes over.

export default function TrialBanner() {
  const navigate = useNavigate();
  const billing = useAppSelector((s) => s.billing.billing);
  const { showBanner, daysRemaining } = trialState(billing);

  if (!showBanner) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[55] flex justify-center px-4 pt-[max(0.4rem,env(safe-area-inset-top))]"
    >
      <div className="w-full max-w-[560px] rounded-b-xl bg-rust text-cream-soft flex items-center justify-center gap-3 px-4 py-1.5 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)]">
        <span className="font-serif text-[0.88rem]">
          {daysRemaining === 1 ? trialCopy.bannerLastDay : trialCopy.banner(daysRemaining ?? 0)}
        </span>
        <button
          type="button"
          onClick={() => navigate("/plans")}
          className="font-serif  text-[0.85rem] underline underline-offset-2 hover:opacity-90 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
        >
          {trialCopy.bannerCta}
        </button>
      </div>
    </div>
  );
}
