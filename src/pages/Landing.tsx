import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../hook/hooks";
import { loadCatalogue } from "../redux/billingSlice";
import { CreditsSection, PricingSection, type CatalogueState } from "../components/landing/LandingPricing";
import { HeroCurves } from "../components/landing/LandingHero";
import journalBook from "../assets/landing/journal-book.webp";
import {
    CharacterMockup,
    GroupMockup,
    HeroAppMockup,
    ImageMockup,
    ThreadsMockup,
} from "../components/landing/LandingMockups";
import { useReveal } from "../components/landing/useReveal";
import { SiteFooter, SiteHeader } from "../components/landing/SiteChrome";
import "../components/landing/landing.css";

/* Signed-out landing page.

   Privateaile is a whole AI platform - general AI, characters, group rooms,
   journals, images, all kept in threads - so the page says that in the first
   screen, then gives each part its own section. The look is unchanged: navy
   ink on lavender paper, serif headlines, the notebook for the journal.

   Two rules hold throughout:
   - Nothing numeric about a plan is written here. Prices, limits, packs and
     credit costs come from the public catalogue (GET /api/billing/plans).
   - Nothing is claimed that the code or PRIVACY.md doesn't support. Features
     that aren't built yet (editing from a photo, daily journal prompts,
     summaries) are shown as "coming soon", never as available. */

// ─── small pieces ────────────────────────────────────────────────────────────

function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    );
}

function Eyebrow({ children, center = false }: { children: ReactNode; center?: boolean }) {
    return (
        <p className={"lp-label flex items-center gap-3 " + (center ? "justify-center" : "")}>
            {center && <span className="h-px w-6 bg-muted/50" aria-hidden="true" />}
            {children}
            <span className="h-px w-6 bg-muted/50" aria-hidden="true" />
        </p>
    );
}

function SectionHead({ id, eyebrow, title, body, center = false }: { id: string; eyebrow: string; title: ReactNode; body?: ReactNode; center?: boolean }) {
    return (
        <div className={center ? "text-center max-w-[42rem] mx-auto" : "max-w-[34rem]"}>
            <Eyebrow center={center}>{eyebrow}</Eyebrow>
            <h2 id={id} className="lp-serif text-ink font-medium text-[clamp(1.85rem,6vw,2.75rem)] leading-[1.1] tracking-[-0.015em] mt-3 text-balance">
                {title}
            </h2>
            {body && <p className="text-ink-soft text-[clamp(1rem,3.3vw,1.08rem)] leading-[1.7] mt-3.5 text-pretty">{body}</p>}
        </div>
    );
}

function ArrowButton({ onClick, children, light = false }: { onClick: () => void; children: ReactNode; light?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                "group cursor-pointer rounded-full min-h-[2.9rem] px-6 text-[0.97rem] inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] " +
                (light ? "lp-btn-light" : "lp-btn")
            }
        >
            {children}
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
    );
}

function FeatureButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="lp-btn group cursor-pointer rounded-full min-h-[2.6rem] px-5 text-[0.9rem] inline-flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98]"
        >
            {children}
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
    );
}

/** The text block every feature panel opens with: label, serif heading, body, button. */
function FeatureText({
    id,
    eyebrow,
    title,
    body,
    cta,
    onCta,
    compact = false,
}: {
    id: string;
    eyebrow: string;
    title: string;
    body: string;
    cta?: string;
    onCta?: () => void;
    compact?: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="text-muted text-[0.7rem] tracking-[0.14em] uppercase">{eyebrow}</p>
            <h2
                id={id}
                className={
                    "lp-serif text-ink font-medium leading-[1.12] tracking-[-0.01em] mt-2.5 text-balance " +
                    (compact ? "text-[clamp(1.5rem,5vw,1.7rem)]" : "text-[clamp(1.6rem,5vw,1.95rem)]")
                }
            >
                {title}
            </h2>
            <p className="text-ink-soft text-[0.93rem] leading-[1.65] mt-2.5 text-pretty">{body}</p>
            {cta && onCta && (
                <div className="mt-6">
                    <FeatureButton onClick={onCta}>{cta}</FeatureButton>
                </div>
            )}
        </div>
    );
}

