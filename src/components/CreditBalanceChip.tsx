import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hook/hooks";
import { formatCredits } from "../services/creditsService";

// The balance, as the server last reported it. It moves when a response says
// it moved - never when the client thinks something cost something.

export default function CreditBalanceChip({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const credits = useAppSelector((s) => s.billing.credits);
  const plan = useAppSelector((s) => s.billing.billing?.plan);
  // Nothing to show before the first billing response lands.
  if (!credits) return null;
  // A Free account with no credits has nothing to say here yet.
  if (plan === "FREE" && credits.total === 0) return null;

  const low = credits.total <= 5;
  return (
    <button
      type="button"
      onClick={() => navigate("/settings/credits")}
      title="credits"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-serif text-[0.8rem] transition cursor-pointer ${
        low
          ? "border-rust/30 bg-rust/8 text-rust hover:bg-rust/12"
          : "border-hairline/70 bg-cream-light text-ink-soft hover:brightness-95"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-[0.85rem] w-[0.85rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
      </svg>
      {formatCredits(credits.total)}
    </button>
  );
}
