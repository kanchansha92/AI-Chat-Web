import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { helpCopy, type HelpTopic } from "../copy";

/* Help & support.
   Below lg: one phone-width column - search, topics, quick things, faqs, contact.
   lg and up: a wide two-column desk. A sticky rail on the left holds the search,
   the topic list and the quick actions; the right column carries the faqs and a
   contact card that splits into pitch + form. Same markup either way, only the
   responsive classes differ. */

/* ---------- icons ---------- */

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l16-7-5 16-3-6.5z" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.3 5.9.86-4.25 4.14 1 5.87L12 17.9l-5.25 2.77 1-5.87L3.5 9.66l5.9-.86z" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.2l7 2.6v5.4c0 4.3-2.9 7.7-7 9.6-4.1-1.9-7-5.3-7-9.6V5.8z" />
      <path d="M9.2 12.2l2 2 3.6-3.9" />
    </svg>
  );
}

const ACTION_ICONS: Record<string, () => React.JSX.Element> = {
  privacy: ShieldIcon,
  billing: StarIcon,
  export: DownloadIcon,
  profile: PersonIcon,
  delete: TrashIcon,
};

/* ---------- helpers ---------- */

function normalise(s: string) {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

/* Wraps the parts of `text` that match `query` in <mark>. Case-insensitive, whole query only. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (q.length < 2) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(needle, i);
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="bg-rust/15 text-inherit rounded-[3px] px-[1px]">
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    i = idx + needle.length;
    idx = lower.indexOf(needle, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

/* ---------- pieces ---------- */

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`font-caveat text-rust text-[0.9rem] md:text-[0.95rem] tracking-wide px-1 ${className}`}>{children}</p>
  );
}

/* Pill in the horizontal strip below lg; full-width row in the rail at lg. */
function TopicChip({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-serif text-[0.86rem] leading-none transition cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust/40 lg:w-full lg:justify-between lg:rounded-[0.85rem] lg:px-3.5 lg:py-2.5 lg:text-[0.9rem] ${active
        ? "bg-rust text-cream-soft border-rust"
        : "bg-cream-light text-ink-soft border-hairline/70 hover:border-rust/40 hover:text-ink lg:border-transparent lg:bg-transparent lg:hover:bg-cream-light lg:hover:border-hairline/70"
        }`}
    >
      {label}
      {typeof count === "number" && (
        <span className={`text-[0.72rem] tabular-nums ${active ? "text-cream-soft/70" : "text-muted/70"}`}>{count}</span>
      )}
    </button>
  );
}

function QuickAction({
  icon,
  title,
  sub,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-center gap-3.5 rounded-[1.1rem] bg-cream-light border border-hairline/60 px-4 py-3.5 hover:border-rust/30 hover:-translate-y-px active:translate-y-0 active:scale-[0.995] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust/40 lg:rounded-[0.9rem] lg:px-3.5 lg:py-3"
    >
      <span
        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition ${danger
          ? "text-danger bg-danger/10 group-hover:bg-danger/15"
          : "text-charcoal-light bg-cream group-hover:bg-cream-dark/70"
          }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block font-serif text-[0.98rem] leading-snug ${danger ? "text-danger" : "text-ink"}`}>{title}</span>
        <span className="block font-caveat text-muted text-[0.8rem] leading-snug truncate lg:overflow-visible lg:whitespace-normal">
          {sub}
        </span>
      </span>
      <span className={`shrink-0 text-muted/60 transition group-hover:translate-x-0.5 ${danger ? "group-hover:text-danger" : "group-hover:text-rust"}`}>
        <ChevronRightIcon />
      </span>
    </button>
  );
}

