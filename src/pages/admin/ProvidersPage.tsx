import { useEffect, useState } from "react";
import {
  adminService,
  type ProvidersConfig,
  type ProviderTestResult,
} from "../../services/adminService";
import { Toast } from "./ui";

// Keys never reach the client - the backend only reports whether one is set.
// Both test buttons are read-only probes: a tiny completion, and local sample text.

type Draft = {
  model: string;
  baseUrl: string;
  timeoutMs: number;
  fallbackOrderText: string;
  useModel: boolean;
};

// The four moderation threshold dials that used to live here are gone.
//
// lib/moderation.js returns a boolean verdict and produces no scores to compare
// them against, so the sliders were wired to nothing. lib/configStore.js dropped
// `thresholds` from the payload and said so in a comment; this page never
// followed. `draft.thresholds[k].toFixed(2)` then read `undefined.toFixed` on
// every render, and with no error boundary above it that blanked the entire
// admin section - sidebar included - rather than failing visibly here.
//
// Whoever adds a scoring classifier can bring them back, next to the code that
// actually reads them.

function KeyDot({ set }: { set: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-serif text-[0.85rem] ${set ? "text-rust" : "text-muted"
        }`}
    >
      <span className={`h-2 w-2 rounded-full ${set ? "bg-rust" : "bg-muted/50"}`} />
      {set ? "key set" : "not set"}
    </span>
  );
}

export default function ProvidersPage() {
  const [config, setConfig] = useState<ProvidersConfig | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);
  const [testing, setTesting] = useState<null | "llm" | "moderation">(null);
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);

  const hydrate = (c: ProvidersConfig) => {
    setConfig(c);
    setDraft({
      model: c.llm.model,
      baseUrl: c.llm.baseUrl,
      timeoutMs: c.llm.timeoutMs,
      fallbackOrderText: (c.llm.fallbackOrder || []).join(", "),
      useModel: c.moderation.useModel,
    });
  };

  useEffect(() => {
    let alive = true;
    adminService
      .getProviders()
      .then((c) => alive && hydrate(c))
      .catch((e) => alive && setError(e?.message ?? "Couldn't load providers."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await adminService.saveProviders({
        llm: {
          model: draft.model.trim(),
          baseUrl: draft.baseUrl.trim(),
          timeoutMs: Math.round(Number(draft.timeoutMs) || 0),
          fallbackOrder: draft.fallbackOrderText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
        moderation: { useModel: draft.useModel },
      });
      hydrate(saved);
      setToast({ msg: "Provider config saved.", tone: "ok" });
    } catch (e) {
      setToast({ msg: (e as Error)?.message ?? "Save failed.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (target: "llm" | "moderation") => {
    setTesting(target);
    setTestResult(null);
    try {
      const r = await adminService.testProvider(target);
      setTestResult(r);
    } catch (e) {
      setToast({ msg: (e as Error)?.message ?? "Test failed.", tone: "error" });
    } finally {
      setTesting(null);
    }
  };

  if (loading) return <p className="font-serif  text-muted">loading providers…</p>;
  if (error || !config || !draft) return <p className="font-serif text-rust">{error ?? "No data."}</p>;

  const inputCls =
    "mt-1 w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-serif text-ink text-[0.95rem] focus:outline-none focus:border-rust/60";

  return (
    <div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-[2rem] leading-none">Providers</h1>
          <p className="font-serif text-muted text-[0.9rem] mt-1.5">
            LLM and moderation configuration. Keys stay in the server env - never edited here.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="btn-neobrutal-rust not- px-6 py-2.5 text-[1rem] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save config"}
        </button>
      </header>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-hairline/70 bg-cream-light p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-ink text-[1.3rem]">LLM</h2>
            <KeyDot set={config.keyStatus.llm} />
          </div>
          <p className="font-serif text-muted text-[0.82rem] mt-1">
            live model: {config.live.model}
            {!config.live.modelKeySet && " · running on local stand-in (no key)"}
          </p>

          <label className="block mt-4">
            <span className="font-serif text-muted text-[0.8rem]">model</span>
            <input
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block mt-3">
            <span className="font-serif text-muted text-[0.8rem]">base URL</span>
            <input
              value={draft.baseUrl}
              onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
              className={inputCls}
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-serif text-muted text-[0.8rem]">timeout (ms)</span>
              <input
                type="number"
                min={1000}
                max={120000}
                value={draft.timeoutMs}
                onChange={(e) => setDraft({ ...draft, timeoutMs: Number(e.target.value) })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="font-serif text-muted text-[0.8rem]">fallback order</span>
              <input
                value={draft.fallbackOrderText}
                onChange={(e) => setDraft({ ...draft, fallbackOrderText: e.target.value })}
                placeholder="openai, local-standin"
                className={inputCls}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => runTest("llm")}
              disabled={testing === "llm"}
              className="btn-neobrutal-cream px-4 py-2 text-[0.9rem] disabled:opacity-50"
            >
              {testing === "llm" ? "Testing…" : "Test connection"}
            </button>
            {testResult && testResult.target === "llm" && (
              <span className={`font-serif text-[0.85rem] ${testResult.ok ? "text-rust" : "text-muted"}`}>
                {/* `=== true`, not just `.ok`: this project builds without strictNullChecks,
                    where a boolean discriminant only narrows on an explicit comparison. */}
                {testResult.ok === true
                  ? `ok · ${testResult.latencyMs}ms · “${testResult.sample}”`
                  : testResult.reason}
              </span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-hairline/70 bg-cream-light p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-ink text-[1.3rem]">Moderation</h2>
            <label className="flex items-center gap-2 font-serif text-[0.85rem] text-ink-soft cursor-pointer">
              <input
                type="checkbox"
                checked={draft.useModel}
                onChange={(e) => setDraft({ ...draft, useModel: e.target.checked })}
                className="accent-[color:var(--color-rust)]"
              />
              use model classifier
            </label>
          </div>
          <p className="font-serif text-muted text-[0.82rem] mt-1">
            With the classifier on, a model reviews each message and the regex
            pre-filter runs first either way. The verdict is a yes or a no, so
            there is nothing here to tune.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => runTest("moderation")}
              disabled={testing === "moderation"}
              className="btn-neobrutal-cream px-4 py-2 text-[0.9rem] disabled:opacity-50"
            >
              {testing === "moderation" ? "Testing…" : "Test classifier"}
            </button>
          </div>

          {testResult && testResult.target === "moderation" && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {testResult.results.map((r, i) => (
                <li key={i} className="font-serif text-[0.85rem] flex items-center gap-2">
                  <span className={r.blocked ? "text-rust" : "text-muted"}>
                    {r.blocked ? `blocked · ${r.reason}` : "allowed"}
                  </span>
                  <span className="text-ink-soft truncate">- “{r.text}”</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Toast message={toast?.msg ?? null} tone={toast?.tone ?? "ok"} onDone={() => setToast(null)} />
    </div>
  );
}
