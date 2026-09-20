import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hook/hooks";
import { formatDate } from "../services/billingService";

// Shown while a renewal has failed and the grace window is still open. The
// plan keeps working for these few days - the point is to fix the card before
// it stops, not to lock anyone out early.

export default function PastDueBanner() {
  const navigate = useNavigate();
  const billing = useAppSelector((s) => s.billing.billing);
  if (!billing || !billing.pastDue) return null;
  const until = billing.subscription?.graceUntil ?? null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[56] flex justify-center px-4 pt-[max(0.4rem,env(safe-area-inset-top))]"
    >
      <div className="w-full max-w-[620px] rounded-b-xl bg-rust text-cream-soft flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)]">
        <span className="font-serif text-[0.88rem]">
          {until
            ? `your last payment didn't go through — your plan stays on until ${formatDate(until)}.`
            : "your last payment didn't go through."}
        </span>
        <button
          type="button"
          onClick={() => navigate("/settings/billing")}
          className="font-serif text-[0.85rem] underline underline-offset-2 hover:opacity-90 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
        >
          update payment method
        </button>
      </div>
    </div>
  );
}
