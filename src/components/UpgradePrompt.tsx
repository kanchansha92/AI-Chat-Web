import { useNavigate } from "react-router-dom";
import type { ApiError } from "../services/authService";
import { planLabel } from "../services/plans";
import type { PlanId } from "../services/billingService";
import { formatCredits } from "../services/creditsService";

// One sheet for every way the server can say no.
//
// The backend answers a refusal with a machine-readable code and the numbers
// behind it (lib/errors.js), so the client never has to guess why something
// stopped or invent a limit of its own:
//
//   PLAN_LIMIT            a metered allowance is spent  → when it comes back / upgrade
//   PLAN_FEATURE          not part of this plan at all  → which plan has it
//   CREDITS_REQUIRED      short on credits              → top up
//   SUBSCRIPTION_PAST_DUE a renewal failed              → update the payment method
//   *_UNAVAILABLE         the server has no provider    → an honest "not yet"

export interface Refusal {
  code: string;
  message: string;
  metric?: string;
  feature?: string;
  limit?: number | null;
  used?: number;
  remaining?: number;
  resetAt?: string | null;
  upgradeTo?: PlanId | null;
  needed?: number;
  balance?: number;
  graceUntil?: string | null;
}

/** Pull a Refusal out of an ApiError, or null if it is not one of ours. */
export function refusalFrom(e: unknown): Refusal | null {
  const err = e as ApiError | undefined;
  if (!err || typeof err !== "object" || !("code" in err) || !err.code) return null;
  const known = [
    "PLAN_LIMIT",
    "PLAN_FEATURE",
    "CREDITS_REQUIRED",
    "SUBSCRIPTION_PAST_DUE",
    "PAYMENTS_UNAVAILABLE",
    "MODEL_UNAVAILABLE",
    "PREMIUM_UNAVAILABLE",
    "VOICE_UNAVAILABLE",
    "IMAGE_FEATURE_UNAVAILABLE",
  ];
  if (!known.includes(err.code)) return null;
  const payload = (err.payload as { error?: Record<string, unknown> } | undefined)?.error ?? {};
  return { ...(payload as object), code: err.code, message: err.message } as Refusal;
}

function resetWhen(resetAt: string | null | undefined): string {
  if (!resetAt) return "";
  const d = new Date(resetAt);
  if (Number.isNaN(d.getTime())) return "";
  const hours = (d.getTime() - Date.now()) / 36e5;
  if (hours <= 0) return "in a moment";
  if (hours < 24) return "at midnight";
  if (hours < 48) return "tomorrow";
  return `on ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toLowerCase()}`;
}

type Action = { label: string; to: string } | null;

function actionFor(r: Refusal): Action {
  switch (r.code) {
    case "CREDITS_REQUIRED":
      return { label: "top up credits →", to: "/settings/credits" };
    case "SUBSCRIPTION_PAST_DUE":
      return { label: "update payment method →", to: "/settings/billing" };
    case "PAYMENTS_UNAVAILABLE":
    case "MODEL_UNAVAILABLE":
    case "PREMIUM_UNAVAILABLE":
    case "VOICE_UNAVAILABLE":
    case "IMAGE_FEATURE_UNAVAILABLE":
      return null;
    default:
      return r.upgradeTo
        ? { label: `see ${planLabel(r.upgradeTo)} →`, to: "/plans" }
        : { label: "see plans →", to: "/plans" };
  }
}

function detailFor(r: Refusal): string | null {
  if (r.code === "PLAN_LIMIT" && typeof r.limit === "number") {
    const when = resetWhen(r.resetAt);
    const used = `${r.used ?? r.limit} of ${r.limit} used`;
    return when ? `${used} · comes back ${when}` : used;
  }
  if (r.code === "CREDITS_REQUIRED" && typeof r.needed === "number") {
    return `${formatCredits(r.needed)} needed · ${formatCredits(r.balance ?? 0)} left`;
  }
  if (r.code === "SUBSCRIPTION_PAST_DUE" && r.graceUntil) {
    return `your plan stays on until ${new Date(r.graceUntil)
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
      .toLowerCase()}`;
  }
  return null;
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

/**
 * The sheet. `refusal` null means closed, so a caller can hold one piece of
 * state and let this decide everything else.
 */
export default function UpgradePrompt({
  refusal,
  onClose,
}: {
  refusal: Refusal | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!refusal) return null;

  const action = actionFor(refusal);
  const detail = detailFor(refusal);
  const icon =
    refusal.code === "CREDITS_REQUIRED" ? <CoinIcon /> : refusal.code === "PLAN_LIMIT" ? <ClockIcon /> : <LockIcon />;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center md:px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[440px] md:max-w-[460px] rounded-t-3xl md:rounded-3xl bg-cream-light border-t border-x md:border border-ink/10 px-6 pt-6 pb-8 md:pb-7 text-center shadow-[0_-8px_32px_rgba(0,0,0,0.16)] md:shadow-[0_24px_70px_-24px_rgba(22,34,74,0.45)]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15 md:hidden" />
        <span aria-hidden="true" className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rust/12 text-rust">
          {icon}
        </span>

        <h2 className="font-display text-ink text-[1.2rem] leading-snug">{refusal.message}</h2>
        {detail && <p className="font-caveat text-muted text-[0.95rem] mt-2">{detail}</p>}

        <div className="mt-5 flex flex-col gap-2">
          {action && (
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(action.to);
              }}
              className="rounded-full bg-rust text-cream-soft font-serif text-[0.92rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
            >
              {action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/15 text-ink-soft font-serif text-[0.86rem] px-5 py-2 hover:bg-ink/5 transition cursor-pointer"
          >
            {action ? "not now" : "alright"}
          </button>
        </div>
      </div>
    </div>
  );
}
