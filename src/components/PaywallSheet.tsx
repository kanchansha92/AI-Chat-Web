import { useNavigate } from "react-router-dom";
import { trialCopy } from "../copy";

export default function PaywallSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:px-4">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[440px] md:max-w-[460px] rounded-t-3xl md:rounded-3xl bg-cream-light border-t border-x md:border border-ink/10 px-6 pt-6 pb-8 md:pb-7 text-center shadow-[0_-8px_32px_rgba(0,0,0,0.16)] md:shadow-[0_24px_70px_-24px_rgba(22,34,74,0.45)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15 md:hidden" />
        <span
          aria-hidden="true"
          className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rust/12 text-rust"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <h2 className="font-display  text-ink text-[1.25rem] leading-tight">
          {trialCopy.paywall.headline}
        </h2>
        <p className="font-serif  text-ink-soft text-[0.92rem] leading-relaxed mt-2">
          {trialCopy.paywall.body}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate("/plans")}
            className="rounded-full bg-rust text-cream-soft font-serif  text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
          >
            {trialCopy.paywall.primary}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/15 text-ink-soft font-serif text-[0.86rem] px-5 py-2 hover:bg-ink/5 transition cursor-pointer"
          >
            {trialCopy.paywall.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