/** The reference's shield: navy outline, left half filled. */
function ShieldMark() {
    return (
        <svg viewBox="0 0 48 54" className="h-12 w-11 shrink-0 mt-1" aria-hidden="true">
            <path d="M24 3 43 10v14c0 12.5-8 21.8-19 26C13 45.8 5 36.5 5 24V10z" fill="#FFFFFF" stroke="#25315E" strokeWidth="3" strokeLinejoin="round" />
            <path d="M24 6.2 8 12.2V24c0 10.8 6.6 19 16 22.8z" fill="#25315E" />
        </svg>
    );
}

/** The faint olive sprig drawn across the middle of the privacy band. */
function PrivacySprig() {
    const leaves = [
        [30, 132, -30], [44, 112, 40], [58, 96, -34], [74, 78, 36], [88, 62, -40], [104, 46, 30], [118, 30, -38],
    ];
    return (
        <svg viewBox="0 0 160 170" className="pointer-events-none absolute left-[27%] top-1/2 -translate-y-1/2 h-[80%] w-auto opacity-60 hidden xl:block" aria-hidden="true">
            <path d="M12 166C50 120 96 70 150 8" fill="none" stroke="#DCD8F2" strokeWidth="1.4" strokeLinecap="round" />
            {leaves.map(([x, y, r], i) => (
                <path key={i} d="M0 0c9-9 24-10 34-2-9 9-24 11-34 2z" transform={`translate(${x} ${y}) rotate(${r})`} fill="#ECEAF8" stroke="#DCD8F2" strokeWidth="1" />
            ))}
        </svg>
    );
}

// ─── content ─────────────────────────────────────────────────────────────────

const EXPERIENCES: { title: string; body: string; href: string; icon: ReactNode }[] = [
    {
        title: "General AI",
        body: "Ask anything, explore ideas, solve problems, and have natural conversations with AI.",
        href: "#threads",
        icon: (
            <>
                <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />
                <path d="M8 10h8M8 13h5" />
            </>
        ),
    },
    {
        title: "AI Characters",
        body: "Create unique AI characters with their own personalities, stories, memories, and ways of speaking.",
        href: "#characters",
        icon: (
            <>
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
            </>
        ),
    },
    {
        title: "AI Groups",
        body: "Bring multiple AI characters together and let them interact in the same conversation.",
        href: "#groups",
        icon: (
            <>
                <circle cx="8" cy="9" r="2.8" />
                <circle cx="16.5" cy="9" r="2.8" />
                <path d="M2.8 19c.6-2.8 2.6-4.3 5.2-4.3s4.6 1.5 5.2 4.3M13.8 15.1c.8-.3 1.7-.4 2.7-.4 2.6 0 4.6 1.5 5.2 4.3" />
            </>
        ),
    },
    {
        title: "AI Journals",
        body: "Write freely, reflect with AI, and keep meaningful thoughts organized in private journal threads.",
        href: "#journals",
        icon: (
            <>
                <path d="M6 4.5h10.5a2 2 0 0 1 2 2V20H8a2 2 0 0 1-2-2z" />
                <path d="M9.5 9h6M9.5 12.5h4.5" />
            </>
        ),
    },
    {
        title: "AI Images",
        body: "Turn ideas, conversations, characters, and stories into AI-generated images.",
        href: "#images",
        icon: (
            <>
                <rect x="3.5" y="5" width="17" height="14" rx="2" />
                <circle cx="9" cy="10" r="1.6" />
                <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
            </>
        ),
    },
];




/* Every line here is one PRIVACY.md §9 says the product can support today. */
const PRIVACY_POINTS: { title: string; body: string; icon: ReactNode }[] = [
    {
        title: "Private conversations",
        body: "Your chats and journal aren’t public or shared with other people.",
        icon: (
            <>
                <rect x="5" y="10.5" width="14" height="10" rx="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />
            </>
        ),
    },
    {
        title: "User-controlled content",
        body: "Characters remember only what you share. Delete the message and the memory goes.",
        icon: (
            <>
                <circle cx="12" cy="8" r="3.6" fill="currentColor" />
                <path d="M4.5 20.5c.8-4.2 3.8-6.5 7.5-6.5s6.7 2.3 7.5 6.5z" fill="currentColor" />
            </>
        ),
    },
    {
        title: "Secure sign-in",
        body: "Passwords are stored hashed, and changing yours signs out every other session.",
        icon: (
            <>
                <path d="M12 3.5l7 2.8v5.2c0 4.6-3 8-7 9.3-4-1.3-7-4.7-7-9.3V6.3z" />
                <path d="M9 12l2.2 2.2L15.5 10" />
            </>
        ),
    },
    {
        title: "Protected API keys",
        body: "AI service keys stay on our servers - never in your browser.",
        icon: (
            <>
                <circle cx="7.5" cy="12" r="3.5" />
                <path d="M11 12h9.5M17 12v2.5M20.5 12v2" />
            </>
        ),
    },
    {
        title: "Private files",
        body: "Photos you share open only for you, through links that expire within hours.",
        icon: (
            <>
                <ellipse cx="12" cy="6" rx="7" ry="2.5" />
                <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 10c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5M5 14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
            </>
        ),
    },
    {
        title: "No ads, no trackers",
        body: "No advertising, analytics or tracking scripts. Nothing you write is sold.",
        icon: (
            <>
                <circle cx="12" cy="12" r="8" />
                <path d="M6.5 6.5l11 11" />
            </>
        ),
    },
];

