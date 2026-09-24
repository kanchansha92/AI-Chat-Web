import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SiteFooter, SiteHeader } from "../components/landing/SiteChrome";
import { BrandMark, HandwrittenWords, HeroCurves, PencilArrow } from "../components/landing/LandingHero";
import { useReveal } from "../components/landing/useReveal";
import "../components/landing/landing.css";

/* /about - ungated, like /legal: a stranger has to be able to read it.

   Everything here is drawn from DESIGN.md (who it's for, what it is and
   isn't, memory and loss) and PRIVACY.md (what happens to your words). It
   makes no claim about the team, dates or numbers - add those when there are
   real ones to add. Same look as the landing page: .lp scope, tokens only. */

function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

function Label({ children, light = false }: { children: ReactNode; light?: boolean }) {
    return (
        <p className="lp-label" style={light ? { color: "var(--night-soft)" } : undefined}>
            {children}
        </p>
    );
}

const BELIEFS: { title: string; body: string; icon: ReactNode }[] = [
    {
        title: "Privacy first",
        body: "What you write is yours. It isn’t sold, it isn’t used for advertising, and we don’t train AI on it.",
        icon: (
            <>
                <rect x="5" y="10.5" width="14" height="10" rx="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </>
        ),
    },
    {
        title: "Comfort over engagement",
        body: "No streaks, points or nudges. Nothing here is designed to pull you back - come when you want to.",
        icon: <path d="M12 20s-6.5-4.2-6.5-9.3A3.7 3.7 0 0 1 12 8.6a3.7 3.7 0 0 1 6.5 2.1C18.5 15.8 12 20 12 20z" />,
    },
    {
        title: "Simple on purpose",
        body: "A notebook, a few rooms, and someone thoughtful to write with. Fewer buttons, more room to think.",
        icon: (
            <>
                <path d="M6 4.5h10.5a2 2 0 0 1 2 2V20H8a2 2 0 0 1-2-2z" />
                <path d="M9.5 9h6M9.5 12.5h4.5" />
            </>
        ),
    },
    {
        title: "Conversation that means something",
        body: "Replies that listen before they answer - for a hard message, a decision, or a day that needs untangling.",
        icon: (
            <>
                <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />
                <path d="M8 10h8M8 13h5" />
            </>
        ),
    },
    {
        title: "Room to create",
        body: "Invent characters, give them a voice and a world, and write stories with them - alone or a few at a time.",
        icon: <path d="M11 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5z" />,
    },
    {
        title: "You’re in control",
        body: "See and forget what a character remembers. Export everything, or delete your account, whenever you like.",
        icon: (
            <>
                <path d="M4 7h16M4 12h16M4 17h16" />
                <circle cx="9" cy="7" r="1.8" fill="var(--color-cream-light)" />
                <circle cx="15" cy="12" r="1.8" fill="var(--color-cream-light)" />
                <circle cx="7" cy="17" r="1.8" fill="var(--color-cream-light)" />
            </>
        ),
    },
];

const IS = [
    "a private journal that reflects back, only when you ask",
    "a place to write about the people who mattered",
    "a studio for characters and stories - fiction, always",
    "someone thoughtful to talk things through with",
];

const ISNT = [
    "an AI girlfriend or boyfriend app",
    "an adult or NSFW platform",
    "a productivity or enterprise tool",
    "anyone pretending to be human - or to be someone you’ve lost",
];

