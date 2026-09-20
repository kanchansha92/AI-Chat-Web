import { useEffect, useMemo, useState } from "react";
import {
  adminService,
  type PlansConfig,
  type AdminPlan,
} from "../../services/adminService";
import { formatINR } from "../../services/plans";
import { Modal, Toast } from "./ui";

const MARK_GLYPH: Record<string, string> = { check: "✓", dot: "•", cross: "✕" };

function markTone(mark: string): string {
  return mark === "check" ? "text-rust" : mark === "cross" ? "text-muted/50" : "text-rust-light";
}

export default function AdminPlansPage() {
  const [config, setConfig] = useState<PlansConfig | null>(null);
  const [draft, setDraft] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);

  useEffect(() => {
    let alive = true;
    adminService
      .getPlans()
      .then((c) => {
        if (!alive) return;
        setConfig(c);
        setDraft(c.plans.map((p) => ({ ...p, features: p.features.map((f) => ({ ...f })) })));
      })
      .catch((e) => alive && setError(e?.message ?? "Couldn't load plans."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Deep-compare by JSON: it's three plans, and the shapes come straight off the wire.
  const dirty = useMemo(() => {
    if (!config) return false;
    return JSON.stringify(config.plans) !== JSON.stringify(draft);
  }, [config, draft]);

  const setField = (id: string, field: "name" | "kicker" | "monthly" | "annual", value: string) => {
    setDraft((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === "monthly" || field === "annual") {
          const n = Math.max(0, Math.round(Number(value) || 0));
          return { ...p, [field]: n };
        }
        return { ...p, [field]: value };
      })
    );
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const saved = await adminService.savePlans({ plans: draft });
      setConfig(saved);
      setDraft(saved.plans.map((p) => ({ ...p, features: p.features.map((f) => ({ ...f })) })));
      setToast({ msg: "Prices saved.", tone: "ok" });
      setConfirmOpen(false);
    } catch (e) {
      setToast({ msg: (e as Error)?.message ?? "Save failed.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="font-serif  text-muted">loading plans…</p>;
  if (error) return <p className="font-serif text-rust">{error}</p>;

  return (
    <div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-[2rem] leading-none">Plans</h1>
          <p className="font-serif text-muted text-[0.9rem] mt-1.5">
            Prices in ₹, GST-inclusive. Edit and save to change pricing across the app.
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty}
          onClick={() => setConfirmOpen(true)}
          className="btn-neobrutal-rust not- px-6 py-2.5 text-[1rem] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save prices
        </button>
      </header>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {draft.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border p-5 bg-cream-light ${plan.highlighted ? "border-rust/60 ring-1 ring-rust/15" : "border-hairline/70"
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-muted text-[0.78rem] uppercase tracking-wide">{plan.id}</span>
              {plan.highlighted && (
                <span className="font-caveat text-rust text-[0.9rem]">most picked</span>
              )}
            </div>

            <label className="block mt-2">
              <span className="font-serif text-muted text-[0.78rem]">name</span>
              <input
                value={plan.name}
                onChange={(e) => setField(plan.id, "name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-display text-ink text-[1.15rem] focus:outline-none focus:border-rust/60"
              />
            </label>

            <label className="block mt-3">
              <span className="font-serif text-muted text-[0.78rem]">kicker</span>
              <input
                value={plan.kicker}
                onChange={(e) => setField(plan.id, "kicker", e.target.value)}
                className="mt-1 w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-serif text-ink-soft text-[0.92rem] focus:outline-none focus:border-rust/60"
              />
            </label>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="font-serif text-muted text-[0.78rem]">₹ / month</span>
                <input
                  type="number"
                  min={0}
                  value={plan.monthly}
                  onChange={(e) => setField(plan.id, "monthly", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-serif text-ink text-[1rem] focus:outline-none focus:border-rust/60"
                />
              </label>
              <label className="block">
                <span className="font-serif text-muted text-[0.78rem]">₹ / year</span>
                <input
                  type="number"
                  min={0}
                  value={plan.annual}
                  onChange={(e) => setField(plan.id, "annual", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-serif text-ink text-[1rem] focus:outline-none focus:border-rust/60"
                />
              </label>
            </div>

            <p className="mt-2 font-serif text-muted text-[0.8rem]">
              {plan.monthly > 0
                ? `${formatINR(plan.monthly)}/mo · ${formatINR(plan.annual)}/yr`
                : "free forever"}
            </p>

            <hr className="dashed-divider" />

            <ul className="flex flex-col gap-2">
              {plan.features.map((f) => (
                <li key={f.label} className="flex items-center gap-2 font-serif text-[0.9rem] text-ink-soft">
                  <span className={`w-4 text-center ${markTone(f.mark)}`}>{MARK_GLYPH[f.mark] ?? "•"}</span>
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Modal
        open={confirmOpen}
        title="Save pricing?"
        confirmLabel="Update prices"
        cancelLabel="Cancel"
        busy={saving}
        onCancel={() => !saving && setConfirmOpen(false)}
        onConfirm={doSave}
      >
        <p>Pricing changes affect new subscriptions immediately.</p>
        <p className="mt-2">Existing users keep their current price.</p>
      </Modal>

      <Toast
        message={toast?.msg ?? null}
        tone={toast?.tone ?? "ok"}
        onDone={() => setToast(null)}
      />
    </div>
  );
}