const FAQ: { q: string; a: ReactNode }[] = [
    {
        q: "What is Privateaile?",
        a: "A private AI platform. You can chat with a general AI, create your own AI characters, bring several of them together in group conversations, keep an AI-assisted journal and generate images - with every conversation kept in its own thread.",
    },
    {
        q: "What can I use Privateaile for?",
        a: "Thinking something through, drafting a hard message, planning, learning, journaling, writing stories and roleplay with characters you invent, or turning an idea into a picture. You can also attach photos and PDFs to a chat, and talk by voice where your plan includes it.",
    },
    {
        q: "What are AI Characters?",
        a: "Fictional personalities you create. Each has its own background, personality and way of speaking, and remembers what you’ve shared with it - you can see those memories and remove any of them. Characters are always fiction; they never pretend to be real people.",
    },
    {
        q: "Can I create my own AI character?",
        a: "Yes. Use the quick builder for a few lines about who they are, or the deep builder to add a longer backstory and source files. The free plan includes one active character; paid plans include more.",
    },
    {
        q: "Can multiple AI characters chat together?",
        a: "Yes - in group rooms, on paid plans. Each character keeps its own personality, the room decides who answers next, and you can step in, set the scene, or add and swap characters at any time.",
    },
    {
        q: "What are AI Threads?",
        a: "Every conversation lives in its own thread - a general chat, a character, a group room or a journal thread - and all of them sit in one sidebar you can search. Pictures you create stay inside the thread they were made in, right where the conversation continues.",
    },
    {
        q: "Can I generate images?",
        a: "Yes. Ask for a picture in any chat, or turn on imagine. The free plan includes a few to try; paid plans include a monthly allowance with HD options, and credits cover anything beyond it. Editing from your own photo is coming soon.",
    },
    {
        q: "Can AI help with my journal?",
        a: "Yes, when you ask. Write as much or as little as you like and request a reflection on any entry - nothing is sent for a reflection unless you ask for one. If you write about someone you’ve lost, it helps you remember them; it will never speak as them.",
    },
    {
        q: "How do credits work?",
        a: "Credits pay for extras: premium replies past your daily allowance, images beyond your plan and HD images. Credits you buy never expire. Paid plans also include monthly credits, which are used first and reset each billing period unless your plan rolls them over.",
    },
    {
        q: "Is my content private?",
        a: (
            <>
                Your conversations aren’t public and aren’t shared with other people, and nothing you write is sold or used
                for advertising. To be plain about the rest: they are stored on our servers (not end-to-end encrypted), each
                reply is written by an AI provider that receives the conversation, and pictures are made by a separate image
                service. General chat itself is kept in your browser, not on our servers. The{" "}
                <Link to="/legal#privacy" className="underline underline-offset-2 hover:text-ink">
                    privacy policy
                </Link>{" "}
                explains exactly what leaves and for how long.
            </>
        ),
    },
    {
        q: "Can I use Privateaile on mobile?",
        a: "Yes. Privateaile works in the browser on your phone, tablet or computer - there’s nothing to install - and your threads are there wherever you sign in.",
    },
    {
        q: "Monthly or yearly - can I switch or cancel?",
        a: "Either. Yearly costs less than twelve months. You can change plan or cancel from settings → billing; if you cancel, you keep what you paid for until the period ends, then move to Free. Nothing is deleted.",
    },
    {
        q: "How does the free trial work?",
        a: "The trial is optional and once per account. You add a card or UPI to set it up, ₹0 is charged today, and you can cancel any time before it renews - you’ll get a reminder first.",
    },
    {
        q: "Do you store my conversations?",
        a: "Not unless you turn on Sync. By default your chats stay in your browser. With Sync on, they're stored encrypted so you can use them on another device, and you can delete them at any time.",
    },
    {
        q: "Is my data used to train AI?",
        a: "No. Your messages are sent to an AI provider to generate a reply and are not retained. We don't train on them and neither do our providers.",
    },
    {
        q: "Who can use Private Aile?",
        a: "Adults aged 18 and over. We verify age at signup. Some creative features are available only after verification.",
    },
    {
        q: "Which AI models do you use?",
        a: "Fast open-weight models by default, with larger models for premium replies. Claude, GPT and Gemini are available in general chat using credits. You can choose the model yourself on any paid plan.",
    },
    {
        q: "How do payments and refunds work?",
        a: (
            <>
                Subscriptions are billed monthly or yearly through Razorpay by card, UPI, or net banking. Cancel any time and
                keep access until the end of your period. Full refund within 7 days of your first purchase if you've barely
                used it. Details in our{" "}
                <Link to="/legal#refunds" className="underline underline-offset-2 hover:text-ink">
                    refund policy
                </Link>
                .
            </>
        ),
    },
    {
        q: "Who operates Private Aile?",
        a: (
            <>
                Private Aile is a product of SHVANA Robotics Private Limited, an Indian company. Contact us at{" "}
                <a href="mailto:care@privateaile.com" className="underline underline-offset-2 hover:text-ink">
                    care@privateaile.com
                </a>
                .
            </>
        ),
    },
];

