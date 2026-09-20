import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { privacyIntro, privacySections, operator, type PolicyBlock } from "../privacyPolicy";

/* Privacy policy.
   Content lives in src/privacyPolicy.ts; this file is only how it looks.

   Below lg: one phone-width column - a bare "back" control, a collapsed
   contents list, then the sections. lg and up: no top bar at all, just a
   sticky contents rail on the left and the document on the right, the same
   shape as Help & support so the two read as siblings.

   The route is deliberately ungated (App.tsx): a privacy policy that only
   signed-in people can reach is not a published policy, and both app stores
   ask for a URL that opens without an account. Everything on the page has to
   work for a stranger, which is why the back control falls back to "/" rather
   than assuming there is history to go back to. */

/* ---------- icons ---------- */

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/* ---------- blocks ---------- */

function Paragraph({ text }: { text: string }) {
  /* A leading "Label." on its own sentence is set in the ink colour so a long
     section still has visible joints when skimmed. Purely typographic - the
     content file writes ordinary prose and knows nothing about this. */
  const m = /^([A-Z][A-Za-z ,'-]{2,34}\.)\s(.+)$/s.exec(text);
  if (m) {
    return (
      <p className="font-serif text-ink-soft text-[0.95rem] sm:text-[1rem] leading-[1.75]">
        <span className="text-ink">{m[1]}</span> {m[2]}
      </p>
    );
  }
  return <p className="font-serif text-ink-soft text-[0.95rem] sm:text-[1rem] leading-[1.75]">{text}</p>;
}

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 font-serif text-ink-soft text-[0.93rem] sm:text-[0.98rem] leading-[1.7]">
          <span className="mt-[0.62rem] h-1.5 w-1.5 rounded-full bg-rust/70 shrink-0" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* Two columns at sm and up; stacked definition pairs on a phone, where a real
   table would either overflow or shrink the text past reading size. */
function PolicyTable({ head, rows }: { head: readonly [string, string]; rows: readonly (readonly [string, string])[] }) {
  return (
    <div className="rounded-[1.1rem] border border-hairline/70 overflow-hidden bg-cream-light/60">
      <div className="hidden sm:grid grid-cols-[minmax(11rem,0.9fr)_1.6fr] gap-x-5 px-5 py-2.5 bg-cream/70 border-b border-hairline/70">
        <span className="font-caveat text-rust text-[0.9rem]">{head[0]}</span>
        <span className="font-caveat text-rust text-[0.9rem]">{head[1]}</span>
      </div>
      <div className="divide-y divide-hairline/50">
        {rows.map(([left, right]) => (
          <div key={left} className="sm:grid sm:grid-cols-[minmax(11rem,0.9fr)_1.6fr] sm:gap-x-5 px-5 py-3.5">
            <span className="block font-serif text-ink text-[0.92rem] leading-snug sm:leading-[1.65]">{left}</span>
            <span className="block font-serif text-ink-soft text-[0.9rem] sm:text-[0.94rem] leading-[1.7] mt-1 sm:mt-0">{right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <div className="rounded-[1.1rem] border border-rust/25 bg-rust/[0.06] px-5 py-4">
      <p className="font-serif text-ink text-[0.95rem] leading-[1.7]">{text}</p>
    </div>
  );
}

function Block({ block }: { block: PolicyBlock }) {
  switch (block.kind) {
    case "p":
      return <Paragraph text={block.text} />;
    case "list":
      return <Bullets items={block.items} />;
    case "table":
      return <PolicyTable head={block.head} rows={block.rows} />;
    case "note":
      return <Note text={block.text} />;
    default:
      return null;
  }
}

/* ---------- page ---------- */

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState(privacySections[0].id);
  const [tocOpen, setTocOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const ids = useMemo(() => privacySections.map((s) => s.id), []);

  /* Which section the contents rail highlights. rootMargin pulls the trigger
     line to roughly a third down the viewport, so the highlight changes when a
     heading reaches reading position rather than when it clips the very top. */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-12% 0px -68% 0px", threshold: 0 },
    );
    ids.forEach((id) => {
      const el = sectionRefs.current[id];
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [ids]);

  const jump = (id: string) => {
    setTocOpen(false);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goBack = () => {
    // history.length is 1 when the tab opened straight onto this URL - which
    // is the normal case for a policy link shared from outside the app.
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const toc = (
    <nav aria-label={privacyIntro.tocLabel} className="flex flex-col gap-0.5">
      {privacySections.map((s) => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            aria-current={isActive ? "true" : undefined}
            className={`group flex items-baseline gap-2.5 rounded-lg px-3 py-2 text-left transition cursor-pointer ${isActive ? "bg-cream/80 text-ink" : "text-ink-soft hover:bg-cream/50 hover:text-ink"
              }`}
          >
            <span className={`font-caveat text-[0.82rem] shrink-0 tabular-nums ${isActive ? "text-rust" : "text-muted"}`}>
              {s.n}
            </span>
            <span className="font-serif text-[0.9rem] leading-snug">{s.short}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] w-full app-gradient text-ink flex flex-col">
      {/* ── top bar: phones and tablets only ────────────────────────
        Gone at lg. On a wide screen the document already opens on its own
        headline with the contents rail beside it, and a bar carrying a
        wordmark and a print button on top of that was three things competing
        to be read first. Small screens keep "back" alone, because there is no
        contents rail there to orient by and a reader who arrived from a link
        needs the way out. */}
      <header className="lg:hidden shrink-0 px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-2 flex items-center">
        <button
          type="button"
          onClick={goBack}
          className="group -ml-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-serif text-[0.86rem] text-ink-soft hover:text-ink hover:bg-cream/60 transition cursor-pointer"
        >
          <span className="transition group-hover:-translate-x-0.5">
            <BackIcon />
          </span>
          back
        </button>
      </header>

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-5 sm:px-8 pb-16">
        {/* ── masthead ──────────────────────────────────────────── */}
        {/* lg carries the top padding the removed header used to provide. */}
        <section className="pt-6 sm:pt-10 lg:pt-14 pb-8">
          <p className="font-caveat text-rust text-[1.05rem] sm:text-[1.15rem] leading-none">{privacyIntro.kicker}</p>
          <h1 className="font-display text-ink text-[2.1rem] sm:text-[2.9rem] leading-[1.06] tracking-[-0.015em] mt-2.5 max-w-[22ch]">
            {privacyIntro.headline}
          </h1>
          <p className="font-serif text-ink-soft text-[1rem] sm:text-[1.08rem] leading-[1.7] mt-5 max-w-[46rem]">
            {privacyIntro.standfirst}
          </p>
          <p className="font-caveat text-muted text-[0.92rem] mt-5">{privacyIntro.meta}</p>
        </section>

        <hr className="dashed-divider" />

        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          {/* ── contents: collapsible below lg, sticky rail at lg ── */}
          <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pb-8">
            <p className="hidden lg:block font-caveat text-rust text-[0.95rem] px-3 pb-2">{privacyIntro.tocLabel}</p>
            <div className="hidden lg:block">{toc}</div>

            <div className="lg:hidden paper rounded-[1.2rem] overflow-hidden">
              <button
                type="button"
                onClick={() => setTocOpen((v) => !v)}
                aria-expanded={tocOpen}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left cursor-pointer"
              >
                <span className="font-caveat text-rust text-[0.98rem]">{privacyIntro.tocLabel}</span>
                <span className="text-muted">
                  <ChevronDownIcon open={tocOpen} />
                </span>
              </button>
              {tocOpen && <div className="px-2 pb-2 border-t border-hairline/60 pt-2">{toc}</div>}
            </div>
          </div>

          {/* ── the document ──────────────────────────────────────── */}
          <article className="mt-8 lg:mt-0 flex flex-col gap-10 sm:gap-12 max-w-[46rem]">
            {privacySections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                ref={(el) => {
                  sectionRefs.current[s.id] = el;
                }}
                className="scroll-mt-6"
              >
                <h2 className="font-display text-ink text-[1.5rem] sm:text-[1.8rem] leading-[1.15] flex items-baseline gap-2.5">
                  <span className="font-caveat text-rust text-[1rem] tabular-nums shrink-0">{s.n}</span>
                  {s.title}
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {s.blocks.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </div>
              </section>
            ))}

            <hr className="dashed-divider" />

            <p className="font-caveat text-muted text-[0.95rem] leading-[1.6]">
              questions about any of this reach a person at{" "}
              <a className="text-rust hover:text-rust-hover underline underline-offset-2" href={`mailto:${operator.privacyEmail}`}>
                {operator.privacyEmail}
              </a>
              .
            </p>
          </article>
        </div>
      </main>

      {/* ── footer ──────────────────────────────────────────────── */}
      <footer className="shrink-0 px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.78rem] font-serif text-muted border-t border-hairline/50">
        <span>© {new Date().getFullYear()} privateaile · for adults, 18+</span>
        <span className="font-caveat text-[0.95rem]">a quiet place to think, write, remember, and create.</span>
      </footer>
    </div>
  );
}
