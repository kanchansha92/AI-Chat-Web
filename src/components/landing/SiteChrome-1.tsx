import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandMark } from "./LandingHero";

/* The signed-out site's header and footer, shared by the landing page,
   /about and /contact. Section links are plain hashes on the landing page ("#pricing") and
   become "/#pricing" everywhere else; the landing page scrolls to the hash
   once it has rendered. */

type NavItem = { label: string; hash?: string; to?: string };

const NAV: NavItem[] = [
    { hash: "#features", label: "Features" },
    { hash: "#characters", label: "Characters" },
    { hash: "#groups", label: "Groups" },
    { hash: "#images", label: "Images" },
    { hash: "#journals", label: "Journals" },
    { hash: "#pricing", label: "Pricing" },
    { hash: "#faq", label: "FAQ" },
];

/** Not in the top bar (the brief keeps it to the product), but in the menu. */
const MENU_EXTRA: NavItem[] = [
    // { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
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

export function SiteHeader({ onLanding = false, current }: { onLanding?: boolean; current?: string }) {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

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
                    <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0" aria-label="Private Aile home">
                        <Wordmark />
                    </Link>
                )}
                <ul className="hidden lg:flex items-center gap-0.5 xl:gap-1 ml-6 xl:ml-10">
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
                            {[...NAV, ...MENU_EXTRA].map((n, i) => {
                                const active = Boolean(n.to && n.to === current);
                                return (
                                    <li
                                        key={n.label}
                                        onClick={() => setMenuOpen(false)}
                                        className={i === NAV.length ? "border-t border-hairline mt-1 pt-1" : undefined}
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

function FootHead({ children }: { children: ReactNode }) {
    return <p className="text-ink text-[0.84rem] font-semibold mb-3">{children}</p>;
}

/* As the reference: white, brand + tagline on the left; Product in two
   short columns, then Company and Legal; the copyright on the right. */
export function SiteFooter({ onLanding = false }: { onLanding?: boolean }) {
    return (
        <footer
            className="relative shrink-0 w-full px-4 sm:px-6 lg:px-8 bg-[#FDFDFE]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="mx-auto w-full max-w-[1180px] pt-9 pb-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[1.5fr_1.5fr_0.9fr_1fr_1.4fr] gap-x-6 gap-y-8">
                <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                    <p className="flex items-center gap-2">
                        <BrandMark className="h-6 w-[1.05rem]" />
                        <span className="lp-serif text-ink font-medium text-[1.35rem] leading-none">Privateaile</span>
                    </p>
                    <p className="text-muted text-[0.82rem] mt-2">Your private AI companion.</p>
                </div>

                <div className="col-span-2 lg:col-span-1">
                    <FootHead>Product</FootHead>
                    <div className="grid grid-cols-2 gap-x-6">
                        <FooterLinks
                            onLanding={onLanding}
                            links={[
                                { hash: "#features", label: "General AI" },
                                { hash: "#characters", label: "Characters" },
                                { hash: "#groups", label: "Groups" },
                            ]}
                        />
                        <FooterLinks
                            onLanding={onLanding}
                            links={[
                                { hash: "#journals", label: "Journals" },
                                { hash: "#images", label: "Images" },
                                { hash: "#threads", label: "Threads" },
                            ]}
                        />
                    </div>
                </div>

                <div>
                    <FootHead>Company</FootHead>
                    <FooterLinks
                        onLanding={onLanding}
                        links={[
                            // { to: "/about", label: "About" },
                            { to: "/contact", label: "Contact" },
                            { hash: "#faq", label: "FAQ" },
                        ]}
                    />
                </div>

                <div>
                    <FootHead>Legal</FootHead>
                    <FooterLinks
                        onLanding={onLanding}
                        links={[
                            { to: "/privacy", label: "Privacy Policy" },
                            { label: "Terms", soon: true },
                            { label: "Cookie Policy", soon: true },
                        ]}
                    />
                </div>

                <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex lg:justify-end lg:items-end">
                    <p className="text-muted text-[0.74rem] leading-[1.6] lg:text-right">
                        © {new Date().getFullYear()} Privateaile. All rights reserved.
                        <br />
                        For adults, 18+.
                    </p>
                </div>
            </div>
        </footer>
    );
}
