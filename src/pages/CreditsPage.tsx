import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadBilling, loadCatalogue, setBusy, setCredits } from "../redux/billingSlice";
import { creditsService, formatCredits } from "../services/creditsService";
import type { CreditBalance, LedgerRow } from "../services/creditsService";
import { formatINR, formatDate } from "../services/billingService";
import { openCheckout, CheckoutDismissed, CheckoutFailed } from "../lib/razorpay";
import { ApiError } from "../services/authService";

// Credits: what's left, what things cost, and how to top up.
//
// The balance, the costs, the packs and the ledger are all the server's -
// there is no arithmetic in this file. A purchase is only ever credited by the
// backend after it verifies the payment (and again, idempotently, from the
// webhook), so nothing here adds to a balance on its own.

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

const COST_LABELS: Record<string, string> = {
  PREMIUM_REPLY: "premium reply",
  IMAGE: "image",
  HD_IMAGE: "HD image",
  REFERENCE_EDIT: "reference edit",
  PREMIUM_VOICE: "premium voice reply",
};

const LEDGER_LABELS: Record<string, string> = {
  GRANT: "monthly credits",
  PURCHASE: "top-up",
  SPEND: "used",
  REFUND: "given back",
  EXPIRE: "expired",
  ADJUST: "adjustment",
};

const FEATURE_LABELS: Record<string, string> = {
  PREMIUM_REPLY: "premium reply",
  IMAGE: "image",
  HD_IMAGE: "HD image",
  REFERENCE_EDIT: "reference edit",
  PREMIUM_VOICE: "voice",
  MODEL_CALL: "model",
  PACK: "credit pack",
  PLAN: "plan",
  ADMIN: "adjustment",
  EXPIRY: "expiry",
};