function FaqRow({
  question,
  answer,
  topic,
  query,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  topic: string;
  query: string;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 md:px-5 md:py-4 lg:px-6 lg:py-4.5 hover:bg-cream/60 transition cursor-pointer focus-visible:outline-none focus-visible:bg-cream/60"
      >
        <span className="min-w-0">
          <span className="block font-serif text-ink text-[1.02rem] lg:text-[1.06rem] leading-snug">
            <Highlight text={question} query={query} />
          </span>
          <span className="block font-caveat text-muted/80 text-[0.76rem] mt-0.5 tracking-wide">{topic}</span>
        </span>
        <span className={`shrink-0 text-muted/70 transition-transform duration-200 ${open ? "rotate-180 text-rust" : ""}`}>
          <ChevronDownIcon />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 md:px-5 lg:px-6 lg:pb-5 -mt-1 font-serif text-ink-soft text-[0.9rem] lg:text-[0.94rem] leading-relaxed lg:max-w-[62ch]">
            <Highlight text={answer} query={query} />
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

const TOPIC_ORDER: HelpTopic[] = ["account", "billing", "data", "safety", "app"];

export default function HelpSupportPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<HelpTopic | "all">("all");
  const [openKey, setOpenKey] = useState<string | null>(helpCopy.faqs[0].q);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const q = normalise(query);

  // Search narrows first, then the topic chips narrow within that - chip
  // counts reflect the search so an empty topic is visible before you tap it.
  const searched = useMemo(() => {
    if (!q) return [...helpCopy.faqs];
    const words = q.split(" ");
    return helpCopy.faqs.filter((f) => {
      const hay = normalise(`${f.q} ${f.a} ${helpCopy.topics.names[f.topic]}`);
      return words.every((w) => hay.includes(w));
    });
  }, [q]);

  const visible = topic === "all" ? searched : searched.filter((f) => f.topic === topic);
  // A single hit is almost certainly the one they want - show the answer without a tap.
  const effectiveOpen = q && visible.length === 1 ? visible[0].q : openKey;

  const counts = useMemo(() => {
    const c: Record<HelpTopic, number> = { account: 0, billing: 0, data: 0, safety: 0, app: 0 };
    for (const f of searched) c[f.topic] += 1;
    return c;
  }, [searched]);

  const resultsLabel =
    visible.length === 1 ? helpCopy.search.resultOne : helpCopy.search.results.replace("{n}", String(visible.length));

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  function jumpToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => messageRef.current?.focus({ preventScroll: true }), 350);
  }

  function sendMail() {
    if (!message.trim()) {
      setFormError(helpCopy.contact.form.missing);
      messageRef.current?.focus();
      return;
    }
    setFormError(null);
    const params = new URLSearchParams({
      subject: subject.trim() || "privateaile - help",
      body: message.trim(),
    });
    window.location.href = `mailto:${helpCopy.contact.address}?${params.toString().replace(/\+/g, "%20")}`;
  }

  // Below lg the quick actions get out of the way while searching; in the
  // desktop rail there's room, so they stay.
  const quickHidden = q ? "hidden lg:block" : "";

  return (
    <div className="min-h-[100dvh] w-full app-gradient px-5 md:px-8 lg:px-10 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-10 md:pb-16">
      <main className="mx-auto w-full max-w-[600px] lg:max-w-[1120px] flex flex-col">
        {/* top bar */}
        <div className="flex items-center gap-2 shrink-0 lg:gap-4">
          <button
            type="button"
            aria-label="Back"
            onClick={() => navigate("/settings")}
            className="h-9 w-9 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust/40 shrink-0"
          >
            <BackIcon />
          </button>
          <p className="flex-1 text-center font-serif text-ink-soft text-[1.05rem] lg:text-left">help & support</p>
          <span className="h-9 w-9 shrink-0 lg:hidden" aria-hidden="true" />
        </div>

        {/* headline - centred on phones, a left-hung masthead on the desk */}
        <div className="mt-7 text-center lg:mt-10 lg:text-left lg:border-b lg:border-hairline/60 lg:pb-8">
          <h1 className="font-display text-ink text-[1.8rem] md:text-[2.1rem] lg:text-[2.6rem] leading-tight">{helpCopy.headline}</h1>
          <p className="font-serif text-muted text-[0.95rem] lg:text-[1.02rem] mt-2 lg:max-w-[52ch]">{helpCopy.sub}</p>
        </div>

        <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] lg:gap-12 xl:gap-16 lg:items-start lg:mt-9">
          {/* ---- rail ---- */}
          <aside className="lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:no-scrollbar lg:pb-4">
            {/* search */}
            <label className="mt-6 lg:mt-0 relative block">
              <span className="sr-only">Search the FAQs</span>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted/70">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && query) {
                    e.preventDefault();
                    clearSearch();
                  }
                }}
                placeholder={helpCopy.search.placeholder}
                autoComplete="off"
                enterKeyHint="search"
                className="w-full rounded-full bg-cream-light border border-hairline/70 pl-11 pr-20 py-3 font-serif text-ink text-[0.95rem] placeholder:text-muted/60 focus:outline-none focus:border-rust/50 focus:ring-2 focus:ring-rust/15 transition [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 font-caveat text-[0.8rem] text-muted hover:text-ink hover:bg-cream transition cursor-pointer"
                >
                  <CloseIcon />
                  {helpCopy.search.clear}
                </button>
              )}
            </label>

            {/* topics */}
            <SectionLabel className="hidden lg:block mt-7 mb-2">{helpCopy.topics.label}</SectionLabel>
            <div className="mt-4 -mx-5 px-5 md:mx-0 md:px-0 lg:mt-0">
              <div
                role="radiogroup"
                aria-label={helpCopy.topics.label}
                className="flex gap-2 overflow-x-auto no-scrollbar pb-1 md:flex-wrap lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
              >
                <TopicChip
                  label={helpCopy.topics.all}
                  active={topic === "all"}
                  count={q ? searched.length : undefined}
                  onClick={() => setTopic("all")}
                />
                {TOPIC_ORDER.map((t) => (
                  <TopicChip
                    key={t}
                    label={helpCopy.topics.names[t]}
                    active={topic === t}
                    count={q ? counts[t] : undefined}
                    onClick={() => setTopic(topic === t ? "all" : t)}
                  />
                ))}
              </div>
            </div>

            {/* quick actions */}
            <div className={quickHidden}>
              <SectionLabel className="mt-8 mb-2.5 lg:mt-7">{helpCopy.quickActions.label}</SectionLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 lg:gap-2">
                {helpCopy.quickActions.items.map((a) => {
                  const Icon = ACTION_ICONS[a.key] ?? StarIcon;
                  return (
                    <QuickAction
                      key={a.key}
                      icon={<Icon />}
                      title={a.title}
                      sub={a.sub}
                      danger={a.key === "delete"}
                      onClick={() => navigate(a.to)}
                    />
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ---- main column ---- */}
          <div className="min-w-0">
            <div className="flex items-baseline justify-between lg:mt-0">
              <SectionLabel className="mt-8 mb-2.5 lg:mt-0">
                {topic === "all" ? "faqs" : helpCopy.topics.names[topic]}
              </SectionLabel>
              <p className="font-caveat text-muted/70 text-[0.8rem] tabular-nums px-1" aria-live="polite">
                {resultsLabel}
              </p>
            </div>

            {visible.length > 0 ? (
              <div className="rounded-[1.2rem] bg-cream-light border border-hairline/60 divide-y divide-hairline/50 overflow-hidden">
                {visible.map((f) => (
                  <FaqRow
                    key={f.q}
                    question={f.q}
                    answer={f.a}
                    topic={helpCopy.topics.names[f.topic]}
                    query={query}
                    open={effectiveOpen === f.q}
                    onToggle={() => setOpenKey(effectiveOpen === f.q ? null : f.q)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.2rem] bg-cream-light border border-dashed border-hairline px-5 py-8 lg:py-14 text-center">
                <h2 className="font-display text-ink text-[1.2rem] lg:text-[1.4rem] leading-tight">{helpCopy.search.empty.headline}</h2>
                <p className="font-serif text-ink-soft text-[0.9rem] leading-relaxed mt-2 max-w-[360px] mx-auto">{helpCopy.search.empty.body}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={jumpToForm}
                    className="rounded-full bg-rust text-cream-soft font-serif text-[0.9rem] px-5 py-2 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer"
                  >
                    {helpCopy.search.empty.action}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setTopic("all");
                    }}
                    className="rounded-full border border-hairline/70 bg-cream-light text-ink-soft font-serif text-[0.9rem] px-5 py-2 hover:border-rust/40 transition cursor-pointer"
                  >
                    {helpCopy.search.clear}
                  </button>
                </div>
              </div>
            )}

            {/* contact - stacked on phones, pitch beside form on the desk */}
            <div
              ref={formRef}
              className="mt-9 lg:mt-8 scroll-mt-6 rounded-[1.2rem] bg-cream-light border border-hairline/60 overflow-hidden lg:grid lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-stretch"
            >
              <div className="px-5 pt-6 md:pt-7 text-center lg:text-left lg:p-7 lg:h-full lg:bg-cream/50 lg:border-r lg:border-hairline/50">
                <span
                  aria-hidden="true"
                  className="mx-auto lg:mx-0 mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rust/10 text-rust"
                >
                  <MailIcon />
                </span>
                <p className="font-caveat text-rust text-[0.9rem] tracking-wide">{helpCopy.contact.kicker}</p>
                <h2 className="font-display text-ink text-[1.3rem] leading-tight mt-1">{helpCopy.contact.headline}</h2>
                <p className="font-serif text-ink-soft text-[0.9rem] leading-relaxed mt-2 max-w-[380px] mx-auto lg:mx-0">
                  {helpCopy.contact.body}
                </p>
                <a
                  href={`mailto:${helpCopy.contact.address}`}
                  className="hidden lg:inline-block mt-4 font-caveat text-muted text-[0.84rem] underline decoration-hairline underline-offset-2 hover:text-ink transition"
                >
                  {helpCopy.contact.address}
                </a>
              </div>

              <form
                className="px-5 pb-6 md:px-6 md:pb-7 mt-5 lg:mt-0 lg:p-7 flex flex-col gap-3.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMail();
                }}
                noValidate
              >
                <label className="block">
                  <span className="block font-caveat text-muted text-[0.84rem] mb-1.5 px-1">{helpCopy.contact.form.subjectLabel}</span>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={helpCopy.contact.form.subjectPlaceholder}
                    maxLength={120}
                    className="w-full rounded-[0.9rem] bg-cream lg:bg-cream-light border border-hairline/70 px-4 py-2.5 font-serif text-ink text-[0.93rem] placeholder:text-muted/60 focus:outline-none focus:border-rust/50 focus:ring-2 focus:ring-rust/15 transition"
                  />
                </label>
                <label className="block">
                  <span className="block font-caveat text-muted text-[0.84rem] mb-1.5 px-1">{helpCopy.contact.form.messageLabel}</span>
                  <textarea
                    ref={messageRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder={helpCopy.contact.form.messagePlaceholder}
                    rows={5}
                    maxLength={4000}
                    aria-invalid={formError ? true : undefined}
                    className={`w-full resize-y min-h-[7rem] rounded-[0.9rem] bg-cream lg:bg-cream-light border px-4 py-3 font-serif text-ink text-[0.93rem] leading-relaxed placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-rust/15 transition ${formError ? "border-danger/60 focus:border-danger/60" : "border-hairline/70 focus:border-rust/50"
                      }`}
                  />
                </label>

                {formError && (
                  <p role="alert" className="font-caveat text-danger text-[0.86rem] -mt-1 px-1">
                    {formError}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-rust text-cream-soft font-serif text-[0.95rem] px-6 py-2.5 hover:bg-rust-hover active:scale-[0.98] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-light shrink-0"
                  >
                    <SendIcon />
                    {helpCopy.contact.form.send}
                  </button>
                  <p className="font-caveat text-muted/70 text-[0.8rem] sm:flex-1">
                    {helpCopy.contact.form.hint}{" "}
                    <a
                      href={`mailto:${helpCopy.contact.address}`}
                      className="lg:hidden underline decoration-hairline underline-offset-2 hover:text-ink transition"
                    >
                      {helpCopy.contact.address}
                    </a>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>

        <p className="mt-8 mb-2 text-center font-caveat text-muted/70 text-[0.78rem] lg:mt-12">{helpCopy.footer}</p>
      </main>
    </div>
  );
}
