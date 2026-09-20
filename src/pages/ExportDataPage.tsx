import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../hook/hooks";
import { userService } from "../services/userService";
import { ApiError } from "../services/authService";
import { networkCopy, exportCopy } from "../copy";

export default function ExportDataPage() {
  const navigate = useNavigate();
  const email = useAppSelector((s) => s.auth.user?.email) ?? "";

  const [requested, setRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await userService.requestExport();
      setRequested(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setError(networkCopy.failedMidStream);
      else setError(exportCopy.failed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full app-gradient flex items-center justify-center px-5 py-10">
      <main className="w-full max-w-[420px] rounded-[1.4rem] bg-cream-light border border-hairline/60 shadow-[0_24px_70px_-30px_rgba(22,32,43,0.5)] px-6 py-7 md:px-7 md:py-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#68775B]/12 text-[#68775B]"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" />
          </svg>
        </span>

        {requested ? (
          <>
            <h1 className="font-display text-ink text-[1.6rem] leading-tight">On its way.</h1>
            <p className="font-serif  text-ink-soft text-[0.95rem] leading-relaxed mt-3">
              {exportCopy.requested}
              {email ? (
                <>
                  {" "}
                  <span className="text-ink">{email}</span>
                </>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="mt-7 rounded-full border border-ink/15 text-ink-soft font-serif text-[0.9rem] px-6 py-2 hover:bg-ink/5 transition cursor-pointer"
            >
              back to settings
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-ink text-[1.6rem] leading-tight">
              {exportCopy.confirm.headline}
            </h1>
            <p className="font-serif  text-ink-soft text-[0.95rem] leading-relaxed mt-3">
              {exportCopy.confirm.body}
            </p>
            {error && (
              <p className="font-serif  text-rust text-[0.82rem] mt-3">{error}</p>
            )}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={generate}
                disabled={submitting}
                className="rounded-full bg-rust text-cream-soft font-serif  text-[0.95rem] px-5 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "packing…" : exportCopy.confirm.button}
              </button>
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="rounded-full border border-ink/15 text-ink-soft font-serif text-[0.9rem] px-5 py-2 hover:bg-ink/5 transition cursor-pointer"
              >
                cancel
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
