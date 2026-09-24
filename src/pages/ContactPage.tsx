import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { SiteFooter, SiteHeader } from "../components/landing/SiteChrome";
import { HeroCurves, PencilArrow } from "../components/landing/LandingHero";
import { useReveal } from "../components/landing/useReveal";
import { helpCopy } from "../copy";
import "../components/landing/landing.css";

/* /contact - ungated, like /about and /legal.

   Left: who runs Privateaile - the company details, word for word the same
   as the Contact tab of /legal. Right: the address to write to (from
   copy.ts, so it can't drift from the help page) and a few useful links. */

const ADDRESS = helpCopy.contact.address;

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

export default function ContactPage() {
    useReveal();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const prev = document.title;
        document.title = "Contact - Privateaile";
        window.scrollTo(0, 0);
        return () => {
            document.title = prev;
        };
    }, []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(ADDRESS);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard blocked (http, old browser) - the address is on screen anyway.
        }
    };

    return (
        <div
            className="lp relative min-h-dvh w-full overflow-x-clip app-gradient text-ink flex flex-col"
            style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
        >
            <SiteHeader current="/contact" />

            {/* ── hero ────────────────────────────────────────────── */}
            <section className="lp-hero relative w-full overflow-hidden">
                <HeroCurves className="pointer-events-none absolute inset-0 h-full w-full" />
                <div className="relative mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8 pt-[clamp(2.75rem,10vw,4rem)] lg:pt-12 pb-[clamp(2.5rem,7vw,4rem)]">
                    <div className="chat-rise max-w-[40rem]">
                        <p className="lp-kicker flex items-center gap-3 text-muted text-[0.95rem] sm:text-[1rem]">
                            contact <span className="h-px w-6 bg-muted/60" aria-hidden="true" />
                        </p>
                        <h1 className="lp-serif text-ink font-semibold text-[clamp(2.05rem,9.3vw,2.6rem)] sm:text-[3rem] lg:text-[3.5rem] leading-[1.08] tracking-[-0.02em] mt-5 sm:mt-6">
                            Write to us.
                        </h1>
                        <p className="text-ink-soft text-[1.02rem] sm:text-[1.15rem] leading-[1.7] mt-5">
                            A question, a problem, or something you think we got wrong - tell us. A real person reads every
                            message, usually within a day. No ticket queue, no bot reply.
                        </p>
                    </div>
                </div>
            </section>

            <main className="relative flex-1 flex flex-col items-center w-full px-4 sm:px-6 lg:px-8">
                <section className="w-full max-w-[1180px] pt-2 sm:pt-4 grid lg:grid-cols-[1.35fr_1fr] gap-5 lg:gap-8 items-start">
                    {/* ── who runs Privateaile ─────────────────────
                       Same wording as the Contact tab of /legal
                       (LegalPage.tsx); change both together. */}
                    <section
                        aria-labelledby="company-h"
                        className="chat-rise lp-card rounded-[1.75rem] px-5 sm:px-8 lg:px-10 py-7 sm:py-9"
                    >
                        <h2 id="company-h" className="lp-label">company details</h2>

                        <p className="text-ink-soft text-[1rem] leading-[1.65] mt-5">
                            <strong className="text-ink font-semibold">Private Aile</strong> is operated by
                        </p>
                        <address className="not-italic lp-serif text-ink text-[1.08rem] sm:text-[1.15rem] leading-[1.6] mt-2">
                            <strong className="block font-semibold text-[1.35rem] sm:text-[1.6rem] leading-[1.2] tracking-[-0.01em] mb-2">
                                SHVANA AI and Robotics Private Limited
                            </strong>
                            Innv8 Okhla Phase III
                            <br />
                            211 Okhla Industrial Estate
                            <br />
                            New Delhi, South Delhi 110020, Delhi
                            <br />
                            India
                            <br />
                            <span className="text-ink-soft">CIN: U62090DL2026PTC467490</span>
                        </address>

                        <div className="mt-7 pt-7 border-t border-hairline flex flex-col gap-4 text-ink-soft text-[0.98rem] leading-[1.65]">
                            <p>
                                <strong className="text-ink font-semibold">All enquiries (support, billing, privacy, grievances):</strong>{" "}
                                <a href={`mailto:${ADDRESS}`} className="text-rust underline underline-offset-2 whitespace-nowrap">
                                    {ADDRESS}
                                </a>
                            </p>
                            <p>
                                <strong className="text-ink font-semibold">Grievance Officer:</strong> Authorised Signatory, SHVANA AI and
                                Robotics Private Limited,{" "}
                                <a href={`mailto:${ADDRESS}`} className="text-rust underline underline-offset-2 whitespace-nowrap">
                                    {ADDRESS}
                                </a>
                            </p>
                            <p>We respond to support requests within 2 business days and acknowledge grievances within 24 hours.</p>
                            <p>For legal notices, please write to the registered address above.</p>
                        </div>
                    </section>

                    {/* ── the side column ──────────────────────── */}
                    <aside className="flex flex-col gap-4 sm:gap-5">
                        <div className="chat-rise lp-night relative overflow-hidden rounded-[1.5rem] px-6 py-7">
                            <div className="relative">
                                <p className="lp-label" style={{ color: "var(--night-soft)" }}>
                                    email us directly
                                </p>
                                <p className="lp-serif text-[1.35rem] sm:text-[1.5rem] leading-tight mt-3 break-all">{ADDRESS}</p>
                                <div className="mt-5 flex flex-wrap gap-2.5">
                                    <a
                                        href={`mailto:${ADDRESS}`}
                                        className="lp-btn-light rounded-full min-h-[2.6rem] px-5 inline-flex items-center gap-2 text-[0.92rem]"
                                    >
                                        <Icon className="h-4 w-4">
                                            <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                                            <path d="M4 7l8 6 8-6" />
                                        </Icon>
                                        Email
                                    </a>
                                    <button
                                        type="button"
                                        onClick={copy}
                                        className="lp-btn-ghost cursor-pointer rounded-full min-h-[2.6rem] px-5 inline-flex items-center gap-2 text-[0.92rem]"
                                    >
                                        <Icon className="h-4 w-4">
                                            <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
                                            <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
                                        </Icon>
                                        <span aria-live="polite">{copied ? "Copied" : "Copy address"}</span>
                                    </button>
                                </div>
                                <p className="mt-5 flex items-center gap-2 text-[0.88rem]" style={{ color: "var(--night-soft)" }}>
                                    <Icon className="h-4 w-4">
                                        <circle cx="12" cy="12" r="8.5" />
                                        <path d="M12 7.5V12l3 2" />
                                    </Icon>
                                    usually a reply within a day
                                </p>
                            </div>
                        </div>

                        <ul className="lp-card rounded-[1.5rem] p-2">
                            {[
                                {
                                    to: "/#faq",
                                    title: "Quick answers",
                                    body: "Plans, credits, the trial, and who can read what you write.",
                                    icon: (
                                        <>
                                            <circle cx="12" cy="12" r="8.5" />
                                            <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.5h.01" />
                                        </>
                                    ),
                                },
                                {
                                    to: "/legal#privacy",
                                    title: "Privacy and your data",
                                    body: "What we store, what leaves our servers, and for how long.",
                                    icon: (
                                        <>
                                            <rect x="5" y="10.5" width="14" height="10" rx="2" />
                                            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                                        </>
                                    ),
                                },
                                {
                                    to: "/settings/help",
                                    title: "Already have a notebook?",
                                    body: "Settings → Help has answers about your account.",
                                    icon: (
                                        <>
                                            <path d="M6 4.5h10.5a2 2 0 0 1 2 2V20H8a2 2 0 0 1-2-2z" />
                                            <path d="M9.5 9h6M9.5 12.5h4.5" />
                                        </>
                                    ),
                                },
                            ].map((l) => (
                                <li key={l.title}>
                                    <Link to={l.to} className="group flex items-start gap-3.5 rounded-[1.1rem] px-4 py-3.5 transition-colors hover:bg-ink/[0.04]">
                                        <span className="h-10 w-10 shrink-0 rounded-full bg-lavender text-rust flex items-center justify-center transition-colors group-hover:bg-rust group-hover:text-cream-soft">
                                            <Icon>{l.icon}</Icon>
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block lp-serif text-ink text-[1.1rem] leading-tight">
                                                {l.title} <span className="text-muted transition-transform inline-block group-hover:translate-x-0.5">→</span>
                                            </span>
                                            <span className="block text-ink-soft text-[0.88rem] leading-[1.55] mt-1">{l.body}</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        <div className="relative hidden sm:flex items-center gap-1 pl-4 text-rust-light" aria-hidden="true">
                            <PencilArrow className="h-7 w-10 -scale-y-100" />
                            <span className="lp-script text-[0.8rem] -rotate-[3deg]">we read every one</span>
                        </div>
                    </aside>
                </section>

                {/* ── not an emergency service ─────────────────────── */}
                <section className="lp-reveal w-full max-w-[1180px] pt-[clamp(3rem,8vw,5rem)] pb-[clamp(3.5rem,9vw,6rem)]">
                    <div className="lp-card rounded-[1.5rem] px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
                        <span className="h-11 w-11 shrink-0 rounded-full bg-lavender text-rust flex items-center justify-center">
                            <Icon>
                                <path d="M12 20s-6.5-4.2-6.5-9.3A3.7 3.7 0 0 1 12 8.6a3.7 3.7 0 0 1 6.5 2.1C18.5 15.8 12 20 12 20z" />
                            </Icon>
                        </span>
                        <p className="text-ink-soft text-[0.95rem] leading-[1.65]">
                            <span className="text-ink">Privateaile isn’t an emergency service.</span> If you or someone else is
                            in danger right now, please call your local emergency number - in India, that’s{" "}
                            <a href="tel:112" className="text-ink underline underline-offset-2">112</a>.
                        </p>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