// ─── FAQ list ────────────────────────────────────────────────────────────────

/** How many questions show before "More". */
const FAQ_INITIAL = 5;

/* The first few questions, then a "More" button that reveals the rest (and
   becomes "Show less"). On "More", focus moves to the first newly shown
   question so keyboard and screen-reader users land on what just appeared. */
function FaqList() {
    const [showAll, setShowAll] = useState(false);
    const firstNew = useRef<HTMLElement>(null);
    const justOpened = useRef(false);
    const hidden = FAQ.length - FAQ_INITIAL;
    const items = showAll ? FAQ : FAQ.slice(0, FAQ_INITIAL);

    useEffect(() => {
        if (showAll && justOpened.current) {
            justOpened.current = false;
            firstNew.current?.focus();
        }
    }, [showAll]);

    return (
        <div className="lp-card rounded-[1.4rem] px-2 sm:px-3 py-2">
            <div id="faq-list">
                {items.map((f, i) => (
                    <details key={f.q} className={"landing-faq group px-3 sm:px-4 " + (i > 0 ? "border-t border-hairline/80" : "")}>
                        <summary
                            ref={i === FAQ_INITIAL ? firstNew : undefined}
                            className="list-none cursor-pointer flex items-center justify-between gap-4 py-4 text-ink text-[1rem] sm:text-[1.03rem] leading-snug"
                        >
                            <h3 className="font-normal">{f.q}</h3>
                            <span
                                className="landing-faq-mark shrink-0 h-7 w-7 rounded-full bg-lavender text-rust flex items-center justify-center transition-transform duration-200"
                                aria-hidden="true"
                            >
                                <Icon className="h-3.5 w-3.5">
                                    <path d="M12 5v14M5 12h14" />
                                </Icon>
                            </span>
                        </summary>
                        <p className="text-ink-soft text-[0.95rem] leading-[1.7] pb-5 pr-2 sm:pr-10 text-pretty">{f.a}</p>
                    </details>
                ))}
            </div>
            {hidden > 0 && (
                <div className="border-t border-hairline/80 px-3 sm:px-4 pt-3 pb-2 flex justify-center">
                    <button
                        type="button"
                        aria-expanded={showAll}
                        aria-controls="faq-list"
                        onClick={() => {
                            justOpened.current = !showAll;
                            setShowAll((v) => !v);
                        }}
                        className="lp-btn-outline cursor-pointer rounded-full min-h-[2.6rem] px-5 inline-flex items-center gap-2 text-[0.92rem] active:scale-[0.98]"
                    >
                        {showAll ? "Show less" : `More (${hidden})`}
                        <Icon className={"h-4 w-4 transition-transform duration-200 " + (showAll ? "rotate-180" : "")}>
                            <path d="M6 9l6 6 6-6" />
                        </Icon>
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── page ────────────────────────────────────────────────────────────────────

function LandingPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const catalogue = useAppSelector((s) => s.billing.catalogue);
    const [catState, setCatState] = useState<CatalogueState>("loading");

    useReveal();

    // The catalogue is public and cached in the billing slice, so PlansPage
    // won't fetch it again after sign-up. State only changes in the promise
    // callbacks - never synchronously inside the effect.
    const runFetch = useCallback(() => {
        dispatch(loadCatalogue())
            .unwrap()
            .then(() => setCatState("ready"))
            .catch(() => setCatState("error"));
    }, [dispatch]);

    const retryCatalogue = useCallback(() => {
        setCatState("loading");
        runFetch();
    }, [runFetch]);

    useEffect(() => {
        if (!catalogue) runFetch();
        // Once, on arrival. A later sign-out doesn't clear the catalogue.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const catalogueState: CatalogueState = catalogue ? "ready" : catState;

    // Arriving from another page at "/#pricing" etc: a single-page app doesn't
    // scroll to the hash by itself, and the plans load after first paint and
    // push later sections down - so scroll once now and again when they land.
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (!id) return;
        const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 60);
        return () => window.clearTimeout(t);
    }, [catalogueState]);

    // Every "create" button needs an account first; the auth pages don't
    // return you anywhere afterwards, so sign-up is the honest destination.
    const start = () => navigate("/signup");
    const toSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

    return (
        <div
            className="lp relative min-h-dvh w-full overflow-x-clip app-gradient text-ink flex flex-col"
            style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
        >
            <style>{`
        @keyframes ember-in-kf { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        .ember-in { animation: ember-in-kf .7s cubic-bezier(.22,1,.36,1) both; }
        html { scroll-behavior: smooth; }
        .landing-anchor { scroll-margin-top: 5rem; }
        .landing-faq summary::-webkit-details-marker { display: none; }
        .landing-faq[open] .landing-faq-mark { transform: rotate(45deg); }
        @media (prefers-reduced-motion: reduce) {
          .ember-in { animation: none !important }
          html { scroll-behavior: auto; }
        }
      `}</style>

            <SiteHeader onLanding />

            {/* ── hero ────────────────────────────────────────────── */}
            <section id="top" aria-labelledby="hero-title" className="lp-hero relative w-full overflow-hidden">
                <HeroCurves className="pointer-events-none absolute inset-0 h-full w-full" />
                <div className="relative mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8 pt-[clamp(2.75rem,10vw,4rem)] lg:pt-12 pb-[clamp(3.5rem,9vw,6rem)] grid lg:grid-cols-[1fr_1.08fr] gap-14 lg:gap-10 items-center">
                    <div className="relative z-10">
                        <p className="ember-in lp-label flex items-center gap-3">
                            Your private AI platform <span className="h-px w-6 bg-muted/50" aria-hidden="true" />
                        </p>
                        <h1
                            id="hero-title"
                            className="ember-in lp-serif text-ink font-semibold text-[clamp(2.05rem,9.3vw,2.6rem)] sm:text-[2.9rem] lg:text-[3.2rem] xl:text-[3.5rem] leading-[1.07] tracking-[-0.02em] mt-5 text-balance"
                            style={{ animationDelay: "60ms" }}
                        >
                            Your private space to chat, create, remember, and imagine.
                        </h1>
                        <p
                            className="ember-in text-ink-soft text-[1.02rem] sm:text-[1.12rem] leading-[1.7] mt-5 max-w-[34rem] text-pretty"
                            style={{ animationDelay: "120ms" }}
                        >
                            Talk with AI characters, create your own characters and groups, explore ideas with General AI, keep
                            AI-powered journals, and turn your imagination into images  all in one private space.
                        </p>
                        <div className="ember-in mt-8 flex flex-col min-[420px]:flex-row gap-3" style={{ animationDelay: "180ms" }}>
                            <ArrowButton onClick={start}>Start Chatting</ArrowButton>
                            <a
                                href="#characters"
                                className="lp-btn-outline rounded-full min-h-[2.9rem] px-6 text-[0.97rem] inline-flex items-center justify-center whitespace-nowrap"
                            >
                                Explore Characters
                            </a>
                        </div>
                        <ul
                            className="ember-in mt-9 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted text-[0.86rem]"
                            style={{ animationDelay: "240ms" }}
                            aria-label="At a glance"
                        >
                            <li className="flex items-center gap-2">
                                <Icon className="h-4 w-4">
                                    <rect x="5" y="10.5" width="14" height="10" rx="2" />
                                    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                                </Icon>
                                Private by design
                            </li>
                            <li className="hidden sm:block h-4 w-px bg-hairline" aria-hidden="true" />
                            <li>No ads or trackers</li>
                            <li className="hidden sm:block h-4 w-px bg-hairline" aria-hidden="true" />
                            <li className="flex items-center gap-2">
                                <Icon className="h-4 w-4">
                                    <circle cx="12" cy="8" r="3.5" />
                                    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
                                </Icon>
                                Adults only
                            </li>
                        </ul>
                    </div>

                    <div className="relative lp-book px-4 sm:px-10 lg:px-0">
                        <div className="lp-glow h-[70%] w-[70%] left-[15%] top-[15%]" aria-hidden="true" />
                        <HeroAppMockup />
                    </div>
                </div>
            </section>

            <main className="relative flex-1 flex flex-col items-center w-full px-4 sm:px-6 lg:px-8">
                {/* ── AI experiences ──────────────────────────────── */}
                <section id="features" aria-labelledby="features-title" className="landing-anchor w-full max-w-[1180px] pt-[clamp(3.5rem,9vw,5.5rem)]">
                    <SectionHead
                        center
                        id="features-title"
                        eyebrow="AI experiences"
                        title="Everything you need in one AI space."
                        body="Different ways to think, talk, create, and remember  connected through AI."
                    />
                    <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                        {EXPERIENCES.map((x, i) => (
                            <li key={x.title} className={"lp-reveal " + (i === 4 ? "sm:col-span-2 lg:col-span-1" : "")} style={{ transitionDelay: `${i * 70}ms` }}>
                                <a
                                    href={x.href}
                                    className="lp-lift group lp-card h-full rounded-[1.25rem] px-5 py-5 lg:py-6 flex lg:flex-col gap-4 lg:gap-0"
                                >
                                    <span className="h-11 w-11 shrink-0 rounded-full bg-lavender text-rust flex items-center justify-center transition-colors group-hover:bg-rust group-hover:text-cream-soft">
                                        <Icon>{x.icon}</Icon>
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="lp-serif text-ink font-medium text-[1.25rem] leading-tight lg:mt-4">{x.title}</h3>
                                        <p className="text-ink-soft text-[0.9rem] leading-[1.6] mt-1.5">{x.body}</p>
                                    </div>
                                </a>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* ── feature panels ──────────────────────────────── */}
                {/* Two rows, as the reference: characters + groups, then
                   threads + images + journal. Each panel carries its own
                   soft tint; text sits left, the product picture right. */}
                <div className="w-full max-w-[1180px] pt-[clamp(3.5rem,9vw,5.5rem)] grid xl:grid-cols-[1.06fr_1fr] gap-4">
                    <section id="characters" aria-labelledby="characters-title" className="landing-anchor lp-reveal lp-feature lp-tint-rose rounded-[1.5rem] p-6 sm:p-8 grid md:grid-cols-[1fr_1.15fr] gap-8 md:gap-5 items-center">
                        <FeatureText
                            id="characters-title"
                            eyebrow="Single character AI"
                            title="Create someone uniquely yours."
                            body="Build an AI character with its own personality, background, memories, speaking style, and behavior."
                            cta="Create a Character"
                            onCta={start}
                        />
                        <CharacterMockup />
                    </section>

                    <section id="groups" aria-labelledby="groups-title" className="landing-anchor lp-reveal lp-feature lp-tint-sky rounded-[1.5rem] p-6 sm:p-8 grid md:grid-cols-[1.1fr_1fr] gap-8 md:gap-5 items-center">
                        <FeatureText
                            id="groups-title"
                            eyebrow="Group character AI"
                            title="Bring your characters together."
                            body="Create a group conversation where multiple AI characters can interact, respond, and develop their own dynamic - each keeping its own personality in the same thread."
                            cta="Create a Group"
                            onCta={start}
                        />
                        <GroupMockup />
                    </section>
                </div>

                <div className="w-full max-w-[1180px] pt-4 grid md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr] gap-4">
                    <section id="threads" aria-labelledby="threads-title" className="landing-anchor lp-reveal lp-feature lp-tint-mist md:col-span-2 xl:col-span-1 rounded-[1.5rem] p-6 sm:p-7 grid sm:grid-cols-[1.1fr_1fr] gap-7 sm:gap-4 items-center">
                        <FeatureText
                            compact
                            id="threads-title"
                            eyebrow="AI threads"
                            title="Every conversation has a place."
                            body="Keep your AI conversations organized in threads  whether you’re talking with a character, exploring an idea, writing a journal, or creating images."
                            cta="Explore Threads"
                            onCta={start}
                        />
                        <ThreadsMockup />
                    </section>

                    <section id="images" aria-labelledby="images-title" className="landing-anchor lp-reveal lp-feature lp-tint-lilac rounded-[1.5rem] p-6 sm:p-7 flex flex-col">
                        <FeatureText
                            compact
                            id="images-title"
                            eyebrow="AI image generation"
                            title="Imagine it. Then see it."
                            body="Turn your ideas, stories, and AI conversations into images."
                        />
                        <div className="mt-5">
                            <FeatureButton onClick={start}>Create an Image</FeatureButton>
                        </div>
                        <div className="mt-5">
                            <ImageMockup />
                        </div>
                    </section>

                    <section id="journals" aria-labelledby="journals-title" className="landing-anchor lp-reveal lp-feature lp-tint-mint rounded-[1.5rem] p-6 sm:p-7 grid grid-cols-[1.4fr_1fr] gap-1 items-center overflow-hidden">
                        <FeatureText
                            compact
                            id="journals-title"
                            eyebrow="AI journal"
                            title="A journal that talks back."
                            body="Write freely, reflect with AI, and revisit the thoughts that matter."
                            cta="Start a Journal"
                            onCta={start}
                        />
                        <div className="relative self-stretch flex flex-col items-center justify-center" aria-hidden="true">
                            <img src={journalBook} alt="" className="lp-book lp-fade-edges w-[112%] max-w-[15rem] h-auto -mr-2" />
                            <span className="lp-script text-rust-light text-[0.72rem] -rotate-[4deg] mt-1 whitespace-nowrap">only when you ask</span>
                        </div>
                    </section>
                </div>

                {/* ── privacy ─────────────────────────────────────── */}
                {/* As the reference: one pale lavender band - a large half-filled
                   shield, the heading block, a faint sprig, then the points in
                   columns split by hairlines. */}
                <section
                    id="privacy"
                    aria-labelledby="privacy-title"
                    className="landing-anchor lp-reveal lp-privacy relative overflow-hidden w-full max-w-[1180px] mt-4 rounded-[1.5rem] px-6 sm:px-8 py-7 sm:py-8"
                >
                    <PrivacySprig />
                    <div className="relative grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2fr)] gap-8 lg:gap-6 items-center">
                        <div className="flex items-start gap-5">
                            <ShieldMark />
                            <div className="min-w-0">
                                <p className="flex items-center gap-2.5 text-muted text-[0.68rem] tracking-[0.14em] uppercase">
                                    Your privacy matters <span className="h-px w-5 bg-muted/40" aria-hidden="true" />
                                </p>
                                <h2 id="privacy-title" className="lp-serif text-ink font-semibold text-[clamp(1.7rem,5vw,2.05rem)] leading-[1.1] tracking-[-0.015em] mt-2">
                                    Private by design.
                                </h2>
                                <p className="text-ink-soft text-[0.9rem] leading-[1.6] mt-2.5">
                                    Your conversations, memories and data are yours. We build Privateaile with privacy and security at the core.
                                </p>
                            </div>
                        </div>

                        <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-y-6">
                            {PRIVACY_POINTS.map((p) => (
                                <li key={p.title} className="lp-privacy-item px-3 sm:px-4">
                                    <span className="block text-rust">
                                        <Icon className="h-7 w-7">{p.icon}</Icon>
                                    </span>
                                    <h3 className="text-ink text-[0.78rem] font-medium leading-[1.3] mt-2.5">{p.title}</h3>
                                    <p className="text-muted text-[0.72rem] leading-[1.5] mt-1.5">{p.body}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <p className="relative mt-6 lg:mt-5 lg:pl-[calc(32%+1.5rem)] text-muted text-[0.74rem] leading-[1.55]">
                        To write a reply, your conversation is sent to the AI provider that generates it, and picture descriptions go to an
                        image service. Privateaile doesn’t train AI on your writing.{" "}
                        <Link to="/legal#privacy" className="text-ink-soft underline underline-offset-2 hover:text-ink">
                            Read exactly what leaves →
                        </Link>
                    </p>
                </section>

                {/* ── pricing ─────────────────────────────────────── */}
                <section id="pricing" aria-labelledby="pricing-title" className="landing-anchor lp-reveal w-full max-w-[1180px] pt-[clamp(4rem,10vw,6.5rem)]">
                    <SectionHead
                        center
                        id="pricing-title"
                        eyebrow="Pricing"
                        title="Choose the plan that fits your journey."
                        body="Every plan includes General AI, characters, the journal and image generation. More chats, more characters, more creativity as you go."
                    />
                    <PricingSection catalogue={catalogue} state={catalogueState} onRetry={retryCatalogue} />
                </section>

                {/* ── credits ─────────────────────────────────────── */}
                <section id="credits" aria-labelledby="credits-title" className="landing-anchor lp-reveal w-full max-w-[1180px] pt-[clamp(3.5rem,9vw,5.5rem)]">
                    <SectionHead
                        center
                        id="credits-title"
                        eyebrow="Credits"
                        title="Top up only when you need to."
                        body="Credits cover the extras - a premium reply, an HD image, one more picture. Paid plans include some every month; packs you buy never run out."
                    />
                    <CreditsSection catalogue={catalogue} state={catalogueState} onRetry={retryCatalogue} />
                </section>

                {/* ── FAQ ─────────────────────────────────────────── */}
                <section id="faq" aria-labelledby="faq-title" className="landing-anchor lp-reveal w-full max-w-[1180px] pt-[clamp(4rem,10vw,6.5rem)] pb-[clamp(3.5rem,9vw,6rem)] grid lg:grid-cols-[0.8fr_1.5fr] gap-8 lg:gap-14 items-start">
                    <div className="lg:sticky lg:top-24">
                        <SectionHead id="faq-title" eyebrow="FAQ" title="Got questions? We’ve got answers." />
                        <p className="text-ink-soft text-[0.95rem] leading-[1.7] mt-4">
                            Can’t find what you need?{" "}
                            <Link to="/contact" className="text-ink underline underline-offset-2">
                                Write to us
                            </Link>{" "}
                            - a real person reads every message.
                        </p>
                    </div>
                    <FaqList />
                </section>
            </main>

            {/* ── final CTA ─────────────────────────────────────────── */}
            {/* As the reference: a compact flat navy band, one-line serif
               heading, small pill buttons, a pen-loop on the left and a leaf
               sprig on the right. */}
            <section aria-labelledby="cta-title" className="lp-reveal lp-cta-band relative w-full overflow-hidden px-5 sm:px-6 lg:px-8 py-[clamp(2.5rem,6vw,3.25rem)] text-center text-white">
                <svg viewBox="0 0 180 60" className="pointer-events-none absolute left-[17%] top-[46%] w-[11rem] hidden xl:block opacity-70" aria-hidden="true">
                    <path d="M4 44c24 12 58 10 76-6 9-8 4-20-5-16-9 5-4 18 8 17 22-1 48-18 92-26" fill="none" stroke="#C9CCE4" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <svg viewBox="0 0 180 90" className="pointer-events-none absolute right-[18%] top-[30%] w-[11rem] hidden xl:block opacity-70" aria-hidden="true">
                    <g fill="none" stroke="#C9CCE4" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 34c18 6 34 6 46-2" />
                        <path d="M48 32c12-10 22-6 20 4-2 12-16 12-18 2-2-10 10-18 22-14 20 8 30 40 104 54" />
                        <path d="M58 22C50 12 50 4 56 0c6 6 6 14 2 22z" />
                        <path d="M62 24c4-10 12-14 20-12-2 8-10 12-20 12z" />
                    </g>
                </svg>
                <div className="relative mx-auto max-w-[44rem]">
                    <h2 id="cta-title" className="lp-serif font-semibold text-[clamp(1.75rem,5.4vw,2.35rem)] leading-[1.1] tracking-[-0.015em] text-balance">
                        Create your private AI space.
                    </h2>
                    <p className="text-[0.95rem] mt-1.5 text-white/85">Chat. Create. Remember. Imagine.</p>
                    <div className="mt-6 mx-auto flex w-full max-w-[18rem] sm:max-w-none flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
                        <button
                            type="button"
                            onClick={start}
                            className="group cursor-pointer rounded-full bg-white text-ink min-h-[2.55rem] px-6 text-[0.88rem] inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_8px_20px_-12px_rgba(0,0,0,0.6)] hover:bg-[#F4F2F9] active:scale-[0.98] transition"
                        >
                            Start Chatting <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => toSection("characters")}
                            className="cursor-pointer rounded-full border border-white/55 text-white min-h-[2.55rem] px-6 text-[0.88rem] inline-flex items-center justify-center whitespace-nowrap hover:bg-white/10 transition"
                        >
                            Explore Characters
                        </button>
                    </div>
                </div>
            </section>

            <SiteFooter onLanding />
        </div>
    );
}

export default LandingPage;
