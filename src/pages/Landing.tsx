import { Link, useNavigate } from "react-router-dom";

/* Signed-out entry screen.

   It reads like the first page of a notebook rather than a product hero: one
   headline that says what Ember is for, three things you can do here, and an
   honest paragraph about what it isn't. There is no composer on this page on
   purpose the product is a place to write, not a box to type into. Colours
   and type all come from the tokens in index.css, so paper/lamplight both
   work. */

const PAGES = [
    {
        kicker: "write",
        title: "A journal that listens.",
        body:
            "Threads for the people, questions and days you keep returning to. Write a line or a page; a quiet reflection comes back when you pause, and only if you want it.",
        icon: (
            <>
                <path d="M6 4.5h10.5a2 2 0 0 1 2 2V20H8a2 2 0 0 1-2-2z" />
                <path d="M9.5 9h6M9.5 12.5h4.5" />
                <path d="M6 7.5H4.5M6 12H4.5M6 16.5H4.5" />
            </>
        ),
    },
    {
        kicker: "remember",
        title: "Keep the people who mattered.",
        body:
            "Write about someone you've lost the way they laughed, the things they said. Privateaile helps you hold the memory. It will never pretend to be them.",
        icon: (
            <>
                <path d="M12 20s-6.5-4.2-6.5-9.3A3.7 3.7 0 0 1 12 8.6a3.7 3.7 0 0 1 6.5 2.1C18.5 15.8 12 20 12 20z" />
                <path d="M4 4.5c2.5 1 5 1 8 0 3 1 5.5 1 8 0" />
            </>
        ),
    },
    {
        kicker: "create",
        title: "Characters and stories, yours.",
        body:
            "Invent a person, give them a voice, and write with them one to one, or a few of them in a room with a scene you set. Fiction, always; nothing pretending to be real.",
        icon: (
            <>
                <path d="M4 19.5c3-5 5.5-8 9-11.5l3.5-3.5 2.5 2.5-3.5 3.5C12 14 9 16.5 4 19.5z" />
                <path d="M14.5 6l3.5 3.5" />
                <path d="M4 19.5l2.5-.5" />
            </>
        ),
    },
];

const NOT = [
    "no streaks, points or badges",
    "no notifications begging you back",
    "no one pretending to be human, or to be someone you've lost",
    "nothing you write is sold or used to train anything",
];

function Mark() {
    return (
        <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
            <path
                d="M32 14c1.5 6.5 7 9.5 9.5 15.5 2.8 6.8-.3 15-9.5 16.5-9.2-1.5-12.3-9.7-9.5-16.5C25 23.5 30.5 20.5 32 14z"
                fill="currentColor"
            />
            <path
                d="M18 50.5c9-2.5 19-2.5 28 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity=".6"
            />
        </svg>
    );
}

