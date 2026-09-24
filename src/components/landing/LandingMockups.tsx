import type { ReactNode } from "react";
import { BrandMark, HandwrittenWords, PencilArrow, Spark } from "./LandingHero";
import mayaPortrait from "../../assets/landing/maya.webp";
import generatedFuji from "../../assets/landing/generated-fuji.webp";
import mayaCard from "../../assets/landing/maya-card.webp";
import explorer from "../../assets/landing/explorer.webp";
import ex1 from "../../assets/landing/explorer-1.webp";
import ex2 from "../../assets/landing/explorer-2.webp";
import ex3 from "../../assets/landing/explorer-3.webp";
import avYou from "../../assets/landing/av-you.webp";
import avMaya from "../../assets/landing/av-maya.webp";
import avAlex from "../../assets/landing/av-alex.webp";
import avArjun from "../../assets/landing/av-arjun.webp";

import { Typed } from "./motion";

/* Product mockups for the landing page: small, static pictures of real
   screens (general chat, a character, a group room, the sidebar of threads,
   image generation). They use the app's own bubble classes so they follow the
   theme tokens, and each one is aria-hidden - the section copy beside it is
   what a screen reader should hear. Replies "type" in via <Typed>. */


function Icon({ children, className = "h-4 w-4" }: { children: ReactNode; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    );
}

const ICONS = {
    chat: (
        <>
            <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />
            <path d="M8 10h8M8 13h5" />
        </>
    ),
    character: (
        <>
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
        </>
    ),
    group: (
        <>
            <circle cx="8" cy="9" r="2.8" />
            <circle cx="16.5" cy="9" r="2.8" />
            <path d="M2.8 19c.6-2.8 2.6-4.3 5.2-4.3s4.6 1.5 5.2 4.3" />
            <path d="M13.8 15.1c.8-.3 1.7-.4 2.7-.4 2.6 0 4.6 1.5 5.2 4.3" />
        </>
    ),
    journal: (
        <>
            <path d="M6 4.5h10.5a2 2 0 0 1 2 2V20H8a2 2 0 0 1-2-2z" />
            <path d="M9.5 9h6M9.5 12.5h4.5" />
        </>
    ),
    image: (
        <>
            <rect x="3.5" y="5" width="17" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.6" />
            <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.5-4.5" />
        </>
    ),
    send: <path d="M5 12h13M13 6l6 6-6 6" />,
};


function You({ children, time }: { children: ReactNode; time?: string }) {
    return (
        <div className="flex flex-col items-end">
            <p className="chat-bubble-you max-w-[82%] rounded-[1.05rem] rounded-br-md px-3.5 py-2 text-[0.84rem] leading-[1.5]">{children}</p>
            {time && <p className="text-muted/80 text-[0.66rem] mt-1 mr-1">{time}</p>}
        </div>
    );
}


// ─── hero: the app, with a character chat open ───────────────────────────────
// Laid out to match the reference mock: portrait overlapping the window's
// left edge, a six-item sidebar, a chat with Maya, the generated photo pinned
// to the top-right corner with its label beneath, lavender sprigs behind, and
// "Chat / Create / Remember / Imagine" pencilled beside it.

const SIDEBAR: { label: string; icon: ReactNode; active?: boolean }[] = [
    { label: "General", icon: ICONS.chat, active: true },
    { label: "Characters", icon: ICONS.character },
    { label: "Groups", icon: ICONS.group },
    { label: "Journals", icon: ICONS.journal },
    { label: "Images", icon: ICONS.image },
    {
        label: "Threads",
        icon: (
            <>
                <rect x="4" y="4.5" width="16" height="15" rx="3" />
                <path d="M8 9.5h8M8 13h5" />
            </>
        ),
    },
];

/** A lavender leaf sprig, drawn in the reference's soft line-and-fill style. */
function Sprig({ className = "", flip = false }: { className?: string; flip?: boolean }) {
    const leaves = [
        [18, 70, -38], [30, 58, 32], [34, 44, -40], [46, 34, 28], [48, 20, -44], [60, 12, 20],
    ];
    return (
        <svg viewBox="0 0 90 100" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden="true">
            <path d="M8 96C24 74 38 50 62 6" fill="none" stroke="#B9B2E3" strokeWidth="1.6" strokeLinecap="round" />
            {leaves.map(([x, y, r], i) => (
                <path
                    key={i}
                    d="M0 0c7-7 18-8 26-2-7 7-18 9-26 2z"
                    transform={`translate(${x} ${y}) rotate(${r})`}
                    fill="#D9D4F3"
                    stroke="#B9B2E3"
                    strokeWidth="1.1"
                    opacity={0.95}
                />
            ))}
        </svg>
    );
}

function Avatar({ className = "h-7 w-7" }: { className?: string }) {
    return <img src={mayaPortrait} alt="" className={"rounded-full object-cover shrink-0 " + className} />;
}