export default function CreditsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const catalogue = useAppSelector((s) => s.billing.catalogue);
  const busy = useAppSelector((s) => s.billing.busy);

  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const b = await creditsService.balance();
    setBalance(b);
    dispatch(setCredits({ total: b.total, purchased: b.purchased, granted: b.granted }));
  }, [dispatch]);

  useEffect(() => {
    refresh().catch(() => setError("— couldn't read your balance just now."));
    creditsService
      .ledger(null, 20)
      .then((r) => {
        setLedger(r.items);
        setCursor(r.nextCursor);
      })
      .catch(() => {});
    if (!catalogue) dispatch(loadCatalogue());
  }, [dispatch, refresh, catalogue]);

  async function buy(packId: string) {
    if (busy) return;
    setError(null);
    setNotice(null);
    dispatch(setBusy(true));
    try {
      // The key makes a double tap reuse the same order instead of opening two.
      const idempotencyKey = `${packId}-${Math.floor(Date.now() / 30000)}`;
      const { checkout } = await creditsService.order(packId, idempotencyKey);
      const result = await openCheckout({
        checkout,
        name: user?.name,
        email: user?.email,
        description: `${checkout.credits} credits`,
      });
      const verified = await creditsService.verify({
        razorpay_order_id: result.razorpay_order_id ?? checkout.orderId ?? "",
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });
      await refresh();
      const r = await creditsService.ledger(null, 20);
      setLedger(r.items);
      setCursor(r.nextCursor);
      setNotice(`added. you have ${formatCredits(verified.balance.total)} credits.`);
      dispatch(loadBilling());
    } catch (e) {
      if (e instanceof CheckoutDismissed) {
        /* closed on purpose */
      } else if (e instanceof ApiError && e.code === "NOT_CAPTURED") {
        setNotice("— your bank is still confirming. the credits land automatically when it does.");
      } else if (e instanceof CheckoutFailed || e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("— that didn't go through. nothing was charged.");
      }
    } finally {
      dispatch(setBusy(false));
    }
  }

  async function more() {
    if (!cursor) return;
    const r = await creditsService.ledger(cursor, 20);
    setLedger((prev) => [...prev, ...r.items]);
    setCursor(r.nextCursor);
  }

  const packs = balance?.packs ?? catalogue?.packs ?? [];
  const costs = balance?.costs ?? catalogue?.creditCosts ?? {};
  const models = balance?.models ?? catalogue?.models ?? [];
  const paymentsOff = catalogue ? !catalogue.paymentsConfigured : false;

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <div className="mx-auto w-full max-w-[900px]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/settings/billing"))}
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center md:text-left md:pl-1 font-caveat text-rust text-[1.02rem]">credits</p>
          <span className="h-9 w-9 shrink-0 md:hidden" aria-hidden="true" />
        </div>

        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {/* balance */}
          <section className="rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
            <p className="font-caveat text-muted text-[0.85rem]">you have</p>
            <p className="font-display text-ink text-[2.6rem] leading-none mt-1">
              {balance ? formatCredits(balance.total) : "—"}
              <span className="font-caveat text-muted text-[0.9rem] ml-2">credits</span>
            </p>

            {balance && (
              <dl className="mt-4 flex flex-col gap-2 font-serif text-[0.92rem]">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">bought (never expire)</dt>
                  <dd className="text-ink-soft">{formatCredits(balance.purchased)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">from your plan</dt>
                  <dd className="text-ink-soft">{formatCredits(balance.granted)}</dd>
                </div>
                {balance.grants.map((g) => (
                  <div key={g.id} className="flex items-center justify-between font-caveat text-[0.85rem]">
                    <dt className="text-muted/80">· {formatCredits(g.remaining)} expiring</dt>
                    <dd className="text-muted/80">{formatDate(g.expiresAt)}</dd>
                  </div>
                ))}
              </dl>
            )}

            <p className="mt-4 font-caveat text-muted/80 text-[0.82rem]">
              plan credits are spent first, the ones nearest expiry before the rest. bought credits stay until you use
              them.
            </p>
          </section>

          {/* top up */}
          <section className="rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
            <p className="font-caveat text-muted text-[0.85rem]">top up</p>
            {paymentsOff ? (
              <p className="mt-3 font-serif text-muted text-[0.92rem]">
                — payments aren't switched on for this server yet.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2.5">
                {packs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => buy(p.id)}
                    disabled={busy}
                    className="flex items-center justify-between gap-3 rounded-[1rem] border border-hairline/60 bg-cream px-4 py-3 hover:border-rust/50 hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <span className="font-display text-ink text-[1.2rem]">{p.credits} credits</span>
                    <span className="font-serif text-rust text-[1rem]">{formatINR(p.priceRupees)}</span>
                  </button>
                ))}
              </div>
            )}
            {notice && <p role="status" className="mt-3 font-caveat text-sage-deep text-[0.9rem]">{notice}</p>}
            {error && <p role="alert" className="mt-3 font-serif text-rust text-[0.9rem]">{error}</p>}
          </section>

          {/* costs */}
          <section className="rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
            <p className="font-caveat text-muted text-[0.85rem]">what things cost</p>
            <ul className="mt-3 flex flex-col divide-y divide-hairline/40">
              {Object.entries(costs).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between py-2 font-serif text-[0.92rem]">
                  <span className="text-ink-soft">{COST_LABELS[k] ?? k.toLowerCase().replace(/_/g, " ")}</span>
                  <span className="text-muted">{formatCredits(Number(v))}</span>
                </li>
              ))}
            </ul>
            {models.length > 0 && (
              <>
                <p className="mt-4 font-caveat text-muted text-[0.85rem]">choosing a model</p>
                <ul className="mt-2 flex flex-col divide-y divide-hairline/40">
                  {models.map((m) => (
                    <li key={m.id} className="flex items-center justify-between py-2 font-serif text-[0.92rem]">
                      <span className="text-ink-soft">{m.label}</span>
                      <span className="text-muted">{formatCredits(m.cost)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* ledger */}
          <section className="rounded-[1.4rem] border border-hairline/60 bg-cream-light p-5 md:p-7">
            <p className="font-caveat text-muted text-[0.85rem]">history</p>
            {ledger.length === 0 ? (
              <p className="mt-3 font-serif text-muted text-[0.92rem]">nothing yet.</p>
            ) : (
              <>
                <ul className="mt-3 flex flex-col divide-y divide-hairline/40">
                  {ledger.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="font-serif text-[0.9rem] text-ink-soft truncate">
                          {LEDGER_LABELS[row.type] ?? row.type.toLowerCase()}
                          {row.feature && row.type === "SPEND" ? ` · ${FEATURE_LABELS[row.feature] ?? row.feature.toLowerCase()}` : ""}
                          {row.modelId ? ` (${row.modelId})` : ""}
                        </p>
                        <p className="font-caveat text-muted text-[0.78rem]">{formatDate(row.createdAt)}</p>
                      </div>
                      <span
                        className={`shrink-0 font-serif text-[0.92rem] ${row.amount < 0 ? "text-muted" : "text-sage-deep"}`}
                      >
                        {row.amount > 0 ? "+" : ""}
                        {formatCredits(row.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
                {cursor && (
                  <button
                    type="button"
                    onClick={more}
                    className="mt-3 font-serif text-[0.88rem] text-rust hover:underline underline-offset-2 cursor-pointer"
                  >
                    older →
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
