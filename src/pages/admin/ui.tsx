import { useEffect, type ReactNode } from "react";

// Shared admin atoms. Colours come from the CSS variables, so they follow the theme.

// Hand-rolled inline SVG rather than a chart library - the app doesn't ship one and
// this is the only chart in it. An all-zero series draws as a flat baseline.
export function Sparkline({
  data,
  width = 132,
  height = 40,
  className = "",
  strokeWidth = 1.6,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const pad = 3;
  const n = data.length;
  const max = Math.max(...data, 0);
  const min = Math.min(...data, 0);
  const span = max - min || 1;

  const x = (i: number) => (n <= 1 ? pad : pad + (i * (width - pad * 2)) / (n - 1));
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const gid = `spark-${Math.round(x(0) * 1000)}-${n}-${max}`;

  if (n === 0) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }

  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(height - pad).toFixed(1)} L${x(0).toFixed(1)},${(
    height - pad
  ).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-rust)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-rust)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--color-rust)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  sub,
  series,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  series?: number[];
}) {
  return (
    <div className="rounded-2xl border border-hairline/70 bg-cream-light p-5 flex flex-col justify-between min-h-[9.5rem]">
      <div className="flex items-start justify-between gap-3">
        <span className="font-serif text-muted text-[0.9rem]">{label}</span>
        {series && series.length > 0 && <Sparkline data={series} />}
      </div>
      <div className="mt-3">
        <div className="font-display text-ink text-[2rem] leading-none">{value}</div>
        {sub && <div className="font-serif text-muted text-[0.82rem] mt-1.5">{sub}</div>}
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]" onClick={() => !busy && onCancel()} />
      <div className="relative w-full max-w-[440px] rounded-2xl border-2 border-charcoal bg-cream-light p-6 shadow-[6px_7px_0_0_var(--color-charcoal)]">
        <h3 className="font-display text-ink text-[1.4rem] leading-tight">{title}</h3>
        <div className="mt-3 font-serif text-ink-soft text-[0.95rem] leading-relaxed">{children}</div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-neobrutal-cream px-4 py-2 text-[0.95rem] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn-neobrutal-rust not- px-5 py-2 text-[0.95rem] disabled:opacity-50"
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// One at a time, bottom right, gone after 3.2s. Pages own the message.
export function Toast({
  message,
  tone = "ok",
  onDone,
}: {
  message: string | null;
  tone?: "ok" | "error";
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      <div
        className={`rounded-xl border-2 border-charcoal px-4 py-2.5 font-serif text-[0.92rem] shadow-[3px_4px_0_0_var(--color-charcoal)] ${tone === "error" ? "bg-rust text-cream-light" : "bg-cream-light text-ink"
          }`}
      >
        {message}
      </div>
    </div>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const tone =
    plan === "PRO"
      ? "bg-charcoal text-cream-light border-charcoal"
      : plan === "PLUS"
        ? "bg-rust/12 text-rust border-rust/40"
        : "bg-cream-dark/60 text-muted border-hairline";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-serif text-[0.78rem] leading-none ${tone}`}
    >
      {plan.toLowerCase()}
    </span>
  );
}

export function Avatar({ name, src, size = 34 }: { name: string; src?: string | null; size?: number }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-hairline/70"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full bg-rust/15 text-rust border border-rust/25 flex items-center justify-center font-display text-[0.9rem]"
    >
      {initial}
    </span>
  );
}
