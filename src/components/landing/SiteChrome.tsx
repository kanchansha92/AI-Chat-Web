import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark } from "./LandingHero";

/* The signed-out site's header and footer, shared by the landing page,
   /about, /contact and /legal. Section links are plain hashes on the landing page ("#pricing") and
   become "/#pricing" everywhere else; the landing page scrolls to the hash
   once it has rendered. */

/* Characters, Groups, Images and Journals live under the Product dropdown,
   not in this list. */
type NavItem = { label: string; hash?: string; to?: string };

const NAV: NavItem[] = [
    { hash: "#features", label: "Features" },
    { hash: "#pricing", label: "Pricing" },
    // FAQ and Legal are kept out of the navbar (they're in the footer).
    // { hash: "#faq", label: "FAQ" },
    // { to: "/legal", label: "Legal" },
];

/** Not in the top bar (the brief keeps it to the product), but in the menu. */
const MENU_EXTRA: NavItem[] = [
    // { to: "/about", label: "About" },
    // Contact is kept out of the navbar (it's in the footer).
    // { to: "/contact", label: "Contact" },
];

function NavLink({
    item,
    onLanding,
    className,
    active,
    text,
}: {
    item: NavItem;
    onLanding: boolean;
    className: string;
    active?: boolean;
    /** Shown instead of item.label (the menu uses sentence case). */
    text?: string;
}) {
    const label = text ?? item.label;
    if (item.to) {
        return (
            <Link to={item.to} className={className} aria-current={active ? "page" : undefined}>
                {label}
            </Link>
        );
    }
    return onLanding ? (
        <a href={item.hash} className={className}>
            {label}
        </a>
    ) : (
        <Link to={`/${item.hash}`} className={className}>
            {label}
        </Link>
    );
}

/* ---------- Product dropdown ---------- */

const PRODUCTS: { label: string; body: string; hash: string; icon: ReactNode }[] = [
    {
        label: "General AI",
        body: "Ask anything and think out loud.",
        hash: "#threads",
        icon: (
            <>
                <path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7l-4 3v-3H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />
                <path d="M8 10h8M8 13h5" />
            </>
        ),
    },
    {
        label: "AI Characters",
        body: "Personalities with their own voice.",
        hash: "#characters",
        icon: (
            <>
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
            </>
        ),
    },
    {
        label: "AI Groups",
        body: "Several characters, one conversation.",
        hash: "#groups",
        icon: (
            <>
                <circle cx="8" cy="9" r="2.8" />
                <circle cx="16.5" cy="9" r="2.8" />
                <path d="M2.8 19c.6-2.8 2.6-4.3 5.2-4.3s4.6 1.5 5.2 4.3M13.8 15.1c.8-.3 1.7-.4 2.7-.4 2.6 0 4.6 1.5 5.2 4.3" />
            </>
        ),
    },
    {
        label: "AI Images",
        body: "Turn ideas and stories into pictures.",
        hash: "#images",
        icon: (
            <>
                <rect x="3.5" y="5" width="17" height="14" rx="2" />
                <circle cx="9" cy="10" r="1.6" />
                <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
            </>
        ),
    },
    {
        label: "AI Journals",
        body: "Write, reflect, and keep it private.",
        hash: "#journals",
        icon: (
            <>
                <path d="M6 4.5h10.5a2 2 0 0 1 2 2V20H8a2 2 0 0 1-2-2z" />
                <path d="M9.5 9h6M9.5 12.5h4.5" />
            </>
        ),
    },
    {
        label: "Credits",
        body: "Top-ups that never expire.",
        hash: "#credits",
        icon: (
            <>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M14.5 9.3c-.5-.8-1.4-1.3-2.5-1.3-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.1 0-2-.5-2.5-1.3M12 6.5V8M12 16v1.5" />
            </>
        ),
    },
];

function ProductIcon({ children }: { children: ReactNode }) {
    return (
        <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    );
}

function Chevron({ open }: { open: boolean }) {
    return (
        <svg viewBox="0 0 24 24" className={"h-3.5 w-3.5 transition-transform duration-200 " + (open ? "rotate-180" : "")} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
        </svg>
    );
}