function HeroThem({ children, time }: { children: ReactNode; time: string }) {
    return (
        <div className="flex items-start gap-2.5">
            <Avatar className="h-8 w-8 mt-0.5" />
            <div className="max-w-[78%] min-w-0">
                <div className="rounded-[1rem] rounded-tl-md bg-[#EEEDF6] px-3.5 py-2.5 text-[0.84rem] leading-[1.5] text-ink">{children}</div>
                <p className="text-muted/80 text-[0.66rem] mt-1 ml-1">{time}</p>
            </div>
        </div>
    );
}

export function HeroAppMockup() {
    return (
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[38rem] select-none pt-10 sm:pt-12">
            {/* soft sprigs behind the window */}
            <Sprig className="hidden sm:block absolute -left-16 bottom-2 w-24 z-10" />
            <Sprig className="hidden sm:block absolute -right-12 bottom-0 w-24 z-10" flip />

            {/* the portrait, overlapping the window's left edge */}
            <div className="hidden sm:block absolute -left-[4.5rem] lg:-left-[5rem] top-[24%] z-30 lp-float" style={{ ["--r" as string]: "0deg" }}>
                <img
                    src={mayaPortrait}
                    alt=""
                    className="h-24 w-24 lg:h-28 lg:w-28 rounded-full object-cover ring-[5px] ring-[var(--color-cream-light)] shadow-[0_22px_44px_-18px_rgba(22,34,74,0.5)]"
                />
            </div>

            {/* the picture it made, pinned to the top-right corner */}
            <div
                className="absolute -right-1 sm:-right-10 lg:-right-14 top-0 z-30 w-[9.5rem] sm:w-[13rem] lp-float"
                style={{ ["--r" as string]: "4deg", animationDelay: "1.4s" }}
            >
                <div className="lp-card rounded-[0.9rem] p-1 shadow-[0_24px_44px_-22px_rgba(22,34,74,0.55)]">
                    <img src={generatedFuji} alt="" className="block w-full aspect-[520/272] rounded-[0.7rem] object-cover" />
                </div>
                <p className="-mt-3 ml-2 relative inline-flex items-center gap-2 rounded-[0.8rem] bg-cream-light px-3 py-2 text-[0.72rem] sm:text-[0.78rem] text-ink shadow-[0_10px_24px_-14px_rgba(22,34,74,0.5)] -rotate-[4deg]">
                    <span className="h-4 w-4 rounded-full border-[1.5px] border-rust text-rust flex items-center justify-center">
                        <Spark className="h-2.5 w-2.5" />
                    </span>
                    Generated with AI
                </p>
            </div>

            {/* the window */}
            <div className="relative z-20 lp-card rounded-[1.25rem] overflow-hidden shadow-[0_40px_80px_-40px_rgba(22,34,74,0.55)] grid sm:grid-cols-[10.5rem_1fr]">
                <div className="hidden sm:flex flex-col gap-1 border-r border-hairline bg-cream/50 p-3">
                    <p className="flex items-center gap-1.5 px-2 pb-4 pt-1.5">
                        <BrandMark className="h-5 w-[0.9rem]" />
                        <span className="lp-serif text-ink text-[1.02rem] font-medium">Privateaile</span>
                    </p>
                    {SIDEBAR.map((s) => (
                        <p
                            key={s.label}
                            className={
                                "relative flex items-center gap-2.5 rounded-[0.7rem] px-2.5 py-2 text-[0.82rem] " +
                                (s.active ? "bg-lavender text-ink" : "text-ink-soft")
                            }
                        >
                            <Icon className="h-4 w-4">{s.icon}</Icon>
                            {s.label}
                            {s.active && <span className="absolute -right-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-lavender-line" />}
                        </p>
                    ))}
                </div>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
                        <Avatar className="h-9 w-9" />
                        <div className="leading-tight">
                            <p className="text-ink text-[0.9rem]">Maya</p>
                            <p className="text-muted text-[0.72rem]">Online</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3 px-4 py-4">
                        <HeroThem time="10:24 AM">Hey! What are you thinking about today?</HeroThem>
                        <You time="10:25 AM">I’m planning a trip. Any suggestions?</You>
                        <HeroThem time="10:26 AM">
                            <Typed
                                delay={1300}
                                speed={30}
                                text="That sounds exciting! ✨ How about Japan? It’s beautiful this time of year."
                            />
                        </HeroThem>
                    </div>
                    <div className="mt-auto flex items-center gap-2 border-t border-hairline px-3.5 py-3">
                        <span className="flex-1 rounded-full border border-hairline bg-cream/60 px-4 py-2.5 text-[0.78rem] text-muted">Type a message…</span>
                        <span className="h-9 w-9 rounded-full bg-rust text-cream-soft flex items-center justify-center">
                            <Icon className="h-4 w-4">{ICONS.send}</Icon>
                        </span>
                    </div>
                </div>
            </div>

            <HandwrittenWords
                words={["Chat", "Create", "Remember", "Imagine"]}
                className="hidden min-[1440px]:block absolute left-full ml-3 top-[44%] text-[0.9rem] z-10 rotate-[-10deg]! whitespace-nowrap"
            />
        </div>
    );
}