function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-dvh w-full app-gradient text-ink flex flex-col">
            <style>{`
        @keyframes ember-in-kf { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .ember-in { animation: ember-in-kf .7s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce) { .ember-in { animation: none !important } }
      `}</style>

            {/* ── top bar ─────────────────────────────────────────── */}
            <header className="relative shrink-0 flex items-center justify-between px-5 sm:px-8 lg:px-12 py-5">
                <div className="flex items-center gap-2 text-rust">
                    <Mark />
                    <span className="font-display text-ink text-[1.5rem] leading-none tracking-[-0.01em]">Privateaile</span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => navigate("/signin")}
                        className="cursor-pointer rounded-full px-4 py-2 font-serif text-[0.88rem] text-ink-soft hover:text-ink transition-colors duration-150"
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="chat-accent cursor-pointer rounded-full px-4 py-2 font-serif text-[0.88rem] active:scale-[0.98]"
                    >
                        Open a notebook
                    </button>
                </div>
            </header>

            {/* ── first page ──────────────────────────────────────── */}
            <main className="relative flex-1 flex flex-col items-center px-5 sm:px-8">
                <section className="w-full max-w-[720px] text-center pt-10 sm:pt-16 lg:pt-20 pb-12 sm:pb-16">
                    <p className="ember-in font-caveat text-rust text-[1.15rem] sm:text-[1.3rem] leading-none">
                        a quiet place
                    </p>
                    <h1
                        className="ember-in font-display text-ink text-[2.6rem] sm:text-[3.6rem] lg:text-[4.4rem] leading-[1.02] tracking-[-0.015em] mt-3"
                        style={{ animationDelay: "60ms" }}
                    >
                        A place to <span className="hand-underline">think</span>, write,
                        <br className="hidden sm:block" /> remember, and create.
                    </h1>
                    <p
                        className="ember-in font-serif text-ink-soft text-[1rem] sm:text-[1.1rem] leading-[1.7] mt-6 max-w-[34rem] mx-auto"
                        style={{ animationDelay: "120ms" }}
                    >
                        Privateaile is a private notebook with someone thoughtful to write alongside.
                        Journal, keep the memory of people who mattered, invent characters and
                        stories and leave whenever you like.
                    </p>

                    <div
                        className="ember-in mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
                        style={{ animationDelay: "180ms" }}
                    >
                        <button
                            type="button"
                            onClick={() => navigate("/signup")}
                            className="chat-accent cursor-pointer rounded-full px-6 py-3 font-serif text-[0.98rem] active:scale-[0.98]"
                        >
                            Open a notebook →
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate("/signin")}
                            className="chat-tile cursor-pointer rounded-full px-6 py-3 font-serif text-[0.98rem] text-ink-soft hover:text-ink active:scale-[0.98]"
                        >
                            I have one already
                        </button>
                    </div>

                    <p
                        className="ember-in font-caveat text-muted text-[1rem] mt-6"
                        style={{ animationDelay: "240ms" }}
                    >
                        free to begin · adults only · nothing you write leaves your notebook
                    </p>
                </section>

                {/* ── the three things ────────────────────────────── */}
                <section className="w-full max-w-[1040px] grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 pb-14 sm:pb-20">
                    {PAGES.map((p, i) => (
                        <article
                            key={p.kicker}
                            className="ember-in paper rounded-[1.4rem] px-6 py-7 sm:px-7 sm:py-8 flex flex-col"
                            style={{ animationDelay: `${260 + i * 70}ms` }}
                        >
                            <span className="h-11 w-11 rounded-full bg-rust/10 text-rust flex items-center justify-center">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    {p.icon}
                                </svg>
                            </span>
                            <p className="font-caveat text-rust text-[1.05rem] mt-5 leading-none">{p.kicker}</p>
                            <h2 className="font-display text-ink text-[1.7rem] leading-[1.15] mt-1.5">{p.title}</h2>
                            <p className="font-serif text-ink-soft text-[0.93rem] leading-[1.7] mt-3">{p.body}</p>
                        </article>
                    ))}
                </section>

                {/* ── what it isn't ───────────────────────────────── */}
                <section className="w-full max-w-[720px] pb-16 sm:pb-24">
                    <div className="paper rounded-[1.4rem] px-6 sm:px-10 py-8 sm:py-10">
                        <p className="font-caveat text-rust text-[1.1rem] leading-none">and what Privateaile isn't</p>
                        <h2 className="font-display text-ink text-[1.9rem] sm:text-[2.3rem] leading-[1.1] mt-2">
                            Not a companion app. Not a productivity tool.
                            <br className="hidden sm:block" /> Just a quiet room.
                        </h2>
                        <ul className="ruled mt-5 flex flex-col">
                            {NOT.map((line) => (
                                <li key={line} className="flex items-start gap-3 font-serif text-ink-soft text-[0.95rem] leading-[2rem]">
                                    <span className="mt-[0.9rem] h-1.5 w-1.5 rounded-full bg-rust/70 shrink-0" aria-hidden="true" />
                                    {line}
                                </li>
                            ))}
                        </ul>
                        <p className="font-serif text-ink text-[1rem] leading-[1.7] mt-6">
                            Come in, write something, talk it through, make something.
                            <span className="font-display italic text-rust text-[1.15rem]"> Then close the notebook.</span>
                        </p>
                    </div>
                </section>
            </main>

            {/* ── footer ──────────────────────────────────────────── */}
            <footer className="relative shrink-0 px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.78rem] font-serif text-muted">
                <span className="flex items-center gap-2">
                    <span>© {new Date().getFullYear()} privateaile · for adults, 18+</span>
                    <span aria-hidden="true">·</span>
                    {/* The published policy link. Ungated route - a stranger
                      reading this page has to be able to open it. */}
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-ink transition-colors">
                        privacy
                    </Link>
                </span>
                <span className="font-caveat text-[0.95rem]">a quiet place to think, write, remember, and create.</span>
            </footer>
        </div>
    );
}

export default LandingPage;