/** One product row - an in-page link on the landing page, "/#…" elsewhere. */
function ProductLink({
    p,
    onLanding,
    onPick,
    compact,
}: {
    p: (typeof PRODUCTS)[number];
    onLanding: boolean;
    onPick: () => void;
    compact?: boolean;
}) {
    const cls =
        "group flex items-start gap-3 rounded-[0.9rem] transition-colors hover:bg-ink/[0.04] focus-visible:bg-ink/[0.04] outline-none " +
        (compact ? "px-4 py-2.5" : "px-3 py-2.5");
    const inner = (
        <>
            <span className="h-9 w-9 shrink-0 rounded-full bg-lavender text-rust flex items-center justify-center transition-colors group-hover:bg-rust group-hover:text-cream-soft">
                <ProductIcon>{p.icon}</ProductIcon>
            </span>
            <span className="min-w-0 pt-0.5">
                <span className="block text-ink text-[0.93rem] leading-tight">{p.label}</span>
                <span className="block text-muted text-[0.8rem] leading-snug mt-0.5">{p.body}</span>
            </span>
        </>
    );
    return onLanding ? (
        <a href={p.hash} className={cls} onClick={onPick}>
            {inner}
        </a>
    ) : (
        <Link to={`/${p.hash}`} className={cls} onClick={onPick}>
            {inner}
        </Link>
    );
}

/* Opens on hover for a mouse and on click or Enter/Space for everyone else;
   closes on Escape (focus goes back to the button), on a click outside, when
   focus leaves it, and after a pick. A disclosure, not an ARIA menu: the
   panel is ordinary links, so Tab moves through them as usual. */