export default function AboutPage() {
    const navigate = useNavigate();
    useReveal();

    useEffect(() => {
        const prev = document.title;
        document.title = "About - Privateaile";
        window.scrollTo(0, 0);
        return () => {
            document.title = prev;
        };
    }, []);

    return (
        <div
            className="lp relative min-h-dvh w-full overflow-x-clip app-gradient text-ink flex flex-col"
            style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
        >
            <SiteHeader current="/about" />

            {/* ── hero ────────────────────────────────────────────── */}
            <section className="lp-hero relative w-full overflow-hidden">
                <HeroCurves className="pointer-events-none absolute inset-0 h-full w-full" />
                <div className="relative mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8 pt-[clamp(2.75rem,10vw,4rem)] lg:pt-12 pb-[clamp(3rem,9vw,5.5rem)] grid lg:grid-cols-[1.35fr_1fr] gap-10 items-center">
                    <div className="chat-rise">
                        <p className="lp-kicker flex items-center gap-3 text-muted text-[0.95rem] sm:text-[1rem]">
                            about us <span className="h-px w-6 bg-muted/60" aria-hidden="true" />
                        </p>
                        <h1 className="lp-serif text-ink font-semibold text-[clamp(2.05rem,9.3vw,2.6rem)] sm:text-[3rem] lg:text-[3.5rem] leading-[1.08] tracking-[-0.02em] mt-5 sm:mt-6 max-w-[16ch]">
                            A quiet room, in a noisy corner of the internet.
                        </h1>
                        <p className="text-ink-soft text-[1.02rem] sm:text-[1.15rem] leading-[1.7] mt-6 max-w-[36rem]">
                            Privateaile is a private notebook with someone thoughtful to write alongside - a journal that
                            listens, a place to keep the people who mattered, and room to invent characters and stories.
                            This page is about why it exists, and what it will and won’t ever be.
                        </p>
                    </div>

                    {/* a margin note, pinned beside the hero on wide screens */}
                    <div className="relative hidden lg:block" aria-hidden="true">
                        <div className="lp-card rounded-[1rem] px-7 pt-9 pb-8 rotate-[2deg] max-w-[22rem] ml-auto shadow-[0_30px_60px_-36px_rgba(22,34,74,0.55)]">
                            <span className="lp-tape" />
                            <p className="lp-script text-rust text-[0.95rem] leading-[2]">
                                come in, write something,
                                <br />
                                talk it through,
                                <br />
                                make something -
                                <br />
                                then close the notebook.
                            </p>
                            <p className="mt-4 flex items-center gap-2 text-muted text-[0.85rem]">
                                <BrandMark className="h-5 w-[0.9rem]" /> the whole idea
                            </p>
                        </div>
                        <HandwrittenWords className="absolute -left-4 -bottom-16 text-[0.95rem]" />
                    </div>
                </div>
            </section>

            <main className="relative flex-1 flex flex-col items-center w-full px-4 sm:px-6 lg:px-8">
                {/* ── why it exists ───────────────────────────────── */}
                <section className="lp-reveal w-full max-w-[1180px] pt-[clamp(3rem,9vw,5.5rem)] grid lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-16 items-start">
                    <div>
                        <Label>why it exists</Label>
                        <h2 className="lp-serif text-ink font-medium text-[clamp(1.85rem,6vw,2.7rem)] leading-[1.1] tracking-[-0.015em] mt-3 text-balance">
                            Most apps want your time. We wanted to give some back.
                        </h2>
                    </div>
                    <div className="text-ink-soft text-[1rem] sm:text-[1.08rem] leading-[1.8] space-y-5">
                        <p>
                            A lot of AI apps are built to keep you there - streaks to protect, notifications asking where
                            you went, companions that miss you. Many people tried them and came away feeling pushed,
                            gamified, or worse.
                        </p>
                        <p>
                            Privateaile starts from the opposite idea. It’s somewhere to put down what’s on your mind, talk
                            it through with something that listens, make something up if you feel like it - and then
                            leave. No score, no pressure, no reason to stay longer than you want to.
                        </p>
                        <p className="lp-script text-rust-light text-[0.9rem] -rotate-[2deg] !mt-6" aria-hidden="true">
                            that’s the whole design brief, really
                        </p>
                    </div>
                </section>

                {/* ── what we believe ─────────────────────────────── */}
                <section className="lp-reveal w-full max-w-[1180px] pt-[clamp(4rem,11vw,7rem)]">
                    <div className="text-center max-w-[40rem] mx-auto">
                        <Label>what we believe</Label>
                        <h2 className="lp-serif text-ink font-medium text-[clamp(1.85rem,6vw,2.7rem)] leading-[1.1] tracking-[-0.015em] mt-3 text-balance">
                            Six things we won’t trade away.
                        </h2>
                    </div>
                    <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {BELIEFS.map((b, i) => (
                            <li
                                key={b.title}
                                className="group lp-card rounded-[1.25rem] px-5 py-6 flex gap-4 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-28px_rgba(22,34,74,0.5)]"
                            >
                                <span className="h-11 w-11 shrink-0 rounded-full bg-lavender text-rust flex items-center justify-center transition-colors group-hover:bg-rust group-hover:text-cream-soft">
                                    <Icon>{b.icon}</Icon>
                                </span>
                                <div>
                                    <p className="text-muted text-[0.75rem] tracking-[0.14em]">0{i + 1}</p>
                                    <h3 className="lp-serif text-ink font-medium text-[1.25rem] leading-tight mt-0.5">{b.title}</h3>
                                    <p className="text-ink-soft text-[0.92rem] leading-[1.65] mt-2">{b.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* ── is / isn't ──────────────────────────────────── */}
                <section className="lp-reveal w-full max-w-[1180px] pt-[clamp(4rem,11vw,7rem)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        <div className="lp-card rounded-[1.5rem] px-6 sm:px-8 py-7 sm:py-9">
                            <Label>what Privateaile is</Label>
                            <ul className="ruled mt-5 flex flex-col">
                                {IS.map((l) => (
                                    <li key={l} className="flex items-start gap-3 text-ink-soft text-[0.97rem] leading-[2rem]">
                                        <span className="mt-[0.55rem] text-rust shrink-0">
                                            <Icon className="h-4 w-4">
                                                <path d="M5 12.5l4.5 4.5L19 6.5" />
                                            </Icon>
                                        </span>
                                        <span className="text-pretty">{l}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative lp-card rounded-[1.5rem] px-6 sm:px-8 py-7 sm:py-9 md:rotate-[1deg]">
                            <Label>and what it isn’t</Label>
                            <ul className="ruled mt-5 flex flex-col">
                                {ISNT.map((l) => (
                                    <li key={l} className="flex items-start gap-3 text-ink-soft text-[0.97rem] leading-[2rem]">
                                        <span className="mt-[0.55rem] text-muted shrink-0">
                                            <Icon className="h-4 w-4">
                                                <path d="M6 6l12 12M18 6L6 18" />
                                            </Icon>
                                        </span>
                                        <span className="text-pretty">{l}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── memory and loss ─────────────────────────────── */}
                <section className="lp-reveal w-full max-w-[900px] pt-[clamp(4rem,11vw,7rem)]">
                    <div className="relative lp-card rounded-[1.75rem] px-6 sm:px-12 py-9 sm:py-12 text-center">
                        <span className="mx-auto h-12 w-12 rounded-full bg-lavender text-rust flex items-center justify-center">
                            <Icon className="h-6 w-6">
                                <path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z" />
                            </Icon>
                        </span>
                        <div className="mt-5">
                            <Label>on memory and loss</Label>
                        </div>
                        <h2 className="lp-serif text-ink font-medium text-[clamp(1.6rem,5.4vw,2.3rem)] leading-[1.15] mt-3 text-balance">
                            Write about them. It will never pretend to be them.
                        </h2>
                        <p className="text-ink-soft text-[1rem] sm:text-[1.05rem] leading-[1.8] mt-5 max-w-[40rem] mx-auto">
                            When you write about someone you’ve lost - what they said, how they laughed, what you’d tell them
                            now - Privateaile helps you hold the memory and reflect on it. It will not speak as them, living
                            or gone. Characters are fiction, always; the real people belong in the journal.
                        </p>
                        <div className="hidden sm:flex items-center justify-center gap-1 mt-6 text-rust-light" aria-hidden="true">
                            <PencilArrow className="h-7 w-10 -scale-y-100" />
                            <span className="lp-script text-[0.8rem] -rotate-[3deg]">a line we won’t cross</span>
                        </div>
                    </div>
                </section>

                {/* ── your words (night panel) ────────────────────── */}
                <section className="lp-reveal w-full max-w-[1180px] pt-[clamp(4rem,11vw,7rem)]">
                    <div className="lp-night relative overflow-hidden rounded-[2rem] px-6 sm:px-12 lg:px-14 py-10 sm:py-14">
                        <div className="relative grid lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-14 items-start">
                            <div>
                                <Label light>your words</Label>
                                <h2 className="lp-serif font-medium text-[clamp(1.85rem,6vw,2.6rem)] leading-[1.1] tracking-[-0.015em] mt-3 text-balance">
                                    Plain about where they go.
                                </h2>
                                <Link
                                    to="/legal#privacy"
                                    className="inline-block mt-6 text-[0.95rem] underline underline-offset-4 decoration-white/30 hover:decoration-white"
                                >
                                    read the privacy policy →
                                </Link>
                            </div>
                            <ul className="grid sm:grid-cols-2 gap-3">
                                {[
                                    ["Not for sale", "Nothing you write is sold or used for advertising. There are no ads here."],
                                    ["No ads, no trackers", "No advertising, analytics or tracking scripts - and we don’t train AI on your writing."],
                                    [
                                        "Only what a reply needs",
                                        "To write a reply, the conversation is sent to the AI provider that generates it. The policy says what leaves, and for how long.",
                                    ],
                                    ["Yours to take or end", "Export everything, or delete your account and all of it, from settings."],
                                ].map(([t, b]) => (
                                    <li key={t} className="lp-night-card rounded-[1.2rem] px-5 py-4">
                                        <p className="lp-serif text-[1.1rem] leading-tight">{t}</p>
                                        <p className="text-[0.9rem] leading-[1.6] mt-1.5" style={{ color: "var(--night-soft)" }}>
                                            {b}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* ── who it's for + contact ──────────────────────── */}
                <section className="lp-reveal w-full max-w-[1180px] pt-[clamp(4rem,11vw,7rem)] grid md:grid-cols-2 gap-4 sm:gap-5">
                    <div className="lp-card rounded-[1.5rem] px-6 sm:px-8 py-7 sm:py-9">
                        <Label>who it’s for</Label>
                        <h3 className="lp-serif text-ink font-medium text-[1.6rem] sm:text-[1.8rem] leading-[1.15] mt-3">
                            Adults who want a private place to think.
                        </h3>
                        <p className="text-ink-soft text-[0.97rem] leading-[1.75] mt-4">
                            Privateaile is for adults, 18 and over. It’s built with India in mind - prices in rupees, and
                            card or UPI at checkout - and it’s free to begin, with no card needed.
                        </p>
                    </div>
                    <div className="lp-card rounded-[1.5rem] px-6 sm:px-8 py-7 sm:py-9 flex flex-col">
                        <Label>write to us</Label>
                        <h3 className="lp-serif text-ink font-medium text-[1.6rem] sm:text-[1.8rem] leading-[1.15] mt-3">
                            A real person reads every message.
                        </h3>
                        <p className="text-ink-soft text-[0.97rem] leading-[1.75] mt-4">
                            Questions, a problem, or something you think we got wrong - tell us. Usually you’ll hear back
                            within a day.
                        </p>
                        <a
                            href="mailto:care@privateaile.com"
                            className="lp-btn-outline self-start mt-6 rounded-full min-h-[2.8rem] px-5 inline-flex items-center gap-2 text-[0.95rem]"
                        >
                            <Icon className="h-4 w-4">
                                <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                                <path d="M4 7l8 6 8-6" />
                            </Icon>
                            care@privateaile.com
                        </a>
                    </div>
                </section>

                {/* ── last word ───────────────────────────────────── */}
                <section className="lp-reveal w-full max-w-[1180px] pt-[clamp(4rem,11vw,7rem)] pb-[clamp(3.5rem,9vw,6rem)]">
                    <div className="lp-night relative overflow-hidden rounded-[2rem] px-6 sm:px-12 py-[clamp(3rem,8vw,4.5rem)] text-center">
                        <div className="relative">
                            <h2 className="lp-serif font-semibold text-[clamp(2rem,6.4vw,3.1rem)] leading-[1.06] tracking-[-0.015em] text-balance">
                                Open a notebook. Close it when you’re done.
                            </h2>
                            <div className="mt-8 mx-auto flex w-full max-w-[20rem] sm:max-w-none flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate("/signup")}
                                    className="lp-btn-light cursor-pointer rounded-full w-full sm:w-auto min-h-[3rem] px-7 text-[1rem] active:scale-[0.98]"
                                >
                                    Open a notebook →
                                </button>
                                <Link
                                    to="/#pricing"
                                    className="lp-btn-ghost rounded-full w-full sm:w-auto min-h-[3rem] px-7 text-[1rem] flex items-center justify-center"
                                >
                                    See plans
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
