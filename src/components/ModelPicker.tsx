import { useEffect, useState } from "react";
import { useAppSelector } from "../hook/hooks";
import { usePlan } from "../hook/usePlan";
import { modelService } from "../services/personaService";
import type { ModelOption } from "../services/personaService";
import { formatCredits } from "../services/creditsService";

// Pick which model answers. Basic and up only (limits.modelSelection), and
// every choice costs its catalogue price in credits - the server charges it
// and refunds if the provider fails, so this only has to be honest about the
// price before the tap.
//
// A model the server has no key for comes back `available: false` and is shown
// as unavailable rather than offered and then refused.

export default function ModelPicker({
  value,
  onChange,
  disabled = false,
  className = "",
}: {
  value: string | null;
  onChange: (modelId: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { limits } = usePlan();
  const credits = useAppSelector((s) => s.billing.credits);
  const [models, setModels] = useState<ModelOption[] | null>(null);
  const [open, setOpen] = useState(false);

  const allowed = limits?.modelSelection === true;

  useEffect(() => {
    if (!allowed || models) return;
    modelService
      .list()
      .then((r) => setModels(r.models))
      .catch(() => setModels([]));
  }, [allowed, models]);

  if (!allowed) return null;

  const current = models?.find((m) => m.id === value) ?? null;
  const balance = credits?.total ?? 0;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="choose which model answers"
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-serif text-[0.78rem] transition cursor-pointer disabled:opacity-50 ${
          current
            ? "border-rust bg-rust/10 text-rust"
            : "border-hairline/70 bg-cream-light text-ink-soft hover:border-rust/50"
        }`}
      >
        {current ? `${current.label} · ${formatCredits(current.cost)}` : "auto"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-[61] mb-2 w-[236px] rounded-[0.9rem] border border-hairline/70 bg-cream-light p-1.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)]">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2 rounded-[0.7rem] px-3 py-2 font-serif text-[0.86rem] transition cursor-pointer ${
                value === null ? "bg-rust/10 text-rust" : "text-ink-soft hover:bg-ink/5"
              }`}
            >
              <span>auto</span>
              <span className="font-caveat text-muted text-[0.78rem]">included</span>
            </button>

            {models === null ? (
              <p className="px-3 py-2 font-caveat text-muted text-[0.82rem]">looking…</p>
            ) : (
              models.map((m) => {
                const affordable = balance >= m.cost;
                const usable = m.available && affordable;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!usable}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    title={
                      !m.available
                        ? "this model isn't switched on for this server"
                        : !affordable
                          ? "not enough credits for this one"
                          : undefined
                    }
                    className={`w-full flex items-center justify-between gap-2 rounded-[0.7rem] px-3 py-2 font-serif text-[0.86rem] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      value === m.id ? "bg-rust/10 text-rust" : "text-ink-soft hover:bg-ink/5"
                    }`}
                  >
                    <span className="truncate">{m.label}</span>
                    <span className="shrink-0 font-caveat text-muted text-[0.78rem]">
                      {!m.available ? "not set up" : `${formatCredits(m.cost)} credits`}
                    </span>
                  </button>
                );
              })
            )}
            <p className="px-3 pt-1.5 pb-1 font-caveat text-muted/70 text-[0.75rem]">
              you have {formatCredits(balance)} credits
            </p>
          </div>
        </>
      )}
    </div>
  );
}