// ─── one character ───────────────────────────────────────────────────────────
// As the reference: a rounded portrait photo overlapping the top-left of a
// name card (name + trait chips), with a chat card stacked beneath it.

function MiniName({ name, time }: { name: string; time: string }) {
    return (
        <p className="flex items-baseline gap-2 text-[0.74rem] leading-none">
            <span className="text-ink font-medium">{name}</span>
            <span className="text-muted/70 text-[0.62rem]">{time}</span>
        </p>
    );
}

export function CharacterMockup() {
    return (
        <div aria-hidden="true" className="relative w-full max-w-[21rem] mx-auto select-none pt-2">
            <PencilArrow className="hidden sm:block absolute -left-8 top-[62%] h-10 w-8 text-lavender-line -rotate-[70deg]" />
            {/* name card, with the portrait resting over its left edge */}
            <div className="relative ml-[4.2rem] lp-card rounded-[1rem] pl-[3.4rem] pr-3 py-3.5 min-h-[6.6rem] shadow-[0_18px_36px_-26px_rgba(22,34,74,0.5)]">
                <p className="lp-serif text-ink text-[1.35rem] leading-none">Maya</p>
                <div className="mt-2.5 flex flex-wrap gap-1">
                    {["Friendly", "Curious", "Creative"].map((t) => (
                        <span key={t} className="rounded-full bg-lavender px-2 py-0.5 text-[0.66rem] text-rust">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
            <img
                src={mayaCard}
                alt=""
                className="absolute left-0 top-0 z-10 w-[6.8rem] aspect-[290/345] rounded-[1.1rem] object-cover shadow-[0_18px_34px_-18px_rgba(22,34,74,0.55)]"
            />

            {/* the chat card beneath */}
            <div className="relative mt-3 ml-[4.4rem] lp-card rounded-[1rem] pl-5 pr-3.5 py-3.5 flex flex-col gap-3 shadow-[0_18px_36px_-26px_rgba(22,34,74,0.5)]">
                <div className="flex items-start gap-2">
                    <img src={avYou} alt="" className="h-7 w-7 rounded-full shrink-0 -ml-7 ring-2 ring-[var(--color-cream-light)] relative z-20" />
                    <div className="min-w-0">
                        <MiniName name="You" time="10:30 AM" />
                        <p className="mt-1.5 rounded-[0.75rem] border border-hairline bg-cream-light px-3 py-2 text-[0.76rem] text-ink-soft">
                            What are you thinking about today?
                        </p>
                    </div>
                </div>
                <div className="flex items-start gap-2">
                    <img src={avMaya} alt="" className="h-7 w-7 rounded-full shrink-0 -ml-7 ring-2 ring-[var(--color-cream-light)] relative z-20" />
                    <div className="min-w-0">
                        <MiniName name="Maya" time="10:31 AM" />
                        <p className="mt-1.5 rounded-[0.75rem] border border-hairline bg-cream-light px-3 py-2 text-[0.76rem] leading-[1.5] text-ink-soft">
                            <Typed text="Honestly? I was wondering where your imagination is taking you today. 😊" />
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── a group room ────────────────────────────────────────────────────────────
// As the reference: one card, a header strip of avatars, then each speaker's
// avatar, bold name and a soft grey bubble, timestamp bottom-right.

const ROOM: { av: string; name: string; line: string }[] = [
    { av: avYou, name: "You", line: "What should we do this weekend?" },
    { av: avMaya, name: "Maya", line: "Let’s find somewhere peaceful." },
    { av: avAlex, name: "Alex", line: "I vote for an adventure." },
    { av: avArjun, name: "Arjun", line: "I have another idea…" },
];

export function GroupMockup() {
    return (
        <div aria-hidden="true" className="relative w-full max-w-[22rem] mx-auto select-none">
            <div className="lp-card rounded-[1rem] overflow-hidden shadow-[0_18px_36px_-26px_rgba(22,34,74,0.5)]">
                <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
                    <span className="text-rust">
                        <Icon className="h-4 w-4">{ICONS.group}</Icon>
                    </span>
                    <div className="flex -space-x-1.5">
                        {[avMaya, avAlex, avArjun, avYou, avMaya, avArjun].map((a, i) => (
                            <img key={i} src={a} alt="" className="h-5 w-5 rounded-full ring-2 ring-[var(--color-cream-light)]" />
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-3 px-4 pt-3.5 pb-2">
                    {ROOM.map((m, i) => (
                        <div key={m.name} className="flex items-start gap-2.5">
                            <img src={m.av} alt="" className="h-8 w-8 rounded-full shrink-0" />
                            <div className="min-w-0">
                                <p className="text-ink text-[0.76rem] font-medium leading-none">{m.name}</p>
                                <p className="mt-1.5 inline-block rounded-[0.7rem] bg-[#F1F0F7] px-3 py-1.5 text-[0.76rem] text-ink-soft">
                                    {i === ROOM.length - 1 ? <Typed delay={1100} text={m.line} /> : m.line}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="px-4 pb-2.5 text-right text-muted/70 text-[0.62rem]">10:32 AM</p>
            </div>
        </div>
    );
}

// ─── threads ─────────────────────────────────────────────────────────────────
// As the reference: one card headed "Threads", five rows - tinted icon
// circle, title, grey subtitle, arrow on the right.

const THREAD_ROWS: { title: string; sub: string; icon?: ReactNode; av?: string; tone: string }[] = [
    { title: "General Chat", sub: "Ideas & Questions", icon: ICONS.chat, tone: "bg-[#EEEDF8] text-rust" },
    { title: "Maya", sub: "Chat with Maya", av: avMaya, tone: "" },
    { title: "Fantasy Group", sub: "Group Conversation", icon: ICONS.group, tone: "bg-[#F1E9FB] text-[#7A55C8]" },
    { title: "Journal", sub: "Personal Reflections", icon: ICONS.journal, tone: "bg-[#E6EEFB] text-[#3E6FC4]" },
    { title: "Image Creation", sub: "Generated Images", icon: ICONS.image, tone: "bg-[#E3EAFA] text-[#2F57C0]" },
];

export function ThreadsMockup() {
    return (
        <div aria-hidden="true" className="w-full max-w-[19rem] mx-auto select-none">
            <div className="lp-card rounded-[1rem] overflow-hidden shadow-[0_18px_36px_-26px_rgba(22,34,74,0.5)]">
                <p className="flex items-center gap-2 border-b border-hairline px-4 py-2.5 text-ink text-[0.8rem]">
                    <span className="text-rust">
                        <Icon className="h-4 w-4">{ICONS.chat}</Icon>
                    </span>
                    Threads
                </p>
                <div className="p-1.5">
                    {THREAD_ROWS.map((t) => (
                        <div key={t.title} className="flex items-center gap-3 rounded-[0.8rem] px-2.5 py-2">
                            {t.av ? (
                                <img src={t.av} alt="" className="h-9 w-9 rounded-full shrink-0" />
                            ) : (
                                <span className={"h-9 w-9 shrink-0 rounded-full flex items-center justify-center " + t.tone}>
                                    <Icon>{t.icon}</Icon>
                                </span>
                            )}
                            <span className="min-w-0 leading-tight">
                                <span className="block text-ink text-[0.8rem] truncate">{t.title}</span>
                                <span className="block text-muted text-[0.68rem] truncate">{t.sub}</span>
                            </span>
                            <span className="ml-auto text-rust">
                                <Icon className="h-4 w-4">
                                    <path d="M5 12h13M13 7l5 5-5 5" />
                                </Icon>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── image generation ────────────────────────────────────────────────────────
// As the reference: a large generated picture with the prompt card resting
// over its bottom-left corner, and a column of three variations beside it.

export function ImageMockup() {
    return (
        <div aria-hidden="true" className="relative w-[82%] max-w-[17rem] ml-auto select-none">
            <div className="flex items-start gap-2">
                <div className="lp-image-reveal relative flex-1 rounded-[1rem] overflow-hidden shadow-[0_24px_44px_-24px_rgba(22,34,74,0.6)] rotate-[-2deg]">
                    <img src={explorer} alt="" className="block w-full aspect-[336/436] object-cover" />
                </div>
                <div className="flex flex-col gap-2 w-[3.4rem] sm:w-[3.8rem] shrink-0">
                    {[ex1, ex2, ex3].map((src, i) => (
                        <img key={i} src={src} alt="" className="block w-full aspect-[92/110] object-cover rounded-[0.6rem] ring-2 ring-[var(--color-cream-light)] shadow-[0_10px_20px_-12px_rgba(22,34,74,0.6)]" />
                    ))}
                </div>
            </div>
            <p className="absolute left-[-22%] bottom-6 max-w-[11rem] lp-card rounded-[0.8rem] px-3.5 py-2.5 text-[0.72rem] leading-[1.5] text-ink-soft shadow-[0_16px_30px_-18px_rgba(22,34,74,0.55)]">
                Create a portrait of Maya as a futuristic explorer in Tokyo.
            </p>
        </div>
    );
}
