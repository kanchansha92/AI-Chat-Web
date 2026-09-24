import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../hook/hooks";
import { logout } from "../redux/authSlice";
import { userService } from "../services/userService";
import { ApiError } from "../services/authService";
import { networkCopy, deletionCopy } from "../copy";
import { formatBillingDate } from "../services/plans";

type Step = "confirm" | "type" | "done";

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<Step>("confirm");
  const [phrase, setPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endsOn, setEndsOn] = useState<string>("");

  const phraseMatches = phrase.trim().toLowerCase() === deletionCopy.typeToConfirm.phrase;

  const leave = () => navigate("/settings");

  const confirmDeletion = async () => {
    if (!phraseMatches || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { endsAt } = await userService.scheduleDeletion();
      const when = endsAt ? new Date(endsAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      setEndsOn(formatBillingDate(when));
      setStep("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setError(networkCopy.failedMidStream);
      else setError(deletionCopy.failed);
    } finally {
      setSubmitting(false);
    }
  };

  // Only drops the session. The account sits in its 30-day grace window
  // server-side, and signing in again cancels the deletion.
  const closeOut = async () => {
    await dispatch(logout());
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center px-5 py-10">
      {step === "done" ? (
        <main className="w-full max-w-[440px] text-center">
          <h1 className="font-display text-ink text-[2.6rem] md:text-[3rem] leading-none">
            {deletionCopy.done.headline}
          </h1>
          <p className="font-serif  text-ink-soft text-[1rem] leading-relaxed mt-5 px-2">
            {deletionCopy.done.body.replace("{date}", endsOn)}
          </p>
          <button
            type="button"
            onClick={closeOut}
            className="mt-8 rounded-full bg-charcoal text-cream-soft font-serif  text-[0.95rem] px-8 py-2.5 hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
          >
            {deletionCopy.done.close}
          </button>
        </main>
      ) : (
        <main className="w-full max-w-[400px] rounded-[1.4rem] bg-cream-light border border-hairline/60 shadow-[0_24px_70px_-30px_rgba(22,34,74,0.5)] px-6 py-7 md:px-7 md:py-8 text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
            </svg>
          </span>

          {step === "confirm" ? (
            <>
              <h1 className="font-display text-ink text-[1.55rem] leading-tight">
                {deletionCopy.confirm.headline}
              </h1>
              <p className="font-serif  text-ink-soft text-[0.92rem] leading-relaxed mt-3">
                {deletionCopy.confirm.body}
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep("type")}
                  className="rounded-full bg-danger text-cream-soft font-serif  text-[0.95rem] px-5 py-2.5 hover:bg-danger-hover active:scale-[0.98] transition cursor-pointer"
                >
                  {deletionCopy.confirm.primary}
                </button>
                <button
                  type="button"
                  onClick={leave}
                  className="rounded-full border border-ink/15 text-ink-soft font-serif text-[0.9rem] px-5 py-2 hover:bg-ink/5 transition cursor-pointer"
                >
                  {deletionCopy.confirm.cancel}
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-ink text-[1.55rem] leading-tight">
                {deletionCopy.typeToConfirm.headline}
              </h1>
              <p className="font-serif  text-ink-soft text-[0.92rem] leading-relaxed mt-3">
                {deletionCopy.typeToConfirm.body}
              </p>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={phrase}
                onChange={(e) => {
                  setPhrase(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirmDeletion();
                }}
                placeholder={deletionCopy.typeToConfirm.phrase}
                aria-label={deletionCopy.typeToConfirm.phrase}
                className="mt-4 w-full rounded-2xl bg-cream text-ink font-serif text-[0.95rem] px-4 py-3 text-center outline-none border border-hairline/70 focus:border-danger/50 transition-colors placeholder:text-ink-soft/50"
              />
              {error && (
                <p className="font-serif  text-danger text-[0.82rem] mt-2">{error}</p>
              )}
              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={confirmDeletion}
                  disabled={!phraseMatches || submitting}
                  className="rounded-full bg-danger text-cream-soft font-serif  text-[0.95rem] px-5 py-2.5 hover:bg-danger-hover active:scale-[0.98] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {submitting ? "…" : deletionCopy.typeToConfirm.confirm}
                </button>
                <button
                  type="button"
                  onClick={leave}
                  className="rounded-full border border-ink/15 text-ink-soft font-serif text-[0.9rem] px-5 py-2 hover:bg-ink/5 transition cursor-pointer"
                >
                  {deletionCopy.confirm.cancel}
                </button>
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}