function ProductMenu({ onLanding }: { onLanding: boolean }) {
    const [open, setOpen] = useState(false);
    const wrap = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const closeTimer = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!wrap.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpen(false);
                button.current?.focus();
            }
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    useEffect(() => () => window.clearTimeout(closeTimer.current), []);

    const hoverOpen = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "mouse") return;
        window.clearTimeout(closeTimer.current);
        setOpen(true);
    };
    const hoverClose = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "mouse") return;
        closeTimer.current = window.setTimeout(() => setOpen(false), 140);
    };

    return (
        <div
            ref={wrap}
            className="relative"
            onPointerEnter={hoverOpen}
            onPointerLeave={hoverClose}
            onBlur={(e) => {
                if (!wrap.current?.contains(e.relatedTarget as Node)) setOpen(false);
            }}
        >
            <button
                ref={button}
                type="button"
                aria-expanded={open}
                aria-controls="product-menu"
                onClick={() => setOpen((v) => !v)}
                className={
                    "cursor-pointer rounded-full px-2.5 xl:px-3 py-1.5 text-[0.93rem] transition-colors inline-flex items-center gap-1 " +
                    (open ? "text-ink bg-ink/5" : "text-ink-soft hover:text-ink hover:bg-ink/5")
                }
            >
                Product
                <Chevron open={open} />
            </button>

            {open && (
                <div id="product-menu" className="absolute left-0 top-full pt-2.5 z-40 chat-pop">
                    <div className="lp-card rounded-[1.25rem] p-2 w-[min(34rem,calc(100vw-2rem))]">
                        <ul className="grid grid-cols-2 gap-0.5">
                            {PRODUCTS.map((p) => (
                                <li key={p.label}>
                                    <ProductLink p={p} onLanding={onLanding} onPick={() => setOpen(false)} />
                                </li>
                            ))}
                        </ul>
                        <div className="mt-1.5 rounded-[0.9rem] bg-lavender/60 px-3.5 py-2.5 flex items-center justify-between gap-3">
                            <span className="text-ink-soft text-[0.8rem]">Start on the free plan, upgrade any time.</span>
                            {onLanding ? (
                                <a href="#pricing" onClick={() => setOpen(false)} className="shrink-0 text-rust text-[0.82rem] font-medium hover:underline underline-offset-2">
                                    See plans →
                                </a>
                            ) : (
                                <Link to="/#pricing" onClick={() => setOpen(false)} className="shrink-0 text-rust text-[0.82rem] font-medium hover:underline underline-offset-2">
                                    See plans →
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function SiteHeader({ onLanding = false, current }: { onLanding?: boolean; current?: string }) {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [productOpen, setProductOpen] = useState(false);

    // The small-screen menu closes on Escape.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [menuOpen]);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        // Solid paper, like the reference - DESIGN.md rules out glass.
        <header
            className={
                "sticky top-0 z-30 w-full px-4 sm:px-6 lg:px-8 bg-[var(--app-grad-1)] border-b transition-colors duration-200 " +
                (scrolled ? "border-hairline" : "border-transparent")
            }
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            <nav className="mx-auto w-full max-w-[1180px] h-16 sm:h-[4.5rem] flex items-center gap-3">
                {onLanding ? (
                    <a href="#top" className="flex items-center gap-2 shrink-0 min-w-0" aria-label="Privateaile, back to top">
                        <Wordmark />
                    </a>
                ) : (
                    <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0" aria-label="Privateaile home">
                        <Wordmark />
                    </Link>
                )}
                <ul className="hidden lg:flex items-center gap-0.5 xl:gap-1 ml-6 xl:ml-10">
                    <li>
                        <ProductMenu onLanding={onLanding} />
                    </li>
                    {NAV.map((n) => {
                        const active = Boolean(n.to && n.to === current);
                        return (
                            <li key={n.label}>
                                <NavLink
                                    item={n}
                                    onLanding={onLanding}
                                    active={active}
                                    className={
                                        "rounded-full px-2.5 xl:px-3 py-1.5 text-[0.93rem] transition-colors " +
                                        (active ? "text-ink bg-ink/5" : "text-ink-soft hover:text-ink hover:bg-ink/5")
                                    }
                                />
                            </li>
                        );
                    })}
                </ul>
                <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
                    <button
                        type="button"
                        onClick={() => navigate("/signin")}
                        className="max-sm:hidden whitespace-nowrap cursor-pointer rounded-full px-1.5 min-[380px]:px-2.5 sm:px-3 py-2 text-[0.92rem] min-[380px]:text-[0.95rem] sm:text-[1rem] text-ink-soft hover:text-ink transition-colors"
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/signup")}
                        className="lp-btn group cursor-pointer rounded-full px-4 sm:px-5 py-2.5 text-[0.9rem] sm:text-[0.96rem] whitespace-nowrap active:scale-[0.98] inline-flex items-center gap-1.5"
                    >
                        Start Chatting
                        <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                    </button>
                    {/* Below lg the section links (and, on phones, sign in) live here. */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-expanded={menuOpen}
                        aria-controls="site-menu"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        className="lg:hidden cursor-pointer h-10 w-10 shrink-0 rounded-full border border-hairline bg-cream-light text-ink flex items-center justify-center"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4.5 8h15M4.5 12h15M4.5 16h10" />}
                        </svg>
                    </button>
                </div>
            </nav>

            {menuOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close menu"
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className="lg:hidden fixed inset-0 top-16 sm:top-[4.5rem] bg-ink/10 cursor-default"
                    />
                    <div id="site-menu" className="lg:hidden absolute left-0 right-0 top-full px-4 sm:px-6 chat-pop">
                        <ul className="lp-card mx-auto max-w-[1180px] rounded-[1.25rem] p-2 flex flex-col max-h-[calc(100dvh-5.5rem)] overflow-y-auto">
                            {/* Product opens in place. */}
                            <li>
                                <button
                                    type="button"
                                    aria-expanded={productOpen}
                                    aria-controls="site-menu-product"
                                    onClick={() => setProductOpen((v) => !v)}
                                    className={
                                        "cursor-pointer w-full flex items-center justify-between rounded-[0.9rem] px-4 py-2.5 text-[1rem] transition-colors " +
                                        (productOpen ? "bg-ink/5 text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink")
                                    }
                                >
                                    Product
                                    <Chevron open={productOpen} />
                                </button>
                                {productOpen && (
                                    <ul id="site-menu-product" className="flex flex-col py-1">
                                        {PRODUCTS.map((p) => (
                                            <li key={p.label}>
                                                <ProductLink
                                                    p={p}
                                                    onLanding={onLanding}
                                                    compact
                                                    onPick={() => {
                                                        setMenuOpen(false);
                                                        setProductOpen(false);
                                                    }}
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                            {[...NAV, ...MENU_EXTRA].map((n) => {
                                const active = Boolean(n.to && n.to === current);
                                return (
                                    <li
                                        key={n.label}
                                        onClick={() => setMenuOpen(false)}
                                        className={n === MENU_EXTRA[0] ? "border-t border-hairline mt-1 pt-1" : undefined}
                                    >
                                        <NavLink
                                            item={n}
                                            onLanding={onLanding}
                                            active={active}
                                            className={
                                                "block rounded-[0.9rem] px-4 py-2.5 text-[1rem] transition-colors " +
                                                (active ? "bg-lavender text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink")
                                            }
                                        />
                                    </li>
                                );
                            })}
                            <li className="sm:hidden border-t border-hairline mt-1 pt-1">
                                <Link
                                    to="/signin"
                                    onClick={() => setMenuOpen(false)}
                                    className="block rounded-[0.9rem] px-4 py-2.5 text-[1rem] text-ink-soft hover:bg-ink/5 hover:text-ink"
                                >
                                    Sign in
                                </Link>
                            </li>
                        </ul>
                    </div>
                </>
            )}
        </header>
    );
}

function Wordmark() {
    return (
        <>
            <BrandMark className="h-7 w-5 sm:h-8 sm:w-[1.4rem] shrink-0" />
            <span className="lp-serif text-ink text-[1.3rem] min-[380px]:text-[1.45rem] sm:text-[1.65rem] font-medium tracking-[-0.015em] leading-none">
                Private Aile
            </span>
        </>
    );
}

type FooterLink = { label: string; hash?: string; to?: string; href?: string; soon?: boolean };

const FOOT_LINK = "text-[0.82rem] text-ink-soft hover:text-ink transition-colors inline-block";

function FooterLinks({ links, onLanding }: { links: FooterLink[]; onLanding: boolean }) {
    return (
        <ul className="flex flex-col gap-2">
            {links.map((l) => (
                <li key={l.label}>
                    {l.soon ? (
                        // A page that doesn't exist yet: named, never linked.
                        <span className="text-[0.82rem] text-muted/80 inline-flex items-center gap-1.5">
                            {l.label}
                            <span className="rounded-full bg-lavender px-1.5 py-px text-[0.62rem] text-rust">soon</span>
                        </span>
                    ) : l.href ? (
                        <a href={l.href} className={FOOT_LINK}>
                            {l.label}
                        </a>
                    ) : (
                        <NavLink item={{ label: l.label, hash: l.hash, to: l.to }} onLanding={onLanding} className={FOOT_LINK} />
                    )}
                </li>
            ))}
        </ul>
    );
}

/* White, like the reference. Who runs Privateaile on the left (the same
   company details as /legal and /contact - change them together), then
   the Product and Legal links (no visible headings - the lists are named
   for screen readers instead); the copyright underneath. */
export function SiteFooter({ onLanding = false }: { onLanding?: boolean }) {
    return (
        <footer
            className="relative shrink-0 w-full px-4 sm:px-6 lg:px-8 bg-[#FDFDFE] border-t border-hairline"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="mx-auto w-full max-w-[1180px] pt-10 sm:pt-12 pb-8 grid grid-cols-2 sm:grid-cols-[1.6fr_1fr_1fr] gap-x-6 lg:gap-x-10 gap-y-9">
                <div className="col-span-2 sm:col-span-1">
                    <p className="flex items-center gap-2">
                        <BrandMark className="h-6 w-[1.05rem]" />
                        <span className="lp-serif text-ink font-medium text-[1.35rem] leading-none">Private Aile</span>
                    </p>
                    <address className="not-italic text-ink-soft text-[0.86rem] leading-[1.65] mt-3.5 max-w-[26rem]">
                        Operated by SHVANA AI and Robotics Private Limited
                        <br />
                        Innv8 Okhla Phase III, 211 Okhla Industrial Estate, New Delhi, South Delhi 110020, Delhi, India
                    </address>
                    <a
                        href="mailto:care@privateaile.com"
                        className="inline-block mt-3 text-[0.88rem] text-rust underline-offset-2 hover:underline"
                    >
                        care@privateaile.com
                    </a>
                </div>

                <nav aria-label="Product" className="sm:pt-1">
                    <FooterLinks
                        onLanding={onLanding}
                        links={[
                            { hash: "#features", label: "Features" },
                            { hash: "#pricing", label: "Plans" },
                            { hash: "#faq", label: "FAQ" },
                            // { to: "/about", label: "About" },
                            // Signed-out visitors land on sign-in; signed-in
                            // ones are sent straight on to the app.
                            { to: "/signin", label: "Open the app" },
                        ]}
                    />
                </nav>

                <nav aria-label="Legal" className="sm:pt-1">
                    <FooterLinks
                        onLanding={onLanding}
                        links={[
                            { to: "/legal#terms", label: "Terms of Service" },
                            { to: "/legal#privacy", label: "Privacy Policy" },
                            { to: "/legal#refunds", label: "Refund & Cancellation" },
                            { to: "/contact", label: "Contact" },
                        ]}
                    />
                </nav>

                <div className="col-span-2 sm:col-span-3 border-t border-hairline pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <p className="text-muted text-[0.78rem] leading-[1.6]">
                        © {new Date().getFullYear()} SHVANA AI and Robotics Private Limited. All rights reserved.
                    </p>
                    <p className="text-muted text-[0.78rem] leading-[1.6]">For adults, 18+.</p>
                </div>
            </div>
        </footer>
    );
}
